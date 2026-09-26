"use client";

import { useActionState, useEffect, useRef, useState } from "react";
import { RESERVATION_SOURCE, SOURCE_LABEL } from "@/lib/constants";
import { minutesToHm, utcToZoned } from "@/lib/time";
import { createStaffReservation, type ActionState } from "./actions";

type Props = {
  venueId: string;
  date: string;
  timezone: string;
  tables: { id: string; name: string; areaId: string; maxSeats: number }[];
  areas: { id: string; name: string }[];
};

export function NewReservationDialog({ venueId, date, timezone, tables, areas }: Props) {
  const ref = useRef<HTMLDialogElement>(null);
  const [walkIn, setWalkIn] = useState(false);
  const [state, action, pending] = useActionState<ActionState, FormData>(createStaffReservation, {});
  const [picked, setPicked] = useState<string[]>([]);

  // Close the dialog once the action succeeds (ref only, no state updates here).
  useEffect(() => {
    if (state.ok) ref.current?.close();
  }, [state]);

  const open = (asWalkIn: boolean) => {
    setWalkIn(asWalkIn);
    setPicked([]);
    ref.current?.showModal();
  };

  const nowHm = utcToZoned(new Date(), timezone).hm;
  const roundedNow = minutesToHm(Math.floor((Number(nowHm.slice(0, 2)) * 60 + Number(nowHm.slice(3))) / 15) * 15);

  return (
    <>
      <button type="button" className="btn-ghost" onClick={() => open(true)}>Walk-in</button>
      <button type="button" className="btn-primary" onClick={() => open(false)}>+ Νέα κράτηση</button>

      <dialog ref={ref} className="m-auto w-[min(92vw,520px)] rounded-[22px] border border-line bg-surface p-0 text-ink shadow-[var(--shadow)] backdrop:bg-ink/40">
        <form action={action} className="flex flex-col gap-3 p-5">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-bold">{walkIn ? "Walk-in" : "Νέα κράτηση"}</h2>
            <button type="button" onClick={() => ref.current?.close()} className="grid h-8 w-8 place-items-center rounded-full bg-surface-2" aria-label="Κλείσιμο">✕</button>
          </div>
          <input type="hidden" name="venueId" value={venueId} />
          <input type="hidden" name="walkIn" value={walkIn ? "1" : "0"} />
          <input type="hidden" name="tableIds" value={picked.join(",")} />

          <div className="grid grid-cols-3 gap-2">
            <div>
              <label className="label" htmlFor="nr-date">Ημέρα</label>
              <input id="nr-date" name="date" type="date" defaultValue={date} className="input" required />
            </div>
            <div>
              <label className="label" htmlFor="nr-time">Ώρα</label>
              <input id="nr-time" name="time" type="time" step={900} defaultValue={walkIn ? roundedNow : "20:00"} className="input" required />
            </div>
            <div>
              <label className="label" htmlFor="nr-party">Άτομα</label>
              <input id="nr-party" name="partySize" type="number" min={1} max={100} defaultValue={2} className="input" required />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-2">
            <div><label className="label" htmlFor="nr-first">Όνομα</label><input id="nr-first" name="firstName" className="input" required /></div>
            <div><label className="label" htmlFor="nr-last">Επώνυμο</label><input id="nr-last" name="lastName" className="input" /></div>
          </div>
          <div className="grid grid-cols-2 gap-2">
            <div><label className="label" htmlFor="nr-phone">Τηλέφωνο</label><input id="nr-phone" name="phone" type="tel" className="input" required /></div>
            <div><label className="label" htmlFor="nr-email">Email</label><input id="nr-email" name="email" type="email" className="input" /></div>
          </div>
          {!walkIn && (
            <div>
              <label className="label" htmlFor="nr-source">Κανάλι</label>
              <select id="nr-source" name="source" className="input" defaultValue={RESERVATION_SOURCE.PHONE}>
                {Object.values(RESERVATION_SOURCE).filter((s) => s !== "WEBSITE" && s !== "WALK_IN").map((s) => (
                  <option key={s} value={s}>{SOURCE_LABEL[s]}</option>
                ))}
              </select>
            </div>
          )}
          <div>
            <span className="label">Τραπέζι <span className="font-medium text-ink-3">(κενό = αυτόματη επιλογή)</span></span>
            <div className="flex max-h-28 flex-wrap gap-1 overflow-y-auto">
              {areas.map((a) => (
                <div key={a.id} className="flex w-full flex-wrap gap-1">
                  <span className="w-full text-[10px] font-bold uppercase tracking-wider text-ink-3">{a.name}</span>
                  {tables.filter((t) => t.areaId === a.id).map((t) => {
                    const on = picked.includes(t.id);
                    return (
                      <button
                        key={t.id}
                        type="button"
                        aria-pressed={on}
                        onClick={() => setPicked((p) => (on ? p.filter((x) => x !== t.id) : [...p, t.id]))}
                        className={`rounded-lg border px-2 py-1 text-xs font-bold ${on ? "border-accent bg-accent text-accent-ink" : "border-line bg-surface"}`}
                      >
                        {t.name} <span className="font-medium opacity-70">{t.maxSeats}</span>
                      </button>
                    );
                  })}
                </div>
              ))}
            </div>
          </div>
          <div><label className="label" htmlFor="nr-notes">Σημείωση</label><input id="nr-notes" name="notes" className="input" /></div>
          {state.error && <p role="alert" className="rounded-[14px] bg-bad-soft px-3 py-2 text-sm font-semibold text-bad">{state.error}</p>}
          <button type="submit" disabled={pending} className="btn-primary w-full">{pending ? "Αποθήκευση…" : walkIn ? "Κάθισε τώρα" : "Καταχώριση"}</button>
        </form>
      </dialog>
    </>
  );
}
