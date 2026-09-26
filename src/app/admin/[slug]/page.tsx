import Link from "next/link";
import { StatusPill } from "@/components/status-pill";
import { SOURCE_LABEL, type ReservationSource, type ReservationStatus } from "@/lib/constants";
import { prisma } from "@/lib/prisma";
import { addDaysYmd, formatYmdLong, todayYmd, utcToZoned } from "@/lib/time";
import { myVenue } from "@/lib/venue-access";
import { setReservationStatus, staffCancel, updateInternalNotes } from "./actions";
import { NewReservationDialog } from "./new-reservation";

export const dynamic = "force-dynamic";

const NEXT: Record<string, { status: ReservationStatus; label: string; tone: string }[]> = {
  PENDING: [
    { status: "CONFIRMED", label: "Επιβεβαίωση", tone: "btn-primary" },
    { status: "CANCELLED", label: "Απόρριψη", tone: "btn-danger" },
  ],
  CONFIRMED: [
    { status: "SEATED", label: "Κάθισε", tone: "btn-primary" },
    { status: "NO_SHOW", label: "No-show", tone: "btn-danger" },
  ],
  SEATED: [{ status: "COMPLETED", label: "Ολοκλήρωση", tone: "btn-ghost" }],
  CANCELLED: [{ status: "CONFIRMED", label: "Επαναφορά", tone: "btn-ghost" }],
  NO_SHOW: [{ status: "CONFIRMED", label: "Επαναφορά", tone: "btn-ghost" }],
  COMPLETED: [],
};

