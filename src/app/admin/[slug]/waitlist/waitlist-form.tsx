"use client";

import { useActionState } from "react";
import { addToWaitlist, type ActionState } from "../actions";

export function WaitlistForm({ venueId }: { venueId: string }) {
  const [state, action, pending] = useActionState<ActionState, FormData>(addToWaitlist, {});
  return (
    <form action={action} className="card flex flex-col gap-3 p-4 self-start">
      <h2 className="font-bold">Προσθήκη στη λίστα</h2>
      <input type="hidden" name="venueId" value={venueId} />
      <div><label htmlFor="wl-name" className="label">Όνομα</label><input id="wl-name" name="firstName" className="input" required /></div>
      <div><label htmlFor="wl-phone" className="label">Κινητό</label><input id="wl-phone" name="phone" type="tel" className="input" required /></div>
      <div className="grid grid-cols-2 gap-2">
        <div><label htmlFor="wl-party" className="label">Άτομα</label><input id="wl-party" name="partySize" type="number" min={1} defaultValue={2} className="input" required /></div>
        <div><label htmlFor="wl-quote" className="label">Εκτίμηση (λεπτά)</label><input id="wl-quote" name="quotedMinutes" type="number" min={0} step={5} defaultValue={20} className="input" /></div>
      </div>
      {state.error && <p className="text-sm font-semibold text-bad">{state.error}</p>}
      <button disabled={pending} className="btn-primary">{pending ? "…" : "Προσθήκη"}</button>
    </form>
  );
}
