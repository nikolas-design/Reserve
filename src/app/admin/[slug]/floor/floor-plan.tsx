"use client";

import Link from "next/link";
import { useMemo, useState, useTransition } from "react";
import { hmToMinutes, minutesToHm, zonedToUtc } from "@/lib/time";
import { saveTablePositions } from "../actions";

type TableDto = { id: string; name: string; minSeats: number; maxSeats: number; shape: string; x: number; y: number; w: number; h: number };
type AreaDto = { id: string; name: string; tables: TableDto[] };
type ResDto = { id: string; name: string; partySize: number; status: string; start: string; startMs: number; endMs: number; tableIds: string[] };

const CELL = 34;
const COLS = 16;
const ROWS = 7;

export function FloorPlan(props: {
  venueId: string; slug: string; date: string; today: string; nowHm: string; canEdit: boolean;
  areas: AreaDto[]; reservations: ResDto[]; dayStartMs: number; timezone: string;
}) {
  const { areas, reservations, date, timezone } = props;
  const [hm, setHm] = useState(props.nowHm);
  const [editing, setEditing] = useState(false);
  const [layout, setLayout] = useState<Record<string, { x: number; y: number }>>({});
  const [pending, startTransition] = useTransition();

  // "Now" on the plan, as an instant, so we can intersect with reservations.
  const atMs = useMemo(() => zonedToUtc(date, hm, timezone).getTime(), [date, hm, timezone]);

  const byTable = useMemo(() => {
    const m = new Map<string, ResDto>();
    for (const r of reservations) {
      if (r.startMs <= atMs && atMs < r.endMs) for (const t of r.tableIds) m.set(t, r);
    }
    return m;
  }, [reservations, atMs]);

  const upcoming = useMemo(() => {
    const m = new Map<string, ResDto>();
    for (const r of reservations) {
      if (r.startMs > atMs && r.startMs - atMs <= 90 * 60000) for (const t of r.tableIds) if (!m.has(t)) m.set(t, r);
    }
    return m;
  }, [reservations, atMs]);

  const move = (id: string, dx: number, dy: number, t: TableDto) => {
    setLayout((l) => {
      const cur = l[id] ?? { x: t.x, y: t.y };
      return { ...l, [id]: { x: Math.max(0, Math.min(COLS - t.w, cur.x + dx)), y: Math.max(0, Math.min(ROWS - t.h, cur.y + dy)) } };
    });
  };

  const save = () => {
    const fd = new FormData();
    fd.set("venueId", props.venueId);
    const payload = areas.flatMap((a) => a.tables.filter((t) => layout[t.id]).map((t) => ({ id: t.id, x: layout[t.id].x, y: layout[t.id].y, w: t.w, h: t.h })));
    fd.set("payload", JSON.stringify(payload));
    startTransition(async () => { await saveTablePositions(fd); setEditing(false); setLayout({}); });
  };

  const seated = reservations.filter((r) => r.status === "SEATED").length;

  return (
    <div className="flex flex-col gap-5">
      <header className="flex flex-wrap items-center gap-3">
        <h1 className="text-xl font-bold sm:text-2xl">Κάτοψη</h1>
        <Link href={`/admin/${props.slug}?date=${date}`} className="text-sm text-ink-3 hover:text-accent">{date === props.today ? "Σήμερα" : date} ↗</Link>
        <div className="ml-auto flex items-center gap-2">
          {props.canEdit && !editing && <button className="btn-ghost py-2 text-xs" onClick={() => setEditing(true)}>Επεξεργασία διάταξης</button>}
          {editing && (
            <>
              <button className="btn-ghost py-2 text-xs" onClick={() => { setEditing(false); setLayout({}); }}>Άκυρο</button>
              <button className="btn-primary py-2 text-xs" disabled={pending || !Object.keys(layout).length} onClick={save}>{pending ? "Αποθήκευση…" : "Αποθήκευση"}</button>
            </>
          )}
        </div>
      </header>

      <div className="card flex flex-wrap items-center gap-4 p-4">
        <label htmlFor="fp-time" className="text-sm font-bold">Ώρα <span className="num text-accent">{hm}</span></label>
        <input
          id="fp-time"
          type="range"
          min={12 * 60}
          max={26 * 60}
          step={15}
          value={hmToMinutes(hm) < 12 * 60 ? hmToMinutes(hm) + 1440 : hmToMinutes(hm)}
          onChange={(e) => setHm(minutesToHm(Number(e.target.value)))}
          className="min-w-[200px] flex-1 accent-accent"
        />
        <button type="button" className="btn-ghost py-1.5 text-xs" onClick={() => setHm(props.nowHm)}>Τώρα</button>
        <span className="text-xs text-ink-3"><b className="num text-ink">{seated}</b> τραπέζια κάθονται</span>
      </div>

      {areas.map((a) => (
        <section key={a.id} className="card overflow-x-auto p-4">
          <h2 className="mb-3 text-xs font-bold uppercase tracking-wider text-ink-3">{a.name}</h2>
          <div className="relative rounded-[14px] bg-surface-2" style={{ width: COLS * CELL, height: ROWS * CELL, backgroundImage: editing ? "radial-gradient(var(--line) 1px, transparent 1px)" : undefined, backgroundSize: `${CELL}px ${CELL}px` }}>
            {a.tables.map((t) => {
              const pos = layout[t.id] ?? { x: t.x, y: t.y };
              const cur = byTable.get(t.id);
              const next = upcoming.get(t.id);
              const tone = cur
                ? cur.status === "SEATED" ? "bg-ok text-white" : "bg-accent text-accent-ink"
                : next ? "border-2 border-accent bg-surface text-ink" : "border border-line bg-surface text-ink-2";
              return (
                <div
                  key={t.id}
                  title={cur ? `${cur.name} · ${cur.partySize} άτ. · από ${cur.start}` : next ? `Επόμενη: ${next.name} στις ${next.start}` : `${t.name} · ${t.minSeats}-${t.maxSeats} άτ.`}
                  className={`absolute flex flex-col items-center justify-center text-[11px] font-bold leading-tight transition-all ${t.shape === "ROUND" ? "rounded-full" : "rounded-xl"} ${tone}`}
                  style={{ left: pos.x * CELL + 3, top: pos.y * CELL + 3, width: t.w * CELL - 6, height: t.h * CELL - 6 }}
                >
                  <span>{t.name}</span>
                  <span className="max-w-full truncate px-1 font-medium opacity-80 num">{cur ? `${cur.partySize} · ${cur.name.split(" ")[0]}` : next ? `→ ${next.start}` : t.maxSeats}</span>
                  {editing && (
                    <div className="absolute -bottom-2 -right-2 flex gap-0.5">
                      {([["←", -1, 0], ["→", 1, 0], ["↑", 0, -1], ["↓", 0, 1]] as const).map(([l, dx, dy]) => (
                        <button key={l} type="button" onClick={() => move(t.id, dx, dy, t)} className="grid h-5 w-5 place-items-center rounded-full bg-ink text-[10px] text-surface" aria-label={`Μετακίνηση ${t.name} ${l}`}>{l}</button>
                      ))}
                    </div>
                  )}
                </div>
              );
            })}
            {a.tables.length === 0 && <p className="p-4 text-sm text-ink-3">Δεν υπάρχουν τραπέζια. Πρόσθεσε από τις Ρυθμίσεις.</p>}
          </div>
        </section>
      ))}

      <div className="flex flex-wrap gap-4 text-xs text-ink-2">
        <span><i className="mr-1 inline-block h-3 w-3 rounded bg-ok align-[-2px]" />Κάθεται</span>
        <span><i className="mr-1 inline-block h-3 w-3 rounded bg-accent align-[-2px]" />Κράτηση σε εξέλιξη</span>
        <span><i className="mr-1 inline-block h-3 w-3 rounded border-2 border-accent align-[-2px]" />Επόμενη εντός 90′</span>
        <span><i className="mr-1 inline-block h-3 w-3 rounded border border-line bg-surface align-[-2px]" />Ελεύθερο</span>
      </div>
    </div>
  );
}
