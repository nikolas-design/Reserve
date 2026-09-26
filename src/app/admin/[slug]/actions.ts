"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { computeSlots, loadDayContext, pickTables } from "@/lib/availability";
import { signOut } from "@/lib/auth";
import { cancelReservation } from "@/lib/booking";
import { ACTIVE_STATUSES, RESERVATION_STATUS, type ReservationStatus } from "@/lib/constants";
import { normalizePhone, reservationCode, secretToken } from "@/lib/ids";
import { sendReminder, sendReservationEmail } from "@/lib/notify";
import { prisma } from "@/lib/prisma";
import { requireVenueAccess } from "@/lib/auth";
import { hmToMinutes, zonedToUtc } from "@/lib/time";

export type ActionState = { error?: string; ok?: boolean };

async function guard(venueId: string) {
  const access = await requireVenueAccess(venueId);
  if (!access) throw new Error("Unauthorized");
  return access;
}

export async function logoutAction() {
  await signOut({ redirectTo: "/login" });
}

// ---------- Reservation status ----------

const TRANSITIONS: Record<ReservationStatus, ReservationStatus[]> = {
  PENDING: ["CONFIRMED", "CANCELLED"],
  CONFIRMED: ["SEATED", "NO_SHOW", "CANCELLED"],
  SEATED: ["COMPLETED"],
  COMPLETED: [],
  CANCELLED: ["CONFIRMED"],
  NO_SHOW: ["CONFIRMED"],
};

export async function setReservationStatus(formData: FormData): Promise<void> {
  const id = String(formData.get("id"));
  const next = String(formData.get("status")) as ReservationStatus;
  const r = await prisma.reservation.findUniqueOrThrow({ where: { id }, include: { venue: true } });
  await guard(r.venueId);
  if (!TRANSITIONS[r.status as ReservationStatus]?.includes(next)) return;

  const now = new Date();
  await prisma.$transaction(async (tx) => {
    await tx.reservation.update({
      where: { id },
      data: {
        status: next,
        confirmedAt: next === "CONFIRMED" ? now : undefined,
        seatedAt: next === "SEATED" ? now : undefined,
        cancelledAt: next === "CANCELLED" ? now : undefined,
      },
    });
    if (next === "SEATED") {
      await tx.customer.update({
        where: { id: r.customerId },
        data: { visits: { increment: 1 }, lastVisitAt: now },
      });
    }
    if (next === "NO_SHOW") {
      await tx.customer.update({ where: { id: r.customerId }, data: { noShows: { increment: 1 } } });
    }
  });
  revalidatePath(`/admin/${r.venue.slug}`, "layout");
}

// ---------- Staff-created reservation / walk-in ----------

const staffBookingSchema = z.object({
  venueId: z.string(),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  time: z.string().regex(/^\d{2}:\d{2}$/),
  partySize: z.coerce.number().int().min(1).max(100),
  firstName: z.string().trim().min(1, "Όνομα;"),
  lastName: z.string().trim().optional().or(z.literal("")),
  phone: z.string().trim().min(6, "Τηλέφωνο;"),
  email: z.string().trim().email().optional().or(z.literal("")),
  source: z.string().default("PHONE"),
  tableIds: z.string().optional().or(z.literal("")), // comma list, optional manual pick
  notes: z.string().trim().max(500).optional().or(z.literal("")),
  walkIn: z.string().optional(),
});

