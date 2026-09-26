import { NextResponse, type NextRequest } from "next/server";
import { computeSlots, loadDayContext } from "@/lib/availability";
import { prisma } from "@/lib/prisma";

// GET /api/venues/:slug/availability?date=YYYY-MM-DD&party=4&area=<id>
export async function GET(
  request: NextRequest,
  ctx: RouteContext<"/api/venues/[slug]/availability">,
) {
  const { slug } = await ctx.params;
  const sp = request.nextUrl.searchParams;
  const date = sp.get("date") ?? "";
  const party = Number(sp.get("party") ?? "2");
  const area = sp.get("area") || null;

  if (!/^\d{4}-\d{2}-\d{2}$/.test(date) || !Number.isInteger(party) || party < 1) {
    return NextResponse.json({ error: "bad request" }, { status: 400 });
  }
  const venue = await prisma.venue.findUnique({ where: { slug }, select: { id: true } });
  if (!venue) return NextResponse.json({ error: "not found" }, { status: 404 });

  const dayCtx = await loadDayContext(venue.id, date);
  const slots = computeSlots(dayCtx, date, party, { onlineOnly: true, areaId: area });
  return NextResponse.json(
    {
      date,
      closed: Boolean(dayCtx.special?.isClosed),
      slots: slots.map((s) => ({
        hm: s.hm,
        shift: s.shiftName,
        available: s.available,
        reason: s.reason ?? null,
      })),
    },
    { headers: { "Cache-Control": "no-store" } },
  );
}
