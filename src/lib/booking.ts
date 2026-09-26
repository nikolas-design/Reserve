// Creating / cancelling reservations. Shared by the guest page and the admin.

import type { Prisma } from "@prisma/client";
import { z } from "zod";
import { computeSlots, loadDayContext, pickTables } from "./availability";
import { ACTIVE_STATUSES, RESERVATION_STATUS } from "./constants";
import { normalizePhone, reservationCode, secretToken } from "./ids";
import { prisma } from "./prisma";

export const guestBookingSchema = z.object({
  venueSlug: z.string().min(1),
  channel: z.enum(["WEBSITE", "INSTAGRAM", "GOOGLE"]).catch("WEBSITE"),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Επιλέξτε ημέρα."),
  time: z.string().regex(/^\d{2}:\d{2}$/, "Επιλέξτε ώρα."),
  partySize: z.coerce.number().int().min(1).max(50),
  areaId: z.string().optional().or(z.literal("")),
  firstName: z.string().trim().min(2, "Γράψτε το όνομά σας.").max(60),
  lastName: z.string().trim().max(60).optional().or(z.literal("")),
  phone: z
    .string()
    .trim()
    .regex(/^[+\d][\d\s().-]{7,}$/, "Γράψτε ένα έγκυρο κινητό."),
  email: z.string().trim().email("Γράψτε ένα έγκυρο email.").optional().or(z.literal("")),
  occasion: z.string().max(40).optional().or(z.literal("")),
  notes: z.string().trim().max(500).optional().or(z.literal("")),
  terms: z.literal("on", { error: "Αποδεχτείτε τους όρους κράτησης." }),
});

export type GuestBookingInput = z.infer<typeof guestBookingSchema>;

export class BookingError extends Error {}

/**
 * Create a reservation for a guest. Re-checks availability right before
 * writing so two guests can't take the same table.
 */
export async function createGuestReservation(input: GuestBookingInput) {
  const venue = await prisma.venue.findUnique({ where: { slug: input.venueSlug } });
  if (!venue) throw new BookingError("Το κατάστημα δεν βρέθηκε.");

  if (input.partySize > venue.maxPartyOnline) {
    throw new BookingError(
      `Για παρέες άνω των ${venue.maxPartyOnline} ατόμων καλέστε μας${venue.phone ? ` στο ${venue.phone}` : ""}.`,
    );
  }
  if (input.partySize < venue.minPartyOnline) {
    throw new BookingError("Μη έγκυρος αριθμός ατόμων.");
  }

  const areaId = input.areaId || null;
  const ctx = await loadDayContext(venue.id, input.date);
  const slot = computeSlots(ctx, input.date, input.partySize, {
    onlineOnly: true,
    areaId,
  }).find((s) => s.hm === input.time);
  if (!slot) throw new BookingError("Η ώρα δεν είναι διαθέσιμη πλέον.");
  if (!slot.available) {
    throw new BookingError(
      slot.reason === "past"
        ? "Η ώρα αυτή έχει περάσει. Επιλέξτε άλλη."
        : "Η ώρα αυτή μόλις γέμισε. Επιλέξτε άλλη.",
    );
  }

  const phone = normalizePhone(input.phone);
  return prisma.$transaction(async (tx) => {
    // Re-read active reservations inside the transaction and pick again.
    const fresh = await tx.reservation.findMany({
      where: {
        venueId: venue.id,
        status: { in: ACTIVE_STATUSES },
        startAt: { lt: slot.endAt },
        endAt: { gt: slot.startAt },
      },
      include: { tables: { select: { tableId: true } } },
    });
    const tables = pickTables(ctx.tables, fresh, input.partySize, slot.startAt, slot.endAt, {
      areaId,
    });
    if (!tables.length) throw new BookingError("Η ώρα αυτή μόλις γέμισε. Επιλέξτε άλλη.");

    const customer = await tx.customer.upsert({
      where: { venueId_phone: { venueId: venue.id, phone } },
      update: {
        firstName: input.firstName,
        lastName: input.lastName || undefined,
        email: input.email || undefined,
      },
      create: {
        venueId: venue.id,
        firstName: input.firstName,
        lastName: input.lastName || null,
        phone,
        email: input.email || null,
      },
    });

    const status = venue.autoConfirm
      ? RESERVATION_STATUS.CONFIRMED
      : RESERVATION_STATUS.PENDING;

    const data: Prisma.ReservationCreateInput = {
      venue: { connect: { id: venue.id } },
      customer: { connect: { id: customer.id } },
      code: reservationCode(),
      manageToken: secretToken(),
      date: input.date,
      startAt: slot.startAt,
      endAt: slot.endAt,
      partySize: input.partySize,
      status,
      source: input.channel,
      occasion: input.occasion || null,
      guestNotes: input.notes || null,
      area: areaId ? { connect: { id: areaId } } : undefined,
      confirmedAt: status === RESERVATION_STATUS.CONFIRMED ? new Date() : null,
      tables: { create: tables.map((t) => ({ table: { connect: { id: t.id } } })) },
    };
    return tx.reservation.create({
      data,
      include: { customer: true, venue: true, tables: { include: { table: true } } },
    });
  });
}

/** Whether a guest may still cancel for free, per the venue's policy. */
export function canGuestCancel(
  r: { startAt: Date; status: string },
  venue: { cancellationHours: number },
  now = new Date(),
) {
  if (!ACTIVE_STATUSES.includes(r.status as (typeof ACTIVE_STATUSES)[number])) return false;
  return r.startAt.getTime() - now.getTime() > venue.cancellationHours * 3600_000;
}

export async function cancelReservation(id: string, by: "guest" | "staff") {
  return prisma.reservation.update({
    where: { id },
    data: {
      status: RESERVATION_STATUS.CANCELLED,
      cancelledAt: new Date(),
      internalNotes: by === "guest" ? "Ακυρώθηκε από τον πελάτη" : undefined,
    },
  });
}
