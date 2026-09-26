"use client";

import type { MenuCategory, MenuItem } from "@prisma/client";
import { useActionState } from "react";
import { MENU_TAGS } from "@/lib/menu";
import { saveCategory, saveItem, type ActionState } from "../menu-actions";

function Msg({ state }: { state: ActionState }) {
  if (state.error) return <p className="text-sm font-semibold text-bad">{state.error}</p>;
  if (state.ok) return <p className="text-sm font-semibold text-ok">Αποθηκεύτηκε.</p>;
  return null;
}

export function CategoryForm({ venueId, category }: { venueId: string; category?: MenuCategory }) {
  const [state, action, pending] = useActionState<ActionState, FormData>(saveCategory, {});
  const p = category?.id ?? "new";
  return (
    <form action={action} className="mt-2 flex flex-wrap items-end gap-2">
      <input type="hidden" name="venueId" value={venueId} />
      <input type="hidden" name="id" value={category?.id ?? ""} />
      <div><label htmlFor={`${p}-cat`} className="label">Όνομα</label><input id={`${p}-cat`} name="name" defaultValue={category?.name ?? ""} placeholder="Ορεκτικά" className="input" required /></div>
      {category && <label className="flex items-center gap-2 pb-3 text-sm font-semibold"><input type="checkbox" name="isActive" defaultChecked={category.isActive} className="h-4 w-4 accent-accent" /> Ορατή</label>}
      <button disabled={pending} className="btn-primary py-2">{pending ? "…" : "Αποθήκευση"}</button>
      <Msg state={state} />
    </form>
  );
}

export function ItemForm({ venueId, categories, item, defaultCategoryId }: { venueId: string; categories: { id: string; name: string }[]; item?: MenuItem; defaultCategoryId?: string }) {
  const [state, action, pending] = useActionState<ActionState, FormData>(saveItem, {});
  const p = item?.id ?? `new-${defaultCategoryId}`;
  const tags = new Set(item?.tags?.split(",") ?? []);
  return (
    <form action={action} className="mt-2 flex flex-col gap-2">
      <input type="hidden" name="venueId" value={venueId} />
      <input type="hidden" name="id" value={item?.id ?? ""} />
      <div className="grid grid-cols-[1fr_100px] gap-2">
        <div><label htmlFor={`${p}-name`} className="label">Όνομα</label><input id={`${p}-name`} name="name" defaultValue={item?.name ?? ""} className="input" required /></div>
        <div><label htmlFor={`${p}-price`} className="label">Τιμή €</label><input id={`${p}-price`} name="price" type="number" step="0.10" min={0} defaultValue={item ? item.priceCents / 100 : ""} className="input" required /></div>
      </div>
      <div><label htmlFor={`${p}-desc`} className="label">Περιγραφή</label><input id={`${p}-desc`} name="description" defaultValue={item?.description ?? ""} className="input" /></div>
      <div className="flex flex-wrap items-end gap-2">
        <div><label htmlFor={`${p}-catsel`} className="label">Κατηγορία</label><select id={`${p}-catsel`} name="categoryId" defaultValue={item?.categoryId ?? defaultCategoryId} className="input py-2">{categories.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}</select></div>
        <div className="flex flex-wrap gap-1.5 pb-1">
          {Object.entries(MENU_TAGS).map(([val, l]) => (
            <label key={val} className="cursor-pointer rounded-full border border-line bg-surface px-2.5 py-1 text-xs font-bold has-[:checked]:border-ink has-[:checked]:bg-ink has-[:checked]:text-surface">
              <input type="checkbox" name="tags" value={val} defaultChecked={tags.has(val)} className="sr-only" />{l}
            </label>
          ))}
        </div>
        <label className="flex items-center gap-2 pb-2 text-sm font-semibold"><input type="checkbox" name="isAvailable" defaultChecked={item?.isAvailable ?? true} className="h-4 w-4 accent-accent" /> Διαθέσιμο</label>
        <button disabled={pending} className="btn-primary py-2">{pending ? "…" : "Αποθήκευση"}</button>
        <Msg state={state} />
      </div>
    </form>
  );
}
