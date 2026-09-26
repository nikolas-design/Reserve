import { type NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";

function icsDate(d: Date) {
  return d.toISOString().replace(/[-:]/g, "").replace(/\.\d{3}Z$/, "Z");
}

function esc(s: string) {
  return s.replace(/\\/g, "\\\\").replace(/;/g, "\\;").replace(/,/g, "\\,").replace(/\n/g, "\\n");
}

// GET /r/:code/calendar?t=<token> -> .ics file
export async function GET(request: NextRequest, ctx: RouteContext<"/r/[code]/calendar">) {
  const { code } = await ctx.params;
  const t = request.nextUrl.searchParams.get("t") ?? "";
  const r = await prisma.reservation.findUnique({ where: { code }, include: { venue: true } });
  if (!r || r.manageToken !== t) return new Response("Not found", { status: 404 });

  const location = [r.venue.name, r.venue.address, r.venue.city].filter(Boolean).join(", ");
  const lines = [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//Reserve//EL",
    "BEGIN:VEVENT",
    `UID:${r.code}@reserve`,
    `DTSTAMP:${icsDate(new Date())}`,
    `DTSTART:${icsDate(r.startAt)}`,
    `DTEND:${icsDate(r.endAt)}`,
    `SUMMARY:${esc(`Κράτηση · ${r.venue.name}`)}`,
    `LOCATION:${esc(location)}`,
    `DESCRIPTION:${esc(`${r.partySize} άτομα · Κωδικός ${r.code}`)}`,
    "END:VEVENT",
    "END:VCALENDAR",
  ];
  return new Response(lines.join("\r\n"), {
    headers: {
      "Content-Type": "text/calendar; charset=utf-8",
      "Content-Disposition": `attachment; filename="${r.code}.ics"`,
    },
  });
}