export default async function TodayPage({ params, searchParams }: PageProps<"/admin/[slug]">) {
  const { slug } = await params;
  const sp = await searchParams;
  const { venue } = await myVenue(slug);
  const today = todayYmd(venue.timezone);
  const date = typeof sp.date === "string" && /^\d{4}-\d{2}-\d{2}$/.test(sp.date) ? sp.date : today;

  const [reservations, tables, areas, special, waiting] = await Promise.all([
    prisma.reservation.findMany({
      where: { venueId: venue.id, date },
      include: { customer: true, tables: { include: { table: true } }, area: true },
      orderBy: { startAt: "asc" },
    }),
    prisma.table.findMany({ where: { venueId: venue.id, isActive: true }, orderBy: { sortOrder: "asc" } }),
    prisma.area.findMany({ where: { venueId: venue.id }, orderBy: { sortOrder: "asc" } }),
    prisma.specialDay.findUnique({ where: { venueId_date: { venueId: venue.id, date } } }),
    prisma.waitlistEntry.count({ where: { venueId: venue.id, status: { in: ["WAITING", "NOTIFIED"] } } }),
  ]);

  const active = reservations.filter((r) => ["PENDING", "CONFIRMED", "SEATED", "COMPLETED"].includes(r.status));
  const covers = active.reduce((n, r) => n + r.partySize, 0);
  const seats = tables.reduce((n, t) => n + t.maxSeats, 0);
  const pending = reservations.filter((r) => r.status === "PENDING").length;
  const noShows = reservations.filter((r) => r.status === "NO_SHOW").length;

  return (
    <div className="flex flex-col gap-5">
      <header className="flex flex-wrap items-center gap-3">
        <div className="flex items-center gap-1 rounded-full bg-surface-2 p-1">
          <Link href={`?date=${addDaysYmd(date, -1)}`} className="grid h-8 w-8 place-items-center rounded-full hover:bg-surface" aria-label="Προηγούμενη μέρα">‹</Link>
          <Link href={date === today ? "?" : `?date=${today}`} className="px-2 text-xs font-bold">{date === today ? "Σήμερα" : "Πήγαινε σήμερα"}</Link>
          <Link href={`?date=${addDaysYmd(date, 1)}`} className="grid h-8 w-8 place-items-center rounded-full hover:bg-surface" aria-label="Επόμενη μέρα">›</Link>
        </div>
        <h1 className="text-xl font-bold sm:text-2xl">{formatYmdLong(date)}</h1>
        {special?.isClosed && <span className="pill bg-bad-soft text-bad">Κλειστά{special.note ? ` · ${special.note}` : ""}</span>}
        <div className="ml-auto flex gap-2">
          <NewReservationDialog venueId={venue.id} date={date} timezone={venue.timezone} tables={tables.map((t) => ({ id: t.id, name: t.name, areaId: t.areaId, maxSeats: t.maxSeats }))} areas={areas.map((a) => ({ id: a.id, name: a.name }))} />
        </div>
      </header>

      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        <Kpi label="Κρατήσεις" value={active.length} sub={pending ? `${pending} σε αναμονή` : "όλες επιβεβαιωμένες"} subTone={pending ? "text-warn" : "text-ok"} />
        <Kpi label="Άτομα" value={covers} sub={seats ? `πληρότητα ${Math.min(999, Math.round((covers / seats) * 100))}% ανά βάρδια` : ""} />
        <Kpi label="Αναμονή τώρα" value={waiting} sub={waiting ? "στη λίστα αναμονής" : "κανείς"} subTone={waiting ? "text-warn" : "text-ok"} />
        <Kpi label="No-show" value={noShows} sub={noShows ? "σήμερα" : "κανένα"} subTone={noShows ? "text-bad" : "text-ok"} />
      </div>

      {reservations.length === 0 ? (
        <div className="card p-10 text-center text-ink-3">Καμία κράτηση για αυτή τη μέρα.</div>
      ) : (
        <ul className="flex flex-col gap-2">
          {reservations.map((r) => {
            const { hm } = utcToZoned(r.startAt, venue.timezone);
            const tags = [
              r.customer.isVip ? "★ VIP" : null,
              r.customer.allergies ? `⚠ ${r.customer.allergies}` : null,
              r.occasion ? occasionLabel(r.occasion) : null,
              r.customer.visits === 0 ? "νέος πελάτης" : r.customer.visits >= 5 ? `${r.customer.visits} επισκέψεις` : null,
            ].filter(Boolean) as string[];
            const tableNames = r.tables.map((t) => t.table.name).join("+");
            return (
              <li key={r.id} className="card grid grid-cols-[56px_1fr] gap-3 p-3 sm:grid-cols-[64px_1fr_auto] sm:items-center sm:p-4">
                <div className="font-display text-lg font-bold num">{hm}</div>
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
                    <Link href={`/admin/${slug}/customers/${r.customerId}`} className="font-bold hover:text-accent">
                      {r.customer.firstName} {r.customer.lastName ?? ""}
                    </Link>
                    <span className="num text-ink-2">· {r.partySize} άτ.</span>
                    <StatusPill status={r.status} />
                  </div>
                  <p className="text-xs text-ink-3">
                    {tableNames ? <b className="text-ink-2">{tableNames}</b> : <b className="text-bad">χωρίς τραπέζι</b>}
                    {r.area ? ` · ${r.area.name}` : ""} · {SOURCE_LABEL[r.source as ReservationSource] ?? r.source} · <span className="num">{r.customer.phone}</span> · {r.code}
                  </p>
                  {tags.length > 0 && (
                    <div className="mt-1 flex flex-wrap gap-1">
                      {tags.map((t) => (
                        <span key={t} className="rounded-full bg-surface-2 px-2 py-0.5 text-[11px] font-bold text-ink-2">{t}</span>
                      ))}
                    </div>
                  )}
                  {r.guestNotes && <p className="mt-1 text-xs text-ink-2">💬 {r.guestNotes}</p>}
                  <details className="mt-1 text-xs">
                    <summary className="cursor-pointer text-ink-3 hover:text-ink">{r.internalNotes ? `📝 ${r.internalNotes}` : "Σημείωση προσωπικού"}</summary>
                    <form action={updateInternalNotes} className="mt-1 flex gap-2">
                      <input type="hidden" name="id" value={r.id} />
                      <input name="internalNotes" defaultValue={r.internalNotes ?? ""} className="input py-1.5 text-xs" placeholder="π.χ. τούρτα στις 21:00" />
                      <button className="btn-ghost px-3 py-1.5 text-xs">OK</button>
                    </form>
                  </details>
                </div>
                <div className="col-span-2 flex flex-wrap gap-1.5 sm:col-span-1 sm:justify-end">
                  {NEXT[r.status]?.map((n) => (
                    <form key={n.status} action={setReservationStatus}>
                      <input type="hidden" name="id" value={r.id} />
                      <input type="hidden" name="status" value={n.status} />
                      <button className={`${n.tone} px-3 py-1.5 text-xs`}>{n.label}</button>
                    </form>
                  ))}
                  {(r.status === "CONFIRMED" || r.status === "PENDING") && (
                    <form action={staffCancel}>
                      <input type="hidden" name="id" value={r.id} />
                      <button className="btn-ghost px-3 py-1.5 text-xs">Ακύρωση</button>
                    </form>
                  )}
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}

function Kpi({ label, value, sub, subTone = "text-ink-3" }: { label: string; value: number | string; sub?: string; subTone?: string }) {
  return (
    <div className="rounded-[18px] bg-surface-2 p-4">
      <p className="text-xs font-semibold text-ink-3">{label}</p>
      <p className="font-display text-2xl font-bold num">{value}</p>
      {sub && <p className={`text-xs font-bold ${subTone}`}>{sub}</p>}
    </div>
  );
}

function occasionLabel(v: string) {
  return ({ birthday: "🎂 γενέθλια", anniversary: "💍 επέτειος", business: "💼 business", date: "❤ ραντεβού", celebration: "🎉 γιορτή" } as Record<string, string>)[v] ?? v;
}
