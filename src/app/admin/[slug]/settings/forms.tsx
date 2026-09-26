"use client";

import type { Area, Shift, Table, Venue } from "@prisma/client";
import { useActionState } from "react";
import { changePassword, saveArea, saveShift, saveTable, updateVenue, type ActionState } from "../actions";

function Msg({ state }: { state: ActionState }) {
  if (state.error) return <p className="text-sm font-semibold text-bad">{state.error}</p>;
  if (state.ok) return <p className="text-sm font-semibold text-ok">Αποθηκεύτηκε.</p>;
  return null;
}

function F({ id, label, hint, ...rest }: { id: string; label: string; hint?: string } & React.InputHTMLAttributes<HTMLInputElement>) {
  return (
    <div>
      <label htmlFor={id} className="label">{label}{hint && <span className="ml-1 font-medium text-ink-3">{hint}</span>}</label>
      <input id={id} name={id} className="input" {...rest} />
    </div>
  );
}

export function VenueForm({ venue: v }: { venue: Venue }) {
  const [state, action, pending] = useActionState<ActionState, FormData>(updateVenue, {});
  return (
    <form action={action} className="card flex flex-col gap-5 p-5">
      <input type="hidden" name="id" value={v.id} />
      <div>
        <h2 className="font-bold">Κατάστημα</h2>
        <p className="text-sm text-ink-3">Ό,τι βλέπει ο πελάτης στη σελίδα κράτησης.</p>
      </div>
      <div className="grid gap-3 sm:grid-cols-2">
        <F id="name" label="Όνομα" defaultValue={v.name} required />
        <F id="tagline" label="Υπότιτλος" defaultValue={v.tagline ?? ""} />
        <F id="phone" label="Τηλέφωνο" defaultValue={v.phone ?? ""} />
        <F id="email" label="Email" type="email" defaultValue={v.email ?? ""} />
        <F id="address" label="Διεύθυνση" defaultValue={v.address ?? ""} />
        <F id="city" label="Πόλη" defaultValue={v.city ?? ""} />
        <F id="brandColor" label="Χρώμα brand" type="color" defaultValue={v.brandColor} className="input h-12 p-1" />
        <F id="logoText" label="Αρχικά logo" hint="(έως 3)" defaultValue={v.logoText ?? ""} maxLength={3} />
      </div>
      <div>
        <label htmlFor="description" className="label">Περιγραφή</label>
        <textarea id="description" name="description" rows={2} defaultValue={v.description ?? ""} className="input resize-none" />
      </div>

      <div>
        <h2 className="font-bold">Κανόνες online κρατήσεων</h2>
      </div>
      <div className="grid gap-3 sm:grid-cols-3">
        <F id="slotMinutes" label="Βήμα ωρών" hint="λεπτά" type="number" min={15} max={60} step={15} defaultValue={v.slotMinutes} />
        <F id="defaultDurationMin" label="Διάρκεια τραπεζιού" hint="λεπτά" type="number" min={30} step={15} defaultValue={v.defaultDurationMin} />
        <F id="minLeadMinutes" label="Ελάχιστη προειδοποίηση" hint="λεπτά" type="number" min={0} defaultValue={v.minLeadMinutes} />
        <F id="minPartyOnline" label="Ελάχ. άτομα online" type="number" min={1} defaultValue={v.minPartyOnline} />
        <F id="maxPartyOnline" label="Μέγ. άτομα online" type="number" min={1} defaultValue={v.maxPartyOnline} />
        <F id="maxAdvanceDays" label="Έως πόσες μέρες μπροστά" type="number" min={1} defaultValue={v.maxAdvanceDays} />
      </div>
      <label className="flex items-center gap-2 text-sm font-semibold">
        <input type="checkbox" name="autoConfirm" defaultChecked={v.autoConfirm} className="h-4 w-4 accent-accent" />
        Αυτόματη επιβεβαίωση online κρατήσεων <span className="font-medium text-ink-3">(αλλιώς μένουν «σε αναμονή» μέχρι να τις εγκρίνετε)</span>
      </label>

      <div>
        <h2 className="font-bold">Ακυρώσεις</h2>
      </div>
      <div className="grid gap-3 sm:grid-cols-2">
        <F id="cancellationHours" label="Δωρεάν ακύρωση έως" hint="ώρες πριν" type="number" min={0} defaultValue={v.cancellationHours} />
        <F id="lateGraceMinutes" label="Ανοχή καθυστέρησης" hint="λεπτά" type="number" min={0} defaultValue={v.lateGraceMinutes} />
      </div>
      <div>
        <label htmlFor="termsText" className="label">Όροι κράτησης (εμφανίζονται στον πελάτη)</label>
        <textarea id="termsText" name="termsText" rows={3} defaultValue={v.termsText ?? ""} className="input resize-none" />
      </div>

      <div>
        <h2 className="font-bold">Υπενθυμίσεις & επιβεβαίωση</h2>
        <p className="text-sm text-ink-3">Ο πελάτης λαμβάνει υπενθύμιση με κουμπί «Ναι, θα έρθω». Αν δεν απαντήσει, μπορεί το τραπέζι να απελευθερωθεί αυτόματα.</p>
      </div>
      <label className="flex items-center gap-2 text-sm font-semibold">
        <input type="checkbox" name="reminderEnabled" defaultChecked={v.reminderEnabled} className="h-4 w-4 accent-accent" />
        Αποστολή υπενθύμισης
      </label>
      <div className="grid gap-3 sm:grid-cols-3">
        <F id="reminderHoursBefore" label="Πόσες ώρες πριν" type="number" min={1} max={168} defaultValue={v.reminderHoursBefore} />
        <div>
          <span className="label">Κανάλια</span>
          <div className="flex flex-wrap gap-1.5">
            {[["email", "Email"], ["sms", "SMS"], ["viber", "Viber"]].map(([val, l]) => (
              <label key={val} className="cursor-pointer rounded-full border border-line bg-surface px-3 py-2 text-xs font-bold has-[:checked]:border-ink has-[:checked]:bg-ink has-[:checked]:text-surface">
                <input type="checkbox" name="reminderChannels" value={val} defaultChecked={v.reminderChannels.split(",").includes(val)} className="sr-only" />{l}
              </label>
            ))}
          </div>
        </div>
        <F id="smsSenderName" label="Αποστολέας SMS" hint="(έως 11 λατινικοί χαρακτήρες)" defaultValue={v.smsSenderName ?? ""} maxLength={11} placeholder="Metropolis" />
      </div>
      <label className="flex items-center gap-2 text-sm font-semibold">
        <input type="checkbox" name="autoReleaseEnabled" defaultChecked={v.autoReleaseEnabled} className="h-4 w-4 accent-accent" />
        Αυτόματη απελευθέρωση τραπεζιού αν ο πελάτης δεν επιβεβαιώσει
      </label>
      <div className="grid gap-3 sm:grid-cols-3">
        <F id="autoReleaseHoursBefore" label="Πόσες ώρες πριν την άφιξη" type="number" min={1} max={72} defaultValue={v.autoReleaseHoursBefore} />
      </div>

      <div>
        <h2 className="font-bold">Πρόγραμμα επιβράβευσης & αξιολογήσεις</h2>
        <p className="text-sm text-ink-3">Πόντοι σε κάθε επίσκεψη, δώρο όταν συμπληρωθούν, αξιολόγηση μετά την επίσκεψη και ευχές γενεθλίων.</p>
      </div>
      <label className="flex items-center gap-2 text-sm font-semibold">
        <input type="checkbox" name="loyaltyEnabled" defaultChecked={v.loyaltyEnabled} className="h-4 w-4 accent-accent" />
        Ενεργό πρόγραμμα πόντων
      </label>
      <div className="grid gap-3 sm:grid-cols-3">
        <F id="pointsPerVisit" label="Πόντοι ανά επίσκεψη" type="number" min={0} defaultValue={v.pointsPerVisit} />
        <F id="rewardPoints" label="Πόντοι για δώρο" type="number" min={1} defaultValue={v.rewardPoints} />
        <F id="rewardText" label="Το δώρο" defaultValue={v.rewardText} placeholder="Ένα δωρεάν επιδόρπιο" />
      </div>
      <label className="flex items-center gap-2 text-sm font-semibold">
        <input type="checkbox" name="reviewRequestEnabled" defaultChecked={v.reviewRequestEnabled} className="h-4 w-4 accent-accent" />
        Αίτημα αξιολόγησης με email μετά την επίσκεψη
      </label>
      <label className="flex items-center gap-2 text-sm font-semibold">
        <input type="checkbox" name="birthdayGreeting" defaultChecked={v.birthdayGreeting} className="h-4 w-4 accent-accent" />
        Ευχές γενεθλίων με email (όταν είναι γνωστή η ημερομηνία)
      </label>
      <div className="flex items-center gap-3">
        <button disabled={pending} className="btn-primary">{pending ? "Αποθήκευση…" : "Αποθήκευση"}</button>
        <Msg state={state} />
      </div>
    </form>
  );
}

