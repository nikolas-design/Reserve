import ExcelJS from "exceljs";
import { type NextRequest } from "next/server";
import { requireUser } from "@/lib/auth";
import { SOURCE_LABEL, STATUS_LABEL, type ReservationSource, type ReservationStatus } from "@/lib/constants";
import { prisma } from "@/lib/prisma";
import { utcToZoned } from "@/lib/time";

// GET /admin/:slug/reports/export?type=reservations|customers&from=&to=
export async function GET(request: NextRequest, ctx: RouteContext<"/admin/[slug]/reports/export">) {
  const { slug } = await ctx.params;
  const user = await requireUser();
  if (!user) return new Response("Unauthorized", { status: 401 });
  const membership = await prisma.venueMember.findFirst({ where: { userId: user.id, venue: { slug } }, include: { venue: true } });
  if (!membership) return new Response("Forbidden", { status: 403 });
  const venue = membership.venue;

  const sp = request.nextUrl.searchParams;
  const type = sp.get("type") === "customers" ? "customers" : "reservations";
  const wb = new ExcelJS.Workbook();
  wb.creator = "Reserve";

  if (type === "customers") {
    const rows = await prisma.customer.findMany({ where: { venueId: venue.id }, orderBy: [{ visits: "desc" }, { lastName: "asc" }] });
    const ws = wb.addWorksheet("Πελάτες");
    ws.columns = [
      { header: "Όνομα", key: "firstName", width: 16 }, { header: "Επώνυμο", key: "lastName", width: 20 },
      { header: "Τηλέφωνο", key: "phone", width: 16 }, { header: "Email", key: "email", width: 26 },
      { header: "Επισκέψεις", key: "visits", width: 11 }, { header: "No-show", key: "noShows", width: 9 },
      { header: "VIP", key: "isVip", width: 6 }, { header: "Αλλεργίες", key: "allergies", width: 22 },
      { header: "Ετικέτες", key: "tags", width: 22 }, { header: "Γενέθλια", key: "birthday", width: 10 },
      { header: "Τελευταία επίσκεψη", key: "lastVisitAt", width: 18 }, { header: "Σημειώσεις", key: "notes", width: 40 },
    ];
    for (const c of rows) ws.addRow({ ...c, isVip: c.isVip ? "Ναι" : "", lastVisitAt: c.lastVisitAt ? utcToZoned(c.lastVisitAt, venue.timezone).ymd : "" });
    ws.getRow(1).font = { bold: true };
  } else {
    const from = sp.get("from") ?? "0000-00-00";
    const to = sp.get("to") ?? "9999-99-99";
    const rows = await prisma.reservation.findMany({
      where: { venueId: venue.id, date: { gte: from, lte: to } },
      include: { customer: true, area: true, tables: { include: { table: true } } },
      orderBy: { startAt: "asc" },
    });
    const ws = wb.addWorksheet("Κρατήσεις");
    ws.columns = [
      { header: "Ημερομηνία", key: "date", width: 12 }, { header: "Ώρα", key: "time", width: 7 },
      { header: "Κωδικός", key: "code", width: 11 }, { header: "Πελάτης", key: "name", width: 24 },
      { header: "Τηλέφωνο", key: "phone", width: 16 }, { header: "Email", key: "email", width: 26 },
      { header: "Άτομα", key: "partySize", width: 7 }, { header: "Κατάσταση", key: "status", width: 14 },
      { header: "Κανάλι", key: "source", width: 11 }, { header: "Τραπέζια", key: "tables", width: 12 },
      { header: "Χώρος", key: "area", width: 12 }, { header: "Περίσταση", key: "occasion", width: 12 },
      { header: "Σχόλια πελάτη", key: "guestNotes", width: 30 }, { header: "Σημειώσεις", key: "internalNotes", width: 30 },
      { header: "Δημιουργήθηκε", key: "createdAt", width: 18 },
    ];
    for (const r of rows) {
      const z = utcToZoned(r.startAt, venue.timezone);
      ws.addRow({
        date: r.date, time: z.hm, code: r.code, name: `${r.customer.firstName} ${r.customer.lastName ?? ""}`.trim(),
        phone: r.customer.phone, email: r.customer.email ?? "", partySize: r.partySize,
        status: STATUS_LABEL[r.status as ReservationStatus] ?? r.status, source: SOURCE_LABEL[r.source as ReservationSource] ?? r.source,
        tables: r.tables.map((t) => t.table.name).join("+"), area: r.area?.name ?? "", occasion: r.occasion ?? "",
        guestNotes: r.guestNotes ?? "", internalNotes: r.internalNotes ?? "",
        createdAt: `${utcToZoned(r.createdAt, venue.timezone).ymd} ${utcToZoned(r.createdAt, venue.timezone).hm}`,
      });
    }
    ws.getRow(1).font = { bold: true };
    ws.autoFilter = { from: "A1", to: "O1" };
  }

  const buf = await wb.xlsx.writeBuffer();
  return new Response(buf as ArrayBuffer, {
    headers: {
      "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "Content-Disposition": `attachment; filename="${slug}-${type}.xlsx"`,
    },
  });
}
