// Aggregations for the admin reports page and the Excel export.

import { prisma } from "./prisma";
import { utcToZoned } from "./time";

export type ReportRange = { from: string; to: string }; // inclusive "YYYY-MM-DD"

export async function loadReport(venueId: string, timezone: string, range: ReportRange) {
  const reservations = await prisma.reservation.findMany({
    where: { venueId, date: { gte: range.from, lte: range.to } },
    include: { customer: { select: { id: true, firstName: true, lastName: true, phone: true, isVip: true } } },
    orderBy: { startAt: "asc" },
  });

  const total = reservations.length;
  const byStatus = count(reservations, (r) => r.status);
  const honoured = reservations.filter((r) => ["SEATED", "COMPLETED"].includes(r.status));
  const covers = honoured.reduce((n, r) => n + r.partySize, 0);
  const upcoming = reservations.filter((r) => ["PENDING", "CONFIRMED"].includes(r.status));
  const closed = total - upcoming.length;
  const noShowRate = closed ? (byStatus.NO_SHOW ?? 0) / closed : 0;
  const cancelRate = closed ? (byStatus.CANCELLED ?? 0) / closed : 0;
  const avgParty = total ? reservations.reduce((n, r) => n + r.partySize, 0) / total : 0;
  const online = reservations.filter((r) => ["WEBSITE", "INSTAGRAM", "GOOGLE"].includes(r.source)).length;

  const byDow = Array.from({ length: 7 }, () => 0);
  const byHour = new Map<string, number>();
  for (const r of reservations) {
    if (["CANCELLED"].includes(r.status)) continue;
    const z = utcToZoned(r.startAt, timezone);
    byDow[z.dow] += r.partySize;
    const h = z.hm.slice(0, 2) + ":00";
    byHour.set(h, (byHour.get(h) ?? 0) + r.partySize);
  }
  const bySource = count(reservations, (r) => r.source);

  const perCustomer = new Map<string, { name: string; phone: string; visits: number; covers: number; noShows: number; isVip: boolean }>();
  for (const r of reservations) {
    const c = r.customer;
    const cur = perCustomer.get(c.id) ?? { name: `${c.firstName} ${c.lastName ?? ""}`.trim(), phone: c.phone, visits: 0, covers: 0, noShows: 0, isVip: c.isVip };
    if (["SEATED", "COMPLETED"].includes(r.status)) { cur.visits++; cur.covers += r.partySize; }
    if (r.status === "NO_SHOW") cur.noShows++;
    perCustomer.set(c.id, cur);
  }
  const topCustomers = [...perCustomer.values()].filter((c) => c.visits > 0).sort((a, b) => b.visits - a.visits || b.covers - a.covers).slice(0, 10);

  return {
    total, covers, noShowRate, cancelRate, avgParty, onlineShare: total ? online / total : 0,
    byStatus, byDow, byHour: [...byHour.entries()].sort(), bySource, topCustomers, reservations,
  };
}

function count<T>(items: T[], key: (t: T) => string) {
  const out: Record<string, number> = {};
  for (const it of items) out[key(it)] = (out[key(it)] ?? 0) + 1;
  return out;
}
