// Reserve with Google (Actions Center, Booking Server API v3) adapter.
//
// Google calls our booking server over HTTPS with HTTP Basic auth using the
// credentials set in the Actions Center partner portal (GOOGLE_RESERVE_USER /
// GOOGLE_RESERVE_PASSWORD). merchant_id = venue slug, service_id = "dining".
// Times are unix seconds; party size arrives in slot.resources.party_size.
// Going live also needs the merchant/service/availability feeds
// (/api/google/feeds/*) and partner approval from Google.

import type { Prisma } from "@prisma/client";
import { computeSlots, loadDayContext, pickTables } from "./availability";
import { ACTIVE_STATUSES, RESERVATION_STATUS } from "./constants";
import { normalizePhone, reservationCode, secretToken } from "./ids";
import { sendReservationEmail } from "./notify";
import { prisma } from "./prisma";
import { utcToZoned } from "./time";

export const SERVICE_ID = "dining";

export type GSlot = {
  merchant_id: string;
  service_id: string;
  start_sec: number | string;
  duration_sec: number | string;
  availability_tag?: string;
  resources?: { party_size?: number | string };
};
export type GUser = { user_id?: string; given_name?: string; family_name?: string; telephone?: string; email?: string };

const STATUS_MAP: Record<string, string> = {
  PENDING: "PENDING_MERCHANT_CONFIRMATION",
  CONFIRMED: "CONFIRMED",
  SEATED: "CONFIRMED",
  COMPLETED: "CONFIRMED",
  CANCELLED: "CANCELED",
  NO_SHOW: "NO_SHOW",
};

export function checkBasicAuth(header: string | null): boolean {
  const user = process.env.GOOGLE_RESERVE_USER;
  const pass = process.env.GOOGLE_RESERVE_PASSWORD;
  if (!user || !pass) return process.env.NODE_ENV !== "production";
  if (!header?.startsWith("Basic ")) return false;
  const [u, p] = Buffer.from(header.slice(6), "base64").toString().split(":");
  return u === user && p === pass;
}

async function resolveSlot(slot: GSlot) {
  const venue = await prisma.venue.findUnique({ where: { slug: slot.merchant_id } });
  if (!venue) return null;
  const startAt = new Date(Number(slot.start_sec) * 1000);
  const partySize = Math.max(1, Number(slot.resources?.party_size ?? 2));
  const { ymd, hm } = utcToZoned(startAt, venue.timezone);
  // A slot may belong to the previous calendar day when it is past midnight.
  const ctx = await loadDayContext(venue.id, ymd);
  let found = computeSlots(ctx, ymd, partySize, { onlineOnly: true }).find((s) => s.hm === hm && s.startAt.getTime() === startAt.getTime());
  if (!found) {
    const prev = utcToZoned(new Date(startAt.getTime() - 86400_000), venue.timezone).ymd;
    const ctxPrev = await loadDayContext(venue.id, prev);
    found = computeSlots(ctxPrev, prev, partySize, { onlineOnly: true }).find((s) => s.startAt.getTime() === startAt.getTime());
    if (found) return { venue, ctx: ctxPrev, slot: found, partySize, ymd: prev };
  }
  return found ? { venue, ctx, slot: found, partySize, ymd } : { venue, ctx, slot: null, partySize, ymd };
}

export async function checkAvailability(slot: GSlot) {
  const r = await resolveSlot(slot);
  const available = Boolean(r?.slot?.available);
  return { slot, count_available: available ? 1 : 0 };
}

export async function batchAvailabilityLookup(merchantId: string, slots: GSlot[]) {
  const out = [];
  for (const s of slots) {
    const r = await resolveSlot({ ...s, merchant_id: merchantId });
    out.push({ slot_time: s, available: Boolean(r?.slot?.available) });
  }
  return { slot_time_availability: out };
}

export function toGoogleBooking(r: { id: string; venue: { slug: string }; startAt: Date; endAt: Date; partySize: number; status: string; customer: { firstName: string; lastName: string | null; phone: string; email: string | null } }) {
  return {
    booking_id: r.id,
    slot: {
      merchant_id: r.venue.slug,
      service_id: SERVICE_ID,
      start_sec: Math.floor(r.startAt.getTime() / 1000),
      duration_sec: Math.floor((r.endAt.getTime() - r.startAt.getTime()) / 1000),
      resources: { party_size: r.partySize },
    },
    user_information: { given_name: r.customer.firstName, family_name: r.customer.lastName ?? "", telephone: r.customer.phone, email: r.customer.email ?? "" },
    status: STATUS_MAP[r.status] ?? "CONFIRMED",
  };
}