const DAYS = [
  { v: 1, l: "Δευ" }, { v: 2, l: "Τρί" }, { v: 3, l: "Τετ" }, { v: 4, l: "Πέμ" }, { v: 5, l: "Παρ" }, { v: 6, l: "Σάβ" }, { v: 0, l: "Κυρ" },
];

export function ShiftForm({ venueId, shift }: { venueId: string; shift?: Shift }) {
  const [state, action, pending] = useActionState<ActionState, FormData>(saveShift, {});
  const days = new Set((shift?.daysOfWeek ?? "1,2,3,4,5,6,0").split(",").map(Number));
  const p = shift?.id ?? "new";
  return (
    <form action={action} className="mt-2 flex flex-col gap-3">
      <input type="hidden" name="venueId" value={venueId} />
      <input type="hidden" name="id" value={shift?.id ?? ""} />
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
        <F id={`${p}-name`} label="Όνομα" defaultValue={shift?.name ?? ""} placeholder="Δείπνο" required {...{ name: "name" }} />
        <F id={`${p}-start`} label="Από" type="time" defaultValue={shift?.startTime ?? "19:00"} required {...{ name: "startTime" }} />
        <F id={`${p}-end`} label="Έως" type="time" defaultValue={shift?.endTime ?? "23:30"} required {...{ name: "endTime" }} />
        <F id={`${p}-last`} label="Τελευταία κράτηση" hint="λεπτά πριν το τέλος" type="number" min={0} step={15} defaultValue={shift?.lastSeatingOffset ?? 90} {...{ name: "lastSeatingOffset" }} />
      </div>
      <div className="flex flex-wrap gap-1.5">
        {DAYS.map((d) => (
          <label key={d.v} className="cursor-pointer rounded-full border border-line bg-surface px-3 py-1 text-xs font-bold has-[:checked]:border-ink has-[:checked]:bg-ink has-[:checked]:text-surface">
            <input type="checkbox" name="days" value={d.v} defaultChecked={days.has(d.v)} className="sr-only" />{d.l}
          </label>
        ))}
      </div>
      <div className="flex flex-wrap items-end gap-3">
        <F id={`${p}-max`} label="Μέγ. άτομα ανά slot" hint="(0 = χωρίς όριο)" type="number" min={0} defaultValue={shift?.maxCoversPerSlot ?? 0} {...{ name: "maxCoversPerSlot" }} />
        <label className="flex items-center gap-2 pb-3 text-sm font-semibold"><input type="checkbox" name="isOnlineBookable" defaultChecked={shift?.isOnlineBookable ?? true} className="h-4 w-4 accent-accent" /> Online κρατήσεις</label>
        <button disabled={pending} className="btn-primary py-2">{pending ? "…" : "Αποθήκευση"}</button>
        <Msg state={state} />
      </div>
    </form>
  );
}

