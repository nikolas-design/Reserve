import { prisma } from "@/lib/prisma";
import { todayYmd, utcToZoned } from "@/lib/time";
import { myVenue } from "@/lib/venue-access";
import { FloorPlan } from "./floor-plan";

export const dynamic = "force-dynamic";
export const metadata = { title: "Κάτοψη" };

export default async function FloorPage({ params, searchParams }: PageProps<"/admin/[slug]/floor">) {
  const { slug } = await params;
  const sp = await searchParams;
  const { venue, role } = await myVenue(slug);
  const today = todayYmd(venue.timezone);
  const date = typeof sp.date === "string" && /^\d{4}-\d{2}-\d{2}$/.test(sp.date) ? sp.date : today;

  const [areas, reservations] = await Promise.all([
    prisma.area.findMany({
      where: { venueId: venue.id },
      orderBy: { sortOrder: "asc" },
      include: { tables: { where: { isActive: true }, orderBy: { sortOrder: "asc" } } },
    }),
    prisma.reservation.findMany({
      where: { venueId: venue.id, date, status: { in: ["PENDING", "CONFIRMED", "SEATED"] } },
      include: { customer: true, tables: true },
      orderBy: { startAt: "asc" },
    }),
  ]);

  return (
    <FloorPlan
      venueId={venue.id}
      slug={slug}
      date={date}
      today={today}
      nowHm={date === today ? utcToZoned(new Date(), venue.timezone).hm : "20:00"}
      canEdit={role !== "HOST"}
      areas={areas.map((a) => ({
        id: a.id,
        name: a.name,
        tables: a.tables.map((t) => ({ id: t.id, name: t.name, minSeats: t.minSeats, maxSeats: t.maxSeats, shape: t.shape, x: t.x, y: t.y, w: t.w, h: t.h })),
      }))}
      reservations={reservations.map((r) => ({
        id: r.id,
        name: `${r.customer.firstName} ${r.customer.lastName ?? ""}`.trim(),
        partySize: r.partySize,
        status: r.status,
        start: utcToZoned(r.startAt, venue.timezone).hm,
        startMs: r.startAt.getTime(),
        endMs: r.endAt.getTime(),
        tableIds: r.tables.map((t) => t.tableId),
      }))}
      dayStartMs={new Date(`${date}T00:00:00Z`).getTime()}
      timezone={venue.timezone}
    />
  );
}
