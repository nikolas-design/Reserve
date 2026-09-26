"use client";

import { useActionState, useCallback, useEffect, useMemo, useRef, useState } from "react";
import { OCCASIONS } from "@/lib/constants";
import { dayChip, formatYmdShort } from "@/lib/time";
import { bookAction, type BookingState } from "./actions";

type SlotDto = { hm: string; shift: string; available: boolean; reason: string | null };

type Props = {
  venue: {
    slug: string;
    name: string;
    phone: string | null;
    minParty: number;
    maxParty: number;
    cancellationHours: number;
    termsText: string | null;
  };
  areas: { id: string; name: string }[];
  days: string[];
  initialDate: string | null;
  initialParty: number;
  initialSlots: SlotDto[];
  channel: string;
};

export function BookingWidget({ venue, areas, days, initialDate, initialParty, initialSlots, channel }: Props) {
  const [date, setDate] = useState<string | null>(initialDate);
  const [party, setParty] = useState(initialParty);
  const [areaId, setAreaId] = useState("");
  const [time, setTime] = useState<string | null>(null);
  const [slots, setSlots] = useState<SlotDto[]>(initialSlots);
  const [loading, setLoading] = useState(false);
  const [state, formAction, pending] = useActionState<BookingState, FormData>(bookAction, {});

  // Refetch availability when day / party / area change. The first render uses SSR data.
  const abortRef = useRef<AbortController | null>(null);
  const refresh = useCallback(
    (next: { date: string | null; party: number; areaId: string }) => {
      if (!next.date) return;
      abortRef.current?.abort();
      const ctrl = new AbortController();
      abortRef.current = ctrl;
      setLoading(true);
      const qs = new URLSearchParams({ date: next.date, party: String(next.party) });
      if (next.areaId) qs.set("area", next.areaId);
      fetch(`/api/venues/${venue.slug}/availability?${qs}`, { signal: ctrl.signal })
        .then((r) => r.json())
        .then((d: { slots: SlotDto[] }) => {
          setSlots(d.slots);
          setTime((t) => (t && d.slots.some((s) => s.hm === t && s.available) ? t : null));
          setLoading(false);
        })
        .catch((e) => {
          if (e?.name !== "AbortError") setLoading(false);
        });
    },
    [venue.slug],
  );
  useEffect(() => () => abortRef.current?.abort(), []);

  const pickDate = (d: string) => { setDate(d); setTime(null); refresh({ date: d, party, areaId }); };
  const pickParty = (p: number) => { setParty(p); refresh({ date, party: p, areaId }); };
  const pickArea = (a: string) => { setAreaId(a); refresh({ date, party, areaId: a }); };

  const byShift = useMemo(() => {
    const m = new Map<string, SlotDto[]>();
    for (const s of slots) m.set(s.shift, [...(m.get(s.shift) ?? []), s]);
    return [...m.entries()];
  }, [slots]);

  const anyAvailable = slots.some((s) => s.available);
  const tooBig = party > venue.maxParty;
  const fe = state.fieldErrors ?? {};
  // React resets uncontrolled inputs after a server action; re-seed them from the last submit.
  const v = state.values ?? {};

  return (
    <form action={formAction} className="flex flex-col gap-5">
      <input type="hidden" name="venueSlug" value={venue.slug} />
      <input type="hidden" name="channel" value={channel} />
      <input type="hidden" name="date" value={date ?? ""} />
      <input type="hidden" name="time" value={time ?? ""} />
      <input type="hidden" name="partySize" value={party} />
      <input type="hidden" name="areaId" value={areaId} />

      {/* Day */}
      <fieldset>
        <legend className="label">Ημέρα</legend>
        <div className="no-scrollbar -mx-5 flex gap-2 overflow-x-auto px-5 pb-1">
          {days.map((d) => {
            const c = dayChip(d);
            const on = d === date;
            return (
              <button
                key={d}
                type="button"
                aria-pressed={on}
                onClick={() => pickDate(d)}
                className={`flex min-w-[58px] shrink-0 flex-col items-center rounded-2xl border px-3 py-2 transition-colors ${
                  on ? "border-ink bg-ink text-surface" : "border-line bg-surface text-ink hover:border-ink-3"
                }`}
              >
                <span className={`text-[10px] font-bold uppercase tracking-wider ${on ? "opacity-70" : "text-ink-3"}`}>{c.dow}</span>
                <span className="font-display text-base font-bold num">{c.day}</span>
              </button>
            );
          })}
        </div>
      </fieldset>

      {/* Party size */}
      <div>
        <span className="label">Άτομα</span>
        <div className="inline-flex items-center gap-3 rounded-full bg-surface-2 p-1.5">
          <button
            type="button"
            aria-label="Λιγότερα άτομα"
            disabled={party <= venue.minParty}
            onClick={() => pickParty(party - 1)}
            className="grid h-9 w-9 place-items-center rounded-full bg-surface text-lg font-bold disabled:opacity-40"
          >
            −
          </button>
          <span className="w-8 text-center font-display text-lg font-bold num" aria-live="polite">{party}</span>
          <button
            type="button"
            aria-label="Περισσότερα άτομα"
            disabled={party >= venue.maxParty + 1}
            onClick={() => pickParty(party + 1)}
            className="grid h-9 w-9 place-items-center rounded-full bg-surface text-lg font-bold disabled:opacity-40"
          >
            +
          </button>
        </div>
        {tooBig && (
          <p className="mt-2 rounded-[14px] bg-warn-soft px-3.5 py-2.5 text-sm text-ink-2">
            Για παρέες άνω των {venue.maxParty} ατόμων καλέστε μας
            {venue.phone ? <> στο <b className="num">{venue.phone}</b></> : null}.
          </p>
        )}
      </div>

      {/* Area (optional) */}
      {areas.length > 1 && (
        <div>
          <label htmlFor="area" className="label">Χώρος <span className="font-medium text-ink-3">(προαιρετικό)</span></label>
          <select
            id="area"
            value={areaId}
            onChange={(e) => pickArea(e.target.value)}
            className="input"
          >
            <option value="">Οπουδήποτε</option>
            {areas.map((a) => (
              <option key={a.id} value={a.id}>{a.name}</option>
            ))}
          </select>
        </div>
      )}

      {/* Time */}
      {!tooBig && (
        <div aria-busy={loading}>
          <span className="label">
            Ώρα{date ? ` · ${formatYmdShort(date)}` : ""}
            {loading && <span className="ml-2 font-medium text-ink-3">ενημέρωση…</span>}
          </span>
          {byShift.length === 0 && (
            <p className="rounded-[14px] bg-surface-2 px-3.5 py-3 text-sm text-ink-2">Δεν υπάρχουν διαθέσιμες ώρες αυτή τη μέρα.</p>
          )}
          <div className={`flex flex-col gap-3 transition-opacity ${loading ? "opacity-60" : ""}`}>
            {byShift.map(([shift, list]) => (
              <div key={shift}>
                {byShift.length > 1 && <p className="mb-1.5 text-xs font-semibold text-ink-3">{shift}</p>}
                <div className="grid grid-cols-4 gap-2">
                  {list.map((s) => {
                    const on = s.hm === time;
                    return (
                      <button
                        key={s.hm}
                        type="button"
                        disabled={!s.available}
                        aria-pressed={on}
                        title={!s.available ? (s.reason === "past" ? "Έχει περάσει" : "Γεμάτο") : undefined}
                        onClick={() => setTime(s.hm)}
                        className={`rounded-xl border py-2.5 text-sm font-bold num transition-colors ${
                          on
                            ? "border-accent bg-accent text-accent-ink"
                            : s.available
                              ? "border-line bg-surface hover:border-accent"
                              : "border-line bg-surface-2 text-ink-3 line-through"
                        }`}
                      >
                        {s.hm}
                      </button>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>
          {byShift.length > 0 && !anyAvailable && !loading && (
            <p className="mt-2 rounded-[14px] bg-warn-soft px-3.5 py-2.5 text-sm text-ink-2">
              Όλες οι ώρες είναι γεμάτες για {party} άτομα. Δοκιμάστε άλλη μέρα ή καλέστε μας.
            </p>
          )}
          {fe.time && <p className="mt-1 text-xs font-semibold text-bad">{fe.time}</p>}
        </div>
      )}

      {/* Guest details */}
      {time && !tooBig && (
        <div className="flex flex-col gap-3">
          <div className="grid grid-cols-2 gap-3">
            <Field id="firstName" label="Όνομα" error={fe.firstName} defaultValue={v.firstName} autoComplete="given-name" required />
            <Field id="lastName" label="Επώνυμο" error={fe.lastName} defaultValue={v.lastName} autoComplete="family-name" />
          </div>
          <Field id="phone" label="Κινητό" type="tel" error={fe.phone} defaultValue={v.phone} autoComplete="tel" inputMode="tel" required placeholder="69 00 000 000" />
          <Field id="email" label="Email" type="email" error={fe.email} defaultValue={v.email} autoComplete="email" inputMode="email" placeholder="Για την επιβεβαίωση" />
          <div>
            <label htmlFor="occasion" className="label">Περίσταση <span className="font-medium text-ink-3">(προαιρετικό)</span></label>
            <select id="occasion" name="occasion" className="input" defaultValue={v.occasion ?? ""}>
              <option value="">Καμία</option>
              {OCCASIONS.map((o) => (
                <option key={o.value} value={o.value}>{o.label}</option>
              ))}
            </select>
          </div>
          <div>
            <label htmlFor="notes" className="label">Σχόλια <span className="font-medium text-ink-3">(αλλεργίες, προτιμήσεις)</span></label>
            <textarea id="notes" name="notes" rows={2} className="input resize-none" maxLength={500} defaultValue={v.notes} />
          </div>

          <label className="flex items-start gap-2.5 text-xs text-ink-2">
            <input type="checkbox" name="terms" defaultChecked={v.terms === "on"} className="mt-0.5 h-4 w-4 accent-accent" />
            <span>
              Αποδέχομαι τους όρους κράτησης.
              {venue.termsText && <span className="block text-ink-3">{venue.termsText}</span>}
            </span>
          </label>
          {fe.terms && <p className="-mt-2 text-xs font-semibold text-bad">{fe.terms}</p>}

          {state.error && (
            <p role="alert" className="rounded-[14px] bg-bad-soft px-3.5 py-2.5 text-sm font-semibold text-bad">{state.error}</p>
          )}

          <button type="submit" disabled={pending} className="btn-primary w-full py-3.5">
            {pending ? "Γίνεται κράτηση…" : `Επιβεβαίωση κράτησης · ${date ? formatYmdShort(date) : ""}, ${time}`}
          </button>
          <p className="text-center text-[11px] text-ink-3">Θα λάβετε email επιβεβαίωσης. Δωρεάν ακύρωση έως {venue.cancellationHours} ώρες πριν.</p>
        </div>
      )}
    </form>
  );
}

function Field({
  id,
  label,
  error,
  ...rest
}: { id: string; label: string; error?: string } & React.InputHTMLAttributes<HTMLInputElement>) {
  return (
    <div>
      <label htmlFor={id} className="label">{label}</label>
      <input id={id} name={id} className={`input ${error ? "border-bad" : ""}`} aria-invalid={Boolean(error)} {...rest} />
      {error && <p className="mt-1 text-xs font-semibold text-bad">{error}</p>}
    </div>
  );
}