export async function createStaffReservation(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const parsed = staffBookingSchema.safeParse(Object.fromEntries(formData.entries()));
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "Ελέγξτε τα στοιχεία." };
  const d = parsed.data;
  const { membership } = await guard(d.venueId);
  const venue = await prisma.venue.findUniqueOrThrow({ where: { id: membership.venueId } });

  const walkIn = d.walkIn === "1";
  const startAt = zonedToUtc(d.date, d.time, venue.timezone);
  const endAt = new Date(startAt.getTime() + venue.defaultDurationMin * 60000);
  const ctx = await loadDayContext(venue.id, d.date);

  let tables;
  if (d.tableIds) {
    const ids = d.tableIds.split(",").filter(Boolean);
    tables = ctx.tables.filter((t) => ids.includes(t.id));
    // manual pick: make sure they are free
    const free = pickTables(tables, ctx.reservations, 1, startAt, endAt);
    if (free.length !== tables.length && tables.length) {
      const busy = tables.filter((t) => !pickTables([t], ctx.reservations, 1, startAt, endAt).length);
      if (busy.length) return { error: `Το τραπέζι ${busy.map((t) => t.name).join(", ")} είναι κατειλημμένο.` };
    }
  } else {
    tables = pickTables(ctx.tables, ctx.reservations, d.partySize, startAt, endAt);
    if (!tables.length) {
      // Staff may overbook consciously: still create, but flag it.
      const slot = computeSlots(ctx, d.date, d.partySize).find((s) => s.hm === d.time);
      if (!slot) return { error: "Η ώρα είναι εκτός βάρδιας." };
    }
  }

  const phone = normalizePhone(d.phone);
  const customer = await prisma.customer.upsert({
    where: { venueId_phone: { venueId: venue.id, phone } },
    update: { firstName: d.firstName, lastName: d.lastName || undefined, email: d.email || undefined },
    create: { venueId: venue.id, firstName: d.firstName, lastName: d.lastName || null, phone, email: d.email || null },
  });

  const status = walkIn ? RESERVATION_STATUS.SEATED : RESERVATION_STATUS.CONFIRMED;
  const r = await prisma.reservation.create({
    data: {
      venueId: venue.id,
      customerId: customer.id,
      code: reservationCode(),
      manageToken: secretToken(),
      date: d.date,
      startAt,
      endAt,
      partySize: d.partySize,
      status,
      source: walkIn ? "WALK_IN" : d.source,
      internalNotes: d.notes || (tables.length ? null : "Χωρίς διαθέσιμο τραπέζι κατά την καταχώριση"),
      confirmedAt: new Date(),
      seatedAt: walkIn ? new Date() : null,
      tables: { create: tables.map((t) => ({ tableId: t.id })) },
    },
    include: { customer: true, venue: true },
  });
  if (walkIn) {
    await prisma.customer.update({ where: { id: customer.id }, data: { visits: { increment: 1 }, lastVisitAt: new Date() } });
  } else {
    sendReservationEmail(r).catch((e) => console.error("[mail]", e));
  }
  revalidatePath(`/admin/${venue.slug}`, "layout");
  return { ok: true };
}

export async function assignTables(formData: FormData): Promise<void> {
  const id = String(formData.get("id"));
  const ids = String(formData.get("tableIds") ?? "").split(",").filter(Boolean);
  const r = await prisma.reservation.findUniqueOrThrow({ where: { id }, include: { venue: true } });
  await guard(r.venueId);
  await prisma.$transaction([
    prisma.reservationTable.deleteMany({ where: { reservationId: id } }),
    prisma.reservationTable.createMany({ data: ids.map((tableId) => ({ reservationId: id, tableId })) }),
  ]);
  revalidatePath(`/admin/${r.venue.slug}`, "layout");
}

export async function updateInternalNotes(formData: FormData): Promise<void> {
  const id = String(formData.get("id"));
  const r = await prisma.reservation.findUniqueOrThrow({ where: { id }, include: { venue: true } });
  await guard(r.venueId);
  await prisma.reservation.update({ where: { id }, data: { internalNotes: String(formData.get("internalNotes") ?? "").trim() || null } });
  revalidatePath(`/admin/${r.venue.slug}`, "layout");
}

export async function staffCancel(formData: FormData): Promise<void> {
  const id = String(formData.get("id"));
  const r = await prisma.reservation.findUniqueOrThrow({ where: { id }, include: { venue: true } });
  await guard(r.venueId);
  if (ACTIVE_STATUSES.includes(r.status as (typeof ACTIVE_STATUSES)[number])) await cancelReservation(id, "staff");
  revalidatePath(`/admin/${r.venue.slug}`, "layout");
}

// ---------- Waitlist ----------

export async function addToWaitlist(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const venueId = String(formData.get("venueId"));
  const { membership } = await guard(venueId);
  const venue = await prisma.venue.findUniqueOrThrow({ where: { id: membership.venueId } });
  const firstName = String(formData.get("firstName") ?? "").trim();
  const phoneRaw = String(formData.get("phone") ?? "").trim();
  const partySize = Number(formData.get("partySize"));
  const quoted = Number(formData.get("quotedMinutes")) || null;
  if (!firstName || !phoneRaw || !partySize) return { error: "Όνομα, τηλέφωνο και άτομα." };
  const phone = normalizePhone(phoneRaw);
  const customer = await prisma.customer.upsert({
    where: { venueId_phone: { venueId: venue.id, phone } },
    update: { firstName },
    create: { venueId: venue.id, firstName, phone },
  });
  await prisma.waitlistEntry.create({
    data: { venueId: venue.id, customerId: customer.id, partySize, quotedMinutes: quoted },
  });
  revalidatePath(`/admin/${venue.slug}/waitlist`);
  return { ok: true };
}

