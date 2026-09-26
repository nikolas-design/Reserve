import { prisma } from "@/lib/prisma";
import { myVenue } from "@/lib/venue-access";
import { deleteArea, deleteShift, deleteTable, toggleSpecialDay } from "../actions";
import { AreaForm, ShiftForm, TableForm, VenueForm } from "./forms";

export const dynamic = "force-dynamic";
export const metadata = { title: "Ρυθμίσεις" };

const DAY = ["Κυ", "Δε", "Τρ", "Τε", "Πε", "Πα", "Σα"];

export default async function SettingsPage({ params }: PageProps<"/admin/[slug]/settings">) {
  const { slug } = await params;
  const { venue, role } = await myVenue(slug);
  const [areas, shifts, special] = await Promise.all([
    prisma.area.findMany({ where: { venueId: venue.id }, orderBy: { sortOrder: "asc" }, include: { tables: { where: { isActive: true }, orderBy: { sortOrder: "asc" } } } }),
    prisma.shift.findMany({ where: { venueId: venue.id }, orderBy: { startTime: "asc" } }),
    prisma.specialDay.findMany({ where: { venueId: venue.id }, orderBy: { date: "asc" } }),
  ]);
  const canEdit = role !== "HOST";

  return (
    <div className="flex flex-col gap-6">
      <h1 className="text-xl font-bold sm:text-2xl">Ρυθμίσεις</h1>
      {!canEdit && <p className="rounded-[14px] bg-warn-soft px-4 py-3 text-sm">Έχεις ρόλο host: βλέπεις τις ρυθμίσεις αλλά δεν τις αλλάζεις.</p>}

      <VenueForm venue={venue} />

      <section className="card p-5">
        <h2 className="mb-1 font-bold">Βάρδιες</h2>
        <p className="mb-4 text-sm text-ink-3">Πότε δέχεστε κρατήσεις. Οι online ώρες παράγονται από εδώ.</p>
        <ul className="mb-4 flex flex-col gap-2">
          {shifts.map((s) => (
            <li key={s.id} className="flex flex-col gap-2 rounded-[14px] bg-surface-2 p-3">
              <div className="flex flex-wrap items-center gap-2 text-sm">
                <b>{s.name}</b>
                <span className="num">{s.startTime}–{s.endTime}</span>
                <span className="text-ink-3">{s.daysOfWeek.split(",").map((d) => DAY[Number(d)]).join(" ")}</span>
                {!s.isOnlineBookable && <span className="pill bg-warn-soft text-warn">μόνο τηλέφωνο</span>}
                {s.maxCoversPerSlot && <span className="text-xs text-ink-3">max {s.maxCoversPerSlot} άτ./slot</span>}
                {canEdit && (
                  <form action={deleteShift} className="ml-auto"><input type="hidden" name="id" value={s.id} /><button className="text-xs text-bad hover:underline">Διαγραφή</button></form>
                )}
              </div>
              {canEdit && <details><summary className="cursor-pointer text-xs text-ink-3">Επεξεργασία</summary><ShiftForm venueId={venue.id} shift={s} /></details>}
            </li>
          ))}
        </ul>
        {canEdit && <details className="rounded-[14px] border border-dashed border-line p-3"><summary className="cursor-pointer text-sm font-bold">+ Νέα βάρδια</summary><ShiftForm venueId={venue.id} /></details>}
      </section>

      <section className="card p-5">
        <h2 className="mb-1 font-bold">Χώροι & τραπέζια</h2>
        <p className="mb-4 text-sm text-ink-3">Η θέση στην κάτοψη ρυθμίζεται από τη σελίδα «Κάτοψη».</p>
        <div className="flex flex-col gap-4">
          {areas.map((a) => (
            <div key={a.id} className="rounded-[14px] bg-surface-2 p-3">
              <div className="mb-2 flex flex-wrap items-center gap-2">
                <b>{a.name}</b>
                {!a.isOnlineBookable && <span className="pill bg-warn-soft text-warn">όχι online</span>}
                <span className="text-xs text-ink-3">{a.tables.length} τραπέζια · {a.tables.reduce((n, t) => n + t.maxSeats, 0)} θέσεις</span>
                {canEdit && <form action={deleteArea} className="ml-auto"><input type="hidden" name="id" value={a.id} /><button className="text-xs text-bad hover:underline">Διαγραφή χώρου</button></form>}
              </div>
              <div className="flex flex-wrap gap-1.5">
                {a.tables.map((t) => (
                  <details key={t.id} className="rounded-lg border border-line bg-surface px-2 py-1 text-xs">
                    <summary className="cursor-pointer font-bold">{t.name} <span className="font-medium text-ink-3">{t.minSeats}-{t.maxSeats}</span></summary>
                    {canEdit && (
                      <div className="mt-2 w-64">
                        <TableForm venueId={venue.id} areas={areas.map((x) => ({ id: x.id, name: x.name }))} table={t} />
                        <form action={deleteTable} className="mt-1"><input type="hidden" name="id" value={t.id} /><button className="text-xs text-bad hover:underline">Αφαίρεση τραπεζιού</button></form>
                      </div>
                    )}
                  </details>
                ))}
                {canEdit && <details className="rounded-lg border border-dashed border-line px-2 py-1 text-xs"><summary className="cursor-pointer font-bold">+ τραπέζι</summary><div className="mt-2 w-64"><TableForm venueId={venue.id} areas={areas.map((x) => ({ id: x.id, name: x.name }))} defaultAreaId={a.id} /></div></details>}
              </div>
              {canEdit && <details className="mt-2"><summary className="cursor-pointer text-xs text-ink-3">Επεξεργασία χώρου</summary><AreaForm venueId={venue.id} area={a} /></details>}
            </div>
          ))}
          {canEdit && <details className="rounded-[14px] border border-dashed border-line p-3"><summary className="cursor-pointer text-sm font-bold">+ Νέος χώρος</summary><AreaForm venueId={venue.id} /></details>}
        </div>
      </section>

      <section className="card p-5">
        <h2 className="mb-1 font-bold">Κλειστές μέρες</h2>
        <p className="mb-4 text-sm text-ink-3">Αργίες, ιδιωτικές εκδηλώσεις. Δεν δέχονται online κρατήσεις.</p>
        <ul className="mb-3 flex flex-wrap gap-2">
          {special.map((d) => (
            <li key={d.id} className="flex items-center gap-2 rounded-full bg-bad-soft px-3 py-1 text-xs font-bold text-bad">
              <span className="num">{d.date}</span>{d.note ? ` · ${d.note}` : ""}
              {canEdit && <form action={toggleSpecialDay}><input type="hidden" name="venueId" value={venue.id} /><input type="hidden" name="date" value={d.date} /><input type="hidden" name="remove" value="1" /><button aria-label="Αφαίρεση" className="ml-1">✕</button></form>}
            </li>
          ))}
          {special.length === 0 && <li className="text-sm text-ink-3">Καμία.</li>}
        </ul>
        {canEdit && (
          <form action={toggleSpecialDay} className="flex flex-wrap gap-2">
            <input type="hidden" name="venueId" value={venue.id} />
            <input type="date" name="date" required className="input w-auto py-2" aria-label="Ημερομηνία" />
            <input name="note" placeholder="Σημείωση (προαιρετικό)" className="input w-56 py-2" />
            <button className="btn-ghost py-2">Προσθήκη</button>
          </form>
        )}
      </section>
    </div>
  );
}
