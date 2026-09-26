"use client";

import { useActionState } from "react";
import { updateCustomer, type ActionState } from "../../actions";

type C = { id: string; firstName: string; lastName: string | null; phone: string; email: string | null; notes: string | null; allergies: string | null; tags: string | null; birthday: string | null; isVip: boolean };

export function CustomerForm({ customer: c }: { customer: C }) {
  const [state, action, pending] = useActionState<ActionState, FormData>(updateCustomer, {});
  return (
    <form action={action} className="card flex flex-col gap-3 p-4 self-start">
      <input type="hidden" name="id" value={c.id} />
      <div className="grid grid-cols-2 gap-2">
        <div><label htmlFor="c-first" className="label">Όνομα</label><input id="c-first" name="firstName" defaultValue={c.firstName} className="input" required /></div>
        <div><label htmlFor="c-last" className="label">Επώνυμο</label><input id="c-last" name="lastName" defaultValue={c.lastName ?? ""} className="input" /></div>
      </div>
      <div><span className="label">Τηλέφωνο</span><p className="input bg-surface-2 num">{c.phone}</p></div>
      <div><label htmlFor="c-email" className="label">Email</label><input id="c-email" name="email" type="email" defaultValue={c.email ?? ""} className="input" /></div>
      <div><label htmlFor="c-birthday" className="label">Γενέθλια (ΜΜ-ΗΗ)</label><input id="c-birthday" name="birthday" defaultValue={c.birthday ?? ""} placeholder="09-26" pattern="\d{2}-\d{2}" className="input" /></div>
      <div><label htmlFor="c-allergies" className="label">Αλλεργίες / διατροφή</label><input id="c-allergies" name="allergies" defaultValue={c.allergies ?? ""} className="input" /></div>
      <div><label htmlFor="c-tags" className="label">Ετικέτες <span className="font-medium text-ink-3">(με κόμμα)</span></label><input id="c-tags" name="tags" defaultValue={c.tags ?? ""} placeholder="τακτικός, κρασί, παράθυρο" className="input" /></div>
      <div><label htmlFor="c-notes" className="label">Σημειώσεις προσωπικού</label><textarea id="c-notes" name="notes" rows={3} defaultValue={c.notes ?? ""} className="input resize-none" /></div>
      <label className="flex items-center gap-2 text-sm font-semibold"><input type="checkbox" name="isVip" defaultChecked={c.isVip} className="h-4 w-4 accent-accent" /> VIP πελάτης</label>
      {state.error && <p className="text-sm font-semibold text-bad">{state.error}</p>}
      {state.ok && <p className="text-sm font-semibold text-ok">Αποθηκεύτηκε.</p>}
      <button disabled={pending} className="btn-primary">{pending ? "Αποθήκευση…" : "Αποθήκευση"}</button>
    </form>
  );
}