export async function setWaitlistStatus(formData: FormData): Promise<void> {
  const id = String(formData.get("id"));
  const status = String(formData.get("status"));
  const w = await prisma.waitlistEntry.findUniqueOrThrow({ where: { id }, include: { venue: true } });
  await guard(w.venueId);
  const now = new Date();
  await prisma.waitlistEntry.update({
    where: { id },
    data: {
      status,
      notifiedAt: status === "NOTIFIED" ? now : undefined,
      seatedAt: status === "SEATED" ? now : undefined,
    },
  });
  if (status === "SEATED") {
    // Seating from the waitlist creates a walk-in reservation so the floor plan knows.
    const venue = w.venue;
    const endAt = new Date(now.getTime() + venue.defaultDurationMin * 60000);
    const ctx = await loadDayContext(venue.id, new Intl.DateTimeFormat("en-CA", { timeZone: venue.timezone }).format(now));
    const tables = pickTables(ctx.tables, ctx.reservations, w.partySize, now, endAt);
    await prisma.reservation.create({
      data: {
        venueId: venue.id,
        customerId: w.customerId,
        code: reservationCode(),
        manageToken: secretToken(),
        date: new Intl.DateTimeFormat("en-CA", { timeZone: venue.timezone }).format(now),
        startAt: now,
        endAt,
        partySize: w.partySize,
        status: "SEATED",
        source: "WALK_IN",
        confirmedAt: now,
        seatedAt: now,
        tables: { create: tables.map((t) => ({ tableId: t.id })) },
      },
    });
    await prisma.customer.update({ where: { id: w.customerId }, data: { visits: { increment: 1 }, lastVisitAt: now } });
  }
  revalidatePath(`/admin/${w.venue.slug}`, "layout");
}

// ---------- Customers ----------

export async function updateCustomer(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const id = String(formData.get("id"));
  const c = await prisma.customer.findUniqueOrThrow({ where: { id }, include: { venue: true } });
  await guard(c.venueId);
  const s = (k: string) => String(formData.get(k) ?? "").trim();
  await prisma.customer.update({
    where: { id },
    data: {
      firstName: s("firstName") || c.firstName,
      lastName: s("lastName") || null,
      email: s("email") || null,
      notes: s("notes") || null,
      allergies: s("allergies") || null,
      tags: s("tags") || null,
      birthday: s("birthday") || null,
      isVip: formData.get("isVip") === "on",
    },
  });
  revalidatePath(`/admin/${c.venue.slug}/customers`, "layout");
  return { ok: true };
}

// ---------- Settings ----------

