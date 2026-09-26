// Availability engine: which time slots can take a party of N on a given day,
// and which table(s) to assign. Used by the guest booking page and the admin.

import type { Reservation, Shift, Table, Venue } from "@prisma/client";
import { ACTIVE_STATUSES } from "./constants";
import { prisma } from "./prisma";
import {
  addDaysYmd,
  dowOfYmd,
  hmToMinutes,
  minutesToHm,
  todayYmd,
  utcToZoned,
  zonedToUtc,
} from "./time";

export type Slot = {
  hm: string; // "20:30"
  startAt: Date;
  endAt: Date;
  shiftId: string;
  shiftName: string;
  available: boolean;
  reason?: "full" | "past" | "pacing";
};

type ReservationWithTables = Reservation & { tables: { tableId: string }[] };

function shiftRunsOn(shift: Shift, ymd: string): boolean {
  if (!shift.isActive) return false;
  const days = shift.daysOfWeek.split(",").map((d) => Number(d.trim()));
  return days.includes(dowOfYmd(ymd));
}

/** Bookable "HH:MM" grid for one shift. */
export function shiftSlotTimes(shift: Shift, venue: Venue): string[] {
  const start = hmToMinutes(shift.startTime);
  let end = hmToMinutes(shift.endTime);
  if (end <= start) end += 1440; // past midnight
  const last = end - shift.lastSeatingOffset;
  const out: string[] = [];
  for (let t = start; t <= last; t += venue.slotMinutes) out.push(minutesToHm(t));
  return out;
}

function overlaps(aStart: Date, aEnd: Date, bStart: Date, bEnd: Date): boolean {
  return aStart < bEnd && bStart < aEnd;
}

/**
 * Pick tables for a party at [startAt, endAt). Prefers a single table with the
 * smallest waste; falls back to joining two adjacent tables in the same area.
 * Returns [] when nothing fits.
 */
export function pickTables(
  tables: Table[],
  reservations: ReservationWithTables[],
  partySize: number,
  startAt: Date,
  endAt: Date,
  opts: { areaId?: string | null; excludeReservationId?: string } = {},
): Table[] {
  const busy = new Set<string>();
  for (const r of reservations) {
    if (r.id === opts.excludeReservationId) continue;
    if (!ACTIVE_STATUSES.includes(r.status as (typeof ACTIVE_STATUSES)[number]))
      continue;
    if (!overlaps(startAt, endAt, r.startAt, r.endAt)) continue;
    for (const t of r.tables) busy.add(t.tableId);
  }

  const free = tables.filter(
    (t) =>
      t.isActive &&
      !busy.has(t.id) &&
      (!opts.areaId || t.areaId === opts.areaId),
  );

  // 1) single table: fits and wastes the fewest seats
  const singles = free
    .filter((t) => t.minSeats <= partySize && partySize <= t.maxSeats)
    .sort((a, b) => a.maxSeats - b.maxSeats || a.sortOrder - b.sortOrder);
  if (singles.length) return [singles[0]];

  // 2) join two tables in the same area
  let best: Table[] = [];
  let bestWaste = Infinity;
  for (let i = 0; i < free.length; i++) {
    for (let j = i + 1; j < free.length; j++) {
      const a = free[i];
      const b = free[j];
      if (a.areaId !== b.areaId) continue;
      const cap = a.maxSeats + b.maxSeats;
      if (cap < partySize) continue;
      const waste = cap - partySize;
      if (waste < bestWaste) {
        bestWaste = waste;
        best = [a, b];
      }
    }
  }
  return best;
}

/** Load everything needed to compute a day's availability. */
export async function loadDayContext(venueId: string, ymd: string) {
  const venue = await prisma.venue.findUniqueOrThrow({ where: { id: venueId } });
  // Reservations can spill past midnight, so include the neighbouring days.
  const [tables, shifts, reservations, special] = await Promise.all([
    prisma.table.findMany({ where: { venueId, isActive: true } }),
    prisma.shift.findMany({ where: { venueId, isActive: true } }),
    prisma.reservation.findMany({
      where: {
        venueId,
        date: { in: [addDaysYmd(ymd, -1), ymd, addDaysYmd(ymd, 1)] },
        status: { in: ACTIVE_STATUSES },
      },
      include: { tables: { select: { tableId: true } } },
    }),
    prisma.specialDay.findUnique({
      where: { venueId_date: { venueId, date: ymd } },
    }),
  ]);
  return { venue, tables, shifts, reservations, special };
}

export type DayContext = Awaited<ReturnType<typeof loadDayContext>>;

/** All slots of a day for a party size, flagged available or not. */
export function computeSlots(
  ctx: DayContext,
  ymd: string,
  partySize: number,
  opts: { onlineOnly?: boolean; areaId?: string | null; now?: Date } = {},
): Slot[] {
  const { venue, tables, shifts, reservations, special } = ctx;
  if (special?.isClosed) return [];
  const now = opts.now ?? new Date();
  const earliest = new Date(now.getTime() + venue.minLeadMinutes * 60000);

  const out: Slot[] = [];
  for (const shift of shifts) {
    if (!shiftRunsOn(shift, ymd)) continue;
    if (opts.onlineOnly && !shift.isOnlineBookable) continue;
    const duration = shift.durationMin ?? venue.defaultDurationMin;
    for (const hm of shiftSlotTimes(shift, venue)) {
      // Times past midnight belong to the next calendar day.
      const mins = hmToMinutes(hm);
      const startAt =
        mins >= hmToMinutes(shift.startTime)
          ? zonedToUtc(ymd, hm, venue.timezone)
          : zonedToUtc(addDaysYmd(ymd, 1), hm, venue.timezone);
      const endAt = new Date(startAt.getTime() + duration * 60000);

      let available = true;
      let reason: Slot["reason"];
      if (opts.onlineOnly && startAt < earliest) {
        available = false;
        reason = "past";
      } else if (shift.maxCoversPerSlot) {
        const covers = reservations
          .filter((r) => r.startAt.getTime() === startAt.getTime())
          .reduce((n, r) => n + r.partySize, 0);
        if (covers + partySize > shift.maxCoversPerSlot) {
          available = false;
          reason = "pacing";
        }
      }
      if (available) {
        const picked = pickTables(tables, reservations, partySize, startAt, endAt, {
          areaId: opts.areaId,
        });
        if (!picked.length) {
          available = false;
          reason = "full";
        }
      }
      out.push({ hm, startAt, endAt, shiftId: shift.id, shiftName: shift.name, available, reason });
    }
  }
  return out.sort((a, b) => a.startAt.getTime() - b.startAt.getTime());
}

/** Next `count` bookable days (skips closed days and days with no shift). */
export function upcomingDays(venue: Venue, shifts: Shift[], count = 14, now = new Date()) {
  const days: string[] = [];
  let ymd = todayYmd(venue.timezone, now);
  for (let i = 0; i < venue.maxAdvanceDays && days.length < count; i++) {
    if (shifts.some((s) => shiftRunsOn(s, ymd) && s.isOnlineBookable)) days.push(ymd);
    ymd = addDaysYmd(ymd, 1);
  }
  return days;
}

export function reservationLocalTime(r: { startAt: Date }, venue: Venue): string {
  return utcToZoned(r.startAt, venue.timezone).hm;
}
