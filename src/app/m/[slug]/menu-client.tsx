"use client";

import { useActionState, useMemo, useState } from "react";
import { MENU_TAGS, euro } from "@/lib/menu";
import { placeOrder, type OrderState } from "./actions";

type Item = { id: string; name: string; description: string | null; priceCents: number; tags: string[] };
type Cat = { id: string; name: string; items: Item[] };

export function MenuClient({ slug, orderingEnabled, tableName, brandColor, categories }: { slug: string; orderingEnabled: boolean; tableName: string | null; brandColor: string; categories: Cat[] }) {
  const [cart, setCart] = useState<Record<string, number>>({});
  const [open, setOpen] = useState(false);
  const [state, action, pending] = useActionState<OrderState, FormData>(placeOrder, {});
  const items = useMemo(() => new Map(categories.flatMap((c) => c.items.map((i) => [i.id, i] as const))), [categories]);
  const lines = Object.entries(cart).filter(([, q]) => q > 0).map(([id, qty]) => ({ item: items.get(id)!, qty }));
  const total = lines.reduce((n, l) => n + l.item.priceCents * l.qty, 0);
  const count = lines.reduce((n, l) => n + l.qty, 0);
  const add = (id: string, d: number) => setCart((c) => ({ ...c, [id]: Math.max(0, (c[id] ?? 0) + d) }));

  return (
    <>
      <nav className="no-scrollbar -mx-4 flex gap-2 overflow-x-auto px-4">
        {categories.map((c) => (
          <a key={c.id} href={`#cat-${c.id}`} className="shrink-0 rounded-full bg-surface-2 px-3 py-1.5 text-xs font-bold text-ink-2">{c.name}</a>
        ))}
      </nav>

      {categories.length === 0 && <p className="card p-6 text-center text-sm text-ink-3">Το μενού ετοιμάζεται.</p>}

      {categories.map((c) => (
        <section key={c.id} id={`cat-${c.id}`} className="flex flex-col gap-2 scroll-mt-4">
          <h2 className="mt-2 text-base font-bold">{c.name}</h2>
          {c.items.map((i) => {
            const q = cart[i.id] ?? 0;
            return (
              <div key={i.id} className="card flex items-start gap-3 p-3.5">
                <div className="min-w-0 flex-1">
                  <p className="font-bold">{i.name}</p>
                  {i.description && <p className="text-xs text-ink-2">{i.description}</p>}
                  {i.tags.length > 0 && <p className="mt-1 text-[11px] text-ink-3">{i.tags.map((t) => MENU_TAGS[t] ?? t).join(" · ")}</p>}
                </div>
                <div className="flex flex-col items-end gap-2">
                  <span className="font-display font-bold num">{euro(i.priceCents)}</span>
                  {orderingEnabled && (
                    q === 0 ? (
                      <button type="button" onClick={() => add(i.id, 1)} className="rounded-full px-3 py-1 text-xs font-bold text-white" style={{ background: brandColor }}>+ Προσθήκη</button>
                    ) : (
                      <span className="inline-flex items-center gap-2 rounded-full bg-surface-2 p-1">
                        <button type="button" aria-label="Λιγότερο" onClick={() => add(i.id, -1)} className="grid h-7 w-7 place-items-center rounded-full bg-surface font-bold">−</button>
                        <b className="w-4 text-center num">{q}</b>
                        <button type="button" aria-label="Περισσότερο" onClick={() => add(i.id, 1)} className="grid h-7 w-7 place-items-center rounded-full bg-surface font-bold">+</button>
                      </span>
                    )
                  )}
                </div>
              </div>
            );
          })}
        </section>
      ))}

      {orderingEnabled && count > 0 && !open && (
        <div className="sticky bottom-3 mt-4">
          <button type="button" onClick={() => setOpen(true)} className="btn-primary w-full py-4 shadow-[var(--shadow)]" style={{ background: brandColor }}>
            Παραγγελία · {count} {count === 1 ? "είδος" : "είδη"} · <span className="num">{euro(total)}</span>
          </button>
        </div>
      )}

      {open && (
        <form action={action} className="card fixed inset-x-3 bottom-3 z-10 mx-auto flex max-h-[85vh] max-w-md flex-col gap-3 overflow-y-auto p-5 shadow-[var(--shadow)]">
          <input type="hidden" name="slug" value={slug} />
          <input type="hidden" name="table" value={tableName ?? ""} />
          <input type="hidden" name="lines" value={JSON.stringify(lines.map((l) => ({ id: l.item.id, qty: l.qty })))} />
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-bold">Η παραγγελία σας</h2>
            <button type="button" onClick={() => setOpen(false)} className="grid h-8 w-8 place-items-center rounded-full bg-surface-2" aria-label="Κλείσιμο">✕</button>
          </div>
          <ul className="flex flex-col gap-1.5 text-sm">
            {lines.map((l) => (
              <li key={l.item.id} className="flex items-center gap-2">
                <span className="w-6 font-bold num">{l.qty}×</span>
                <span className="flex-1">{l.item.name}</span>
                <span className="num text-ink-2">{euro(l.item.priceCents * l.qty)}</span>
              </li>
            ))}
            <li className="mt-1 flex items-center justify-between border-t border-line pt-2 font-bold"><span>Σύνολο</span><span className="num">{euro(total)}</span></li>
          </ul>
          <div><label htmlFor="o-name" className="label">Όνομα <span className="font-medium text-ink-3">(προαιρετικό)</span></label><input id="o-name" name="guestName" className="input" /></div>
          <div><label htmlFor="o-notes" className="label">Σχόλια</label><input id="o-notes" name="notes" className="input" placeholder="π.χ. χωρίς κρεμμύδι" /></div>
          {state.error && <p role="alert" className="rounded-[14px] bg-bad-soft px-3 py-2 text-sm font-semibold text-bad">{state.error}</p>}
          <button type="submit" disabled={pending || count === 0} className="btn-primary w-full py-3.5" style={{ background: brandColor }}>{pending ? "Αποστολή…" : `Αποστολή παραγγελίας · ${tableName ? `Τραπέζι ${tableName}` : ""}`}</button>
          <p className="text-center text-[11px] text-ink-3">Πληρωμή στο τραπέζι.</p>
        </form>
      )}
    </>
  );
}