const venueSchema = z.object({
  id: z.string(),
  name: z.string().trim().min(2),
  tagline: z.string().trim().max(120).optional().or(z.literal("")),
  description: z.string().trim().max(1000).optional().or(z.literal("")),
  phone: z.string().trim().optional().or(z.literal("")),
  email: z.string().trim().email().optional().or(z.literal("")),
  address: z.string().trim().optional().or(z.literal("")),
  city: z.string().trim().optional().or(z.literal("")),
  brandColor: z.string().regex(/^#[0-9a-fA-F]{6}$/),
  logoText: z.string().trim().max(3).optional().or(z.literal("")),
  slotMinutes: z.coerce.number().int().min(15).max(60),
  defaultDurationMin: z.coerce.number().int().min(30).max(360),
  minPartyOnline: z.coerce.number().int().min(1),
  maxPartyOnline: z.coerce.number().int().min(1).max(50),
  minLeadMinutes: z.coerce.number().int().min(0),
  maxAdvanceDays: z.coerce.number().int().min(1).max(365),
  autoConfirm: z.string().optional(),
  cancellationHours: z.coerce.number().int().min(0),
  lateGraceMinutes: z.coerce.number().int().min(0),
  termsText: z.string().trim().max(1000).optional().or(z.literal("")),
  reminderEnabled: z.string().optional(),
  reminderHoursBefore: z.coerce.number().int().min(1).max(168),
  reminderChannels: z.string().optional().or(z.literal("")),
  autoReleaseEnabled: z.string().optional(),
  autoReleaseHoursBefore: z.coerce.number().int().min(1).max(72),
  smsSenderName: z.string().trim().max(11).optional().or(z.literal("")),
});

export async function sendReminderNow(formData: FormData): Promise<void> {
  const id = String(formData.get("id"));
  const r = await prisma.reservation.findUniqueOrThrow({ where: { id }, include: { venue: true, customer: true } });
  await guard(r.venueId);
  await sendReminder(r);
  revalidatePath(`/admin/${r.venue.slug}`, "layout");
}

export async function updateVenue(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const rawVenue = Object.fromEntries(formData.entries());
  rawVenue.reminderChannels = formData.getAll("reminderChannels").join(",");
  const parsed = venueSchema.safeParse(rawVenue);
  if (!parsed.success) return { error: `Ελέγξτε το πεδίο «${String(parsed.error.issues[0]?.path[0])}».` };
  const d = parsed.data;
  const { membership } = await guard(d.id);
  if (membership.role === "HOST") return { error: "Μόνο ο ιδιοκτήτης ή manager αλλάζει ρυθμίσεις." };
  const venue = await prisma.venue.update({
    where: { id: d.id },
    data: {
      name: d.name,
      tagline: d.tagline || null,
      description: d.description || null,
      phone: d.phone || null,
      email: d.email || null,
      address: d.address || null,
      city: d.city || null,
      brandColor: d.brandColor,
      logoText: d.logoText || null,
      slotMinutes: d.slotMinutes,
      defaultDurationMin: d.defaultDurationMin,
      minPartyOnline: d.minPartyOnline,
      maxPartyOnline: d.maxPartyOnline,
      minLeadMinutes: d.minLeadMinutes,
      maxAdvanceDays: d.maxAdvanceDays,
      autoConfirm: d.autoConfirm === "on",
      cancellationHours: d.cancellationHours,
      lateGraceMinutes: d.lateGraceMinutes,
      termsText: d.termsText || null,
      reminderEnabled: d.reminderEnabled === "on",
      reminderHoursBefore: d.reminderHoursBefore,
      reminderChannels: d.reminderChannels || "email",
      autoReleaseEnabled: d.autoReleaseEnabled === "on",
      autoReleaseHoursBefore: d.autoReleaseHoursBefore,
      smsSenderName: d.smsSenderName || null,
    },
  });
  revalidatePath(`/admin/${venue.slug}`, "layout");
  revalidatePath(`/${venue.slug}`);
  return { ok: true };
}

const shiftSchema = z.object({
  id: z.string().optional().or(z.literal("")),
  venueId: z.string(),
  name: z.string().trim().min(1),
  days: z.string(), // "1,2,3"
  startTime: z.string().regex(/^\d{2}:\d{2}$/),
  endTime: z.string().regex(/^\d{2}:\d{2}$/),
  lastSeatingOffset: z.coerce.number().int().min(0),
  maxCoversPerSlot: z.coerce.number().int().min(0).optional(),
  isOnlineBookable: z.string().optional(),
});

export async function saveShift(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const raw = Object.fromEntries(formData.entries());
  raw.days = formData.getAll("days").join(",");
  const parsed = shiftSchema.safeParse(raw);
  if (!parsed.success) return { error: "Ελέγξτε τα στοιχεία της βάρδιας." };
  const d = parsed.data;
  await guard(d.venueId);
  if (!d.days) return { error: "Επιλέξτε τουλάχιστον μία μέρα." };
  if (hmToMinutes(d.endTime) === hmToMinutes(d.startTime)) return { error: "Η ώρα λήξης πρέπει να διαφέρει." };
  const data = {
    venueId: d.venueId,
    name: d.name,
    daysOfWeek: d.days,
    startTime: d.startTime,
    endTime: d.endTime,
    lastSeatingOffset: d.lastSeatingOffset,
    maxCoversPerSlot: d.maxCoversPerSlot || null,
    isOnlineBookable: d.isOnlineBookable === "on",
  };
  if (d.id) await prisma.shift.update({ where: { id: d.id }, data });
  else await prisma.shift.create({ data });
  const venue = await prisma.venue.findUniqueOrThrow({ where: { id: d.venueId } });
  revalidatePath(`/admin/${venue.slug}/settings`);
  revalidatePath(`/${venue.slug}`);
  return { ok: true };
}

export async function deleteShift(formData: FormData): Promise<void> {
  const id = String(formData.get("id"));
  const s = await prisma.shift.findUniqueOrThrow({ where: { id }, include: { venue: true } });
  await guard(s.venueId);
  await prisma.shift.delete({ where: { id } });
  revalidatePath(`/admin/${s.venue.slug}/settings`);
}

export async function saveArea(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const venueId = String(formData.get("venueId"));
  const id = String(formData.get("id") ?? "");
  const name = String(formData.get("name") ?? "").trim();
  const isOnlineBookable = formData.get("isOnlineBookable") === "on";
  if (!name) return { error: "Όνομα χώρου;" };
  await guard(venueId);
  if (id) await prisma.area.update({ where: { id }, data: { name, isOnlineBookable } });
  else {
    const count = await prisma.area.count({ where: { venueId } });
    await prisma.area.create({ data: { venueId, name, isOnlineBookable, sortOrder: count } });
  }
  const venue = await prisma.venue.findUniqueOrThrow({ where: { id: venueId } });
  revalidatePath(`/admin/${venue.slug}`, "layout");
  return { ok: true };
}

export async function deleteArea(formData: FormData): Promise<void> {
  const id = String(formData.get("id"));
  const a = await prisma.area.findUniqueOrThrow({ where: { id }, include: { venue: true } });
  await guard(a.venueId);
  await prisma.area.delete({ where: { id } });
  revalidatePath(`/admin/${a.venue.slug}`, "layout");
}

const tableSchema = z.object({
  id: z.string().optional().or(z.literal("")),
  venueId: z.string(),
  areaId: z.string(),
  name: z.string().trim().min(1).max(8),
  minSeats: z.coerce.number().int().min(1),
  maxSeats: z.coerce.number().int().min(1),
  shape: z.enum(["RECT", "ROUND"]),
});

export async function saveTable(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const parsed = tableSchema.safeParse(Object.fromEntries(formData.entries()));
  if (!parsed.success) return { error: "Ελέγξτε τα στοιχεία του τραπεζιού." };
  const d = parsed.data;
  if (d.minSeats > d.maxSeats) return { error: "Ελάχιστα > μέγιστα άτομα." };
  await guard(d.venueId);
  try {
    if (d.id) {
      await prisma.table.update({ where: { id: d.id }, data: { areaId: d.areaId, name: d.name, minSeats: d.minSeats, maxSeats: d.maxSeats, shape: d.shape } });
    } else {
      const count = await prisma.table.count({ where: { areaId: d.areaId } });
      await prisma.table.create({
        data: { venueId: d.venueId, areaId: d.areaId, name: d.name, minSeats: d.minSeats, maxSeats: d.maxSeats, shape: d.shape, x: (count % 4) * 4, y: Math.floor(count / 4) * 3, w: d.shape === "ROUND" ? 3 : 3, h: d.shape === "ROUND" ? 3 : 2, sortOrder: count },
      });
    }
  } catch {
    return { error: "Υπάρχει ήδη τραπέζι με αυτό το όνομα." };
  }
  const venue = await prisma.venue.findUniqueOrThrow({ where: { id: d.venueId } });
  revalidatePath(`/admin/${venue.slug}`, "layout");
  return { ok: true };
}

export async function deleteTable(formData: FormData): Promise<void> {
  const id = String(formData.get("id"));
  const t = await prisma.table.findUniqueOrThrow({ where: { id }, include: { venue: true } });
  await guard(t.venueId);
  await prisma.table.update({ where: { id }, data: { isActive: false } });
  revalidatePath(`/admin/${t.venue.slug}`, "layout");
}

/** Save table positions from the floor-plan editor. payload: [{id,x,y,w,h}] */
export async function saveTablePositions(formData: FormData): Promise<void> {
  const venueId = String(formData.get("venueId"));
  await guard(venueId);
  const items = z
    .array(z.object({ id: z.string(), x: z.number().int().min(0), y: z.number().int().min(0), w: z.number().int().min(1), h: z.number().int().min(1) }))
    .parse(JSON.parse(String(formData.get("payload") ?? "[]")));
  await prisma.$transaction(
    items.map((it) => prisma.table.update({ where: { id: it.id, venueId }, data: { x: it.x, y: it.y, w: it.w, h: it.h } })),
  );
  const venue = await prisma.venue.findUniqueOrThrow({ where: { id: venueId } });
  revalidatePath(`/admin/${venue.slug}/floor`);
}

export async function toggleSpecialDay(formData: FormData): Promise<void> {
  const venueId = String(formData.get("venueId"));
  const date = String(formData.get("date"));
  const note = String(formData.get("note") ?? "").trim() || null;
  await guard(venueId);
  const existing = await prisma.specialDay.findUnique({ where: { venueId_date: { venueId, date } } });
  if (existing && formData.get("remove") === "1") await prisma.specialDay.delete({ where: { id: existing.id } });
  else if (!existing) await prisma.specialDay.create({ data: { venueId, date, isClosed: true, note } });
  const venue = await prisma.venue.findUniqueOrThrow({ where: { id: venueId } });
  revalidatePath(`/admin/${venue.slug}`, "layout");
  revalidatePath(`/${venue.slug}`);
}

export async function gotoDay(formData: FormData): Promise<void> {
  redirect(`/admin/${String(formData.get("slug"))}?date=${String(formData.get("date"))}`);
}