export async function createBooking(input: { slot: GSlot; user_information: GUser; idempotency_token?: string; additional_request?: string }) {
  // Idempotency: the same token returns the same booking.
  if (input.idempotency_token) {
    const existing = await prisma.reservation.findFirst({ where: { internalNotes: { contains: `gidem:${input.idempotency_token}` } }, include: { venue: true, customer: true } });
    if (existing) return { booking: toGoogleBooking(existing) };
  }
  const r = await resolveSlot(input.slot);
  if (!r) return { booking_failure: { cause: "SLOT_UNAVAILABLE", description: "Unknown merchant" } };
  if (!r.slot || !r.slot.available) return { booking_failure: { cause: "SLOT_UNAVAILABLE", description: "Slot no longer available" } };
  const u = input.user_information ?? {};
  if (!u.telephone) return { booking_failure: { cause: "BOOKING_FAILURE_CAUSE_UNSPECIFIED", description: "Telephone required" } };

  const phone = normalizePhone(u.telephone);
  const venue = r.venue;
  try {
    const created = await prisma.$transaction(async (tx) => {
      const fresh = await tx.reservation.findMany({
        where: { venueId: venue.id, status: { in: ACTIVE_STATUSES }, startAt: { lt: r.slot!.endAt }, endAt: { gt: r.slot!.startAt } },
        include: { tables: { select: { tableId: true } } },
      });
      const tables = pickTables(r.ctx.tables, fresh, r.partySize, r.slot!.startAt, r.slot!.endAt);
      if (!tables.length) throw new Error("SLOT_UNAVAILABLE");
      const customer = await tx.customer.upsert({
        where: { venueId_phone: { venueId: venue.id, phone } },
        update: { firstName: u.given_name || undefined, lastName: u.family_name || undefined, email: u.email || undefined },
        create: { venueId: venue.id, firstName: u.given_name || "Google", lastName: u.family_name || null, phone, email: u.email || null },
      });
      const status = venue.autoConfirm ? RESERVATION_STATUS.CONFIRMED : RESERVATION_STATUS.PENDING;
      const data: Prisma.ReservationCreateInput = {
        venue: { connect: { id: venue.id } },
        customer: { connect: { id: customer.id } },
        code: reservationCode(),
        manageToken: secretToken(),
        date: r.ymd,
        startAt: r.slot!.startAt,
        endAt: r.slot!.endAt,
        partySize: r.partySize,
        status,
        source: "GOOGLE",
        guestNotes: input.additional_request || null,
        internalNotes: input.idempotency_token ? `gidem:${input.idempotency_token}` : null,
        confirmedAt: status === RESERVATION_STATUS.CONFIRMED ? new Date() : null,
        tables: { create: tables.map((t) => ({ table: { connect: { id: t.id } } })) },
      };
      return tx.reservation.create({ data, include: { venue: true, customer: true } });
    });
    sendReservationEmail(created).catch((e) => console.error("[mail]", e));
    return { booking: toGoogleBooking(created) };
  } catch (e) {
    return { booking_failure: { cause: "SLOT_UNAVAILABLE", description: e instanceof Error ? e.message : "Unavailable" } };
  }
}

export async function updateBooking(input: { booking: { booking_id: string; status?: string; slot?: GSlot } }) {
  const b = input.booking;
  const r = await prisma.reservation.findUnique({ where: { id: b.booking_id }, include: { venue: true, customer: true } });
  if (!r) return { booking_failure: { cause: "BOOKING_FAILURE_CAUSE_UNSPECIFIED", description: "Unknown booking" } };
  if (b.status === "CANCELED") {
    const updated = await prisma.reservation.update({ where: { id: r.id }, data: { status: RESERVATION_STATUS.CANCELLED, cancelledAt: new Date() }, include: { venue: true, customer: true } });
    return { booking: toGoogleBooking(updated) };
  }
  if (b.slot) {
    // Reschedule: cancel + recreate keeps table assignment correct.
    const res = await createBooking({ slot: { ...b.slot, merchant_id: r.venue.slug }, user_information: { given_name: r.customer.firstName, family_name: r.customer.lastName ?? "", telephone: r.customer.phone, email: r.customer.email ?? "" } });
    if ("booking_failure" in res) return res;
    await prisma.reservation.update({ where: { id: r.id }, data: { status: RESERVATION_STATUS.CANCELLED, cancelledAt: new Date(), internalNotes: "Μεταφέρθηκε μέσω Google" } });
    return res;
  }
  return { booking: toGoogleBooking(r) };
}

export async function getBookingStatus(bookingId: string) {
  const r = await prisma.reservation.findUnique({ where: { id: bookingId } });
  if (!r) return null;
  return { booking_id: r.id, booking_status: STATUS_MAP[r.status] ?? "CONFIRMED" };
}

export async function listBookings(userId: string) {
  // We don't store Google user ids; match on the phone/email Google sends as user_id if it looks like one.
  const phone = /^\+?\d{8,}$/.test(userId) ? normalizePhone(userId) : null;
  const rows = phone
    ? await prisma.reservation.findMany({ where: { customer: { phone }, source: "GOOGLE" }, include: { venue: true, customer: true }, take: 50 })
    : [];
  return { bookings: rows.map(toGoogleBooking) };
}
