import Link from "next/link";
import { SOURCE_LABEL, STATUS_LABEL, type ReservationSource, type ReservationStatus } from "@/lib/constants";
import { loadReport } from "@/lib/reports";
import { addDaysYmd, todayYmd } from "@/lib/time";
import { myVenue } from "@/lib/venue-access";

export const dynamic = "force-dynamic";
export const metadata = { title: "Αναφορές" };

const DOW = ["Κυρ", "Δευ", "Τρί", "Τετ", "Πέμ", "Παρ", "Σάβ"];
const isYmd = (s: unknown): s is string => typeof s === "string" && /^\d{4}-\d{2}-\d{2}$/.test(s);

export default async function ReportsPage({ params, searchParams }: PageProps<"/admin/[slug]/reports">) {
  const { slug } = await params;
  const sp = await searchParams;
  const { venue } = await myVenue(slug);
  const today = todayYmd(venue.timezone);
  const to = isYmd(sp.to) ? sp.to : today;
  const from = isYmd(sp.from) ? sp.from : addDaysYmd(to, -29);
  const r = await loadReport(venue.id, venue.timezone, { from, to });
  const qs = `from=${from}&to=${to}`;

  // Reorder day-of-week Monday-first for a Greek reader.
  const dow = [1, 2, 3, 4, 5, 6, 0].map((d) => ({ label: DOW[d], value: r.byDow[d] }));
  const hours = r.byHour.map(([h, v]) => ({ label: h, value: v }));
  const sources = Object.entries(r.bySource).sort((a, b) => b[1] - a[1]).map(([s, v]) => ({ label: SOURCE_LABEL[s as ReservationSource] ?? s, value: v }));
  const statuses = Object.entries(r.byStatus).sort((a, b) => b[1] - a[1]);

  return (
    <div className="flex flex-col gap-5">
      <header className="flex flex-wrap items-center gap-3">
        <h1 className="text-xl font-bold sm:text-2xl">Αναφορές</h1>
        <form className="ml-auto flex flex-wrap items-center gap-2">
          <input type="date" name="from" defaultValue={from} className="input w-auto py-2" aria-label="Από" />
          <span className="text-ink-3">–</span>
          <input type="date" name="to" defaultValue={to} className="input w-auto py-2" aria-label="Έως" />
          <button className="btn-ghost py-2">Εφαρμογή</button>
        </form>
      </header>
      <div className="flex flex-wrap gap-2 text-xs">
        {[["Τελευταίες 7 μέρες", addDaysYmd(today, -6), today], ["30 μέρες", addDaysYmd(today, -29), today], ["90 μέρες", addDaysYmd(today, -89), today], ["Επόμενες 14", today, addDaysYmd(today, 13)]].map(([l, f, t]) => (
          <Link key={l} href={`?from=${f}&to=${t}`} className={`rounded-full px-3 py-1 font-bold ${f === from && t === to ? "bg-ink text-surface" : "bg-surface-2 text-ink-2 hover:bg-line"}`}>{l}</Link>
        ))}
        <span className="ml-auto flex gap-2">
          <a href={`/admin/${slug}/reports/export?type=reservations&${qs}`} className="btn-ghost py-1.5 text-xs">⬇ Κρατήσεις Excel</a>
          <a href={`/admin/${slug}/reports/export?type=customers`} className="btn-ghost py-1.5 text-xs">⬇ Πελάτες Excel</a>
        </span>
      </div>

      <div className="grid grid-cols-2 gap-3 md:grid-cols-3 lg:grid-cols-6">
        <Kpi label="Κρατήσεις" value={r.total} />
        <Kpi label="Άτομα που ήρθαν" value={r.covers} />
        <Kpi label="Μέση παρέα" value={r.avgParty.toFixed(1)} />
        <Kpi label="No-show" value={pct(r.noShowRate)} tone={r.noShowRate > 0.1 ? "text-bad" : "text-ok"} />
        <Kpi label="Ακυρώσεις" value={pct(r.cancelRate)} tone={r.cancelRate > 0.2 ? "text-warn" : ""} />
        <Kpi label="Online" value={pct(r.onlineShare)} />
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <Bars title="Άτομα ανά ημέρα εβδομάδας" data={dow} />
        <Bars title="Άτομα ανά ώρα άφιξης" data={hours} />
        <Bars title="Κρατήσεις ανά κανάλι" data={sources} horizontal />
        <section className="card p-4">
          <h2 className="mb-3 text-sm font-bold">Κατάσταση κρατήσεων</h2>
          <ul className="flex flex-col gap-2">
            {statuses.length === 0 && <li className="text-sm text-ink-3">Καμία κράτηση στο διάστημα.</li>}
            {statuses.map(([s, n]) => (
              <li key={s} className="flex items-center gap-3 text-sm">
                <span className="w-32 text-ink-2">{STATUS_LABEL[s as ReservationStatus] ?? s}</span>
                <span className="h-2 flex-1 overflow-hidden rounded-full bg-surface-2"><span className="block h-full rounded-full bg-accent" style={{ width: `${(n / r.total) * 100}%` }} /></span>
                <span className="w-10 text-right font-bold num">{n}</span>
              </li>
            ))}
          </ul>
        </section>
      </div>

      <section className="card p-4">
        <h2 className="mb-3 text-sm font-bold">Συχνότεροι πελάτες στο διάστημα</h2>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="text-left text-xs text-ink-3"><tr><th className="py-1 pr-3 font-semibold">Πελάτης</th><th className="py-1 pr-3 font-semibold">Τηλέφωνο</th><th className="py-1 pr-3 text-right font-semibold">Επισκέψεις</th><th className="py-1 pr-3 text-right font-semibold">Άτομα</th><th className="py-1 text-right font-semibold">No-show</th></tr></thead>
            <tbody>
              {r.topCustomers.length === 0 && <tr><td colSpan={5} className="py-3 text-ink-3">Δεν υπάρχουν ολοκληρωμένες επισκέψεις.</td></tr>}
              {r.topCustomers.map((c) => (
                <tr key={c.phone} className="border-t border-line">
                  <td className="py-2 pr-3 font-bold">{c.name}{c.isVip && <span className="pill ml-2 bg-accent-soft text-accent">VIP</span>}</td>
                  <td className="py-2 pr-3 num text-ink-2">{c.phone}</td>
                  <td className="py-2 pr-3 text-right num">{c.visits}</td>
                  <td className="py-2 pr-3 text-right num">{c.covers}</td>
                  <td className={`py-2 text-right num ${c.noShows ? "text-bad" : "text-ink-3"}`}>{c.noShows}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}

function pct(x: number) { return `${Math.round(x * 100)}%`; }

function Kpi({ label, value, tone = "" }: { label: string; value: number | string; tone?: string }) {
  return (
    <div className="rounded-[18px] bg-surface-2 p-4">
      <p className="text-xs font-semibold text-ink-3">{label}</p>
      <p className={`font-display text-2xl font-bold num ${tone}`}>{value}</p>
    </div>
  );
}

/** Single-series bar chart, one hue, to scale, with hover titles and a table fallback. */
function Bars({ title, data, horizontal = false }: { title: string; data: { label: string; value: number }[]; horizontal?: boolean }) {
  const max = Math.max(1, ...data.map((d) => d.value));
  return (
    <section className="card p-4">
      <h2 className="mb-3 text-sm font-bold">{title}</h2>
      {data.every((d) => d.value === 0) ? (
        <p className="text-sm text-ink-3">Δεν υπάρχουν δεδομένα.</p>
      ) : horizontal ? (
        <ul className="flex flex-col gap-2">
          {data.map((d) => (
            <li key={d.label} className="flex items-center gap-3 text-sm" title={`${d.label}: ${d.value}`}>
              <span className="w-24 truncate text-ink-2">{d.label}</span>
              <span className="h-3 flex-1 overflow-hidden rounded-full bg-surface-2"><span className="block h-full rounded-full bg-accent" style={{ width: `${(d.value / max) * 100}%` }} /></span>
              <span className="w-10 text-right font-bold num">{d.value}</span>
            </li>
          ))}
        </ul>
      ) : (
        <div className="flex h-40 items-end gap-1.5 border-b border-line" role="img" aria-label={title}>
          {data.map((d) => (
            <div key={d.label} className="group flex h-full flex-1 flex-col items-center justify-end gap-1" title={`${d.label}: ${d.value}`}>
              <span className="text-[10px] font-bold num text-ink-2 opacity-0 group-hover:opacity-100">{d.value}</span>
              <span className="w-full rounded-t-[4px] bg-accent transition-opacity group-hover:opacity-80" style={{ height: `${(d.value / max) * 100}%`, minHeight: d.value ? 2 : 0 }} />
              <span className="text-[10px] text-ink-3">{d.label}</span>
            </div>
          ))}
        </div>
      )}
    </section>
  );
}