export function AreaForm({ venueId, area }: { venueId: string; area?: Area }) {
  const [state, action, pending] = useActionState<ActionState, FormData>(saveArea, {});
  const p = area?.id ?? "new";
  return (
    <form action={action} className="mt-2 flex flex-wrap items-end gap-2">
      <input type="hidden" name="venueId" value={venueId} />
      <input type="hidden" name="id" value={area?.id ?? ""} />
      <F id={`${p}-area-name`} label="Όνομα χώρου" defaultValue={area?.name ?? ""} placeholder="Βεράντα" required {...{ name: "name" }} />
      <label className="flex items-center gap-2 pb-3 text-sm font-semibold"><input type="checkbox" name="isOnlineBookable" defaultChecked={area?.isOnlineBookable ?? true} className="h-4 w-4 accent-accent" /> Επιλέξιμος online</label>
      <button disabled={pending} className="btn-primary py-2">{pending ? "…" : "Αποθήκευση"}</button>
      <Msg state={state} />
    </form>
  );
}

export function TableForm({ venueId, areas, table, defaultAreaId }: { venueId: string; areas: { id: string; name: string }[]; table?: Table; defaultAreaId?: string }) {
  const [state, action, pending] = useActionState<ActionState, FormData>(saveTable, {});
  const p = table?.id ?? `new-${defaultAreaId}`;
  return (
    <form action={action} className="flex flex-col gap-2">
      <input type="hidden" name="venueId" value={venueId} />
      <input type="hidden" name="id" value={table?.id ?? ""} />
      <div className="grid grid-cols-3 gap-2">
        <F id={`${p}-t-name`} label="Όνομα" defaultValue={table?.name ?? ""} placeholder="T1" required maxLength={8} {...{ name: "name" }} />
        <F id={`${p}-t-min`} label="Ελάχ." type="number" min={1} defaultValue={table?.minSeats ?? 1} {...{ name: "minSeats" }} />
        <F id={`${p}-t-max`} label="Μέγ." type="number" min={1} defaultValue={table?.maxSeats ?? 4} {...{ name: "maxSeats" }} />
      </div>
      <div className="grid grid-cols-2 gap-2">
        <div><label htmlFor={`${p}-t-area`} className="label">Χώρος</label><select id={`${p}-t-area`} name="areaId" defaultValue={table?.areaId ?? defaultAreaId} className="input py-2">{areas.map((a) => <option key={a.id} value={a.id}>{a.name}</option>)}</select></div>
        <div><label htmlFor={`${p}-t-shape`} className="label">Σχήμα</label><select id={`${p}-t-shape`} name="shape" defaultValue={table?.shape ?? "RECT"} className="input py-2"><option value="RECT">Ορθογώνιο</option><option value="ROUND">Στρογγυλό</option></select></div>
      </div>
      <div className="flex items-center gap-2"><button disabled={pending} className="btn-primary py-1.5 text-xs">{pending ? "…" : "Αποθήκευση"}</button><Msg state={state} /></div>
    </form>
  );
}

export function PasswordForm() {
  const [state, action, pending] = useActionState<ActionState, FormData>(changePassword, {});
  return (
    <form action={action} className="card flex flex-col gap-3 p-5">
      <div>
        <h2 className="font-bold">Ο λογαριασμός μου</h2>
        <p className="text-sm text-ink-3">Αλλαγή κωδικού πρόσβασης.</p>
      </div>
      <div className="grid gap-3 sm:grid-cols-2">
        <F id="current" label="Τρέχων κωδικός" type="password" autoComplete="current-password" required />
        <F id="next" label="Νέος κωδικός" hint="(8+ χαρακτήρες)" type="password" autoComplete="new-password" minLength={8} required />
      </div>
      <div className="flex items-center gap-3">
        <button disabled={pending} className="btn-primary">{pending ? "…" : "Αλλαγή κωδικού"}</button>
        <Msg state={state} />
      </div>
    </form>
  );
}
