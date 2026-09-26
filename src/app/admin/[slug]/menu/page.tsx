import Link from "next/link";
import { MENU_TAGS, euro, loadMenu } from "@/lib/menu";
import { myVenue } from "@/lib/venue-access";
import { deleteCategory, deleteItem, toggleItem, toggleOrdering } from "../menu-actions";
import { CategoryForm, ItemForm } from "./forms";

export const dynamic = "force-dynamic";
export const metadata = { title: "Μενού" };

export default async function MenuAdminPage({ params }: PageProps<"/admin/[slug]/menu">) {
  const { slug } = await params;
  const { venue } = await myVenue(slug);
  const categories = await loadMenu(venue.id, true);

  return (
    <div className="flex flex-col gap-5">
      <header className="flex flex-wrap items-center gap-3">
        <h1 className="text-xl font-bold sm:text-2xl">Μενού</h1>
        <Link href={`/m/${slug}?t=T1`} target="_blank" className="text-sm text-ink-3 hover:text-accent">Προεπισκόπηση ↗</Link>
        <form action={toggleOrdering} className="ml-auto">
          <input type="hidden" name="venueId" value={venue.id} />
          <button className={`pill ${venue.orderingEnabled ? "bg-ok-soft text-ok" : "bg-surface-2 text-ink-2"}`}>
            {venue.orderingEnabled ? "● Παραγγελίες από QR: ανοιχτές" : "○ Παραγγελίες από QR: κλειστές"}
          </button>
        </form>
      </header>
      <p className="text-sm text-ink-3">Ο πελάτης σκανάρει το QR του τραπεζιού (Προώθηση → QR τραπεζιών), βλέπει το μενού και παραγγέλνει. Οι παραγγελίες εμφανίζονται στη σελίδα «Παραγγελίες».</p>

      {categories.map((c) => (
        <section key={c.id} className="card p-4">
          <div className="mb-3 flex flex-wrap items-center gap-2">
            <h2 className="font-bold">{c.name}</h2>
            {!c.isActive && <span className="pill bg-surface-2 text-ink-3">κρυφή</span>}
            <span className="text-xs text-ink-3">{c.items.length} είδη</span>
            <details className="ml-auto"><summary className="cursor-pointer text-xs text-ink-3">Επεξεργασία</summary><CategoryForm venueId={venue.id} category={c} /></details>
            <form action={deleteCategory}><input type="hidden" name="id" value={c.id} /><button className="text-xs text-bad hover:underline">Διαγραφή</button></form>
          </div>
          <ul className="flex flex-col gap-1.5">
            {c.items.map((i) => (
              <li key={i.id} className={`rounded-[14px] bg-surface-2 px-3 py-2 ${i.isAvailable ? "" : "opacity-60"}`}>
                <div className="flex flex-wrap items-center gap-2 text-sm">
                  <b>{i.name}</b>
                  <span className="num text-ink-2">{euro(i.priceCents)}</span>
                  {i.tags && <span className="text-xs text-ink-3">{i.tags.split(",").map((t) => MENU_TAGS[t] ?? t).join(" ")}</span>}
                  <form action={toggleItem} className="ml-auto"><input type="hidden" name="id" value={i.id} /><button className={`pill ${i.isAvailable ? "bg-ok-soft text-ok" : "bg-warn-soft text-warn"}`}>{i.isAvailable ? "διαθέσιμο" : "εξαντλημένο"}</button></form>
                  <details><summary className="cursor-pointer text-xs text-ink-3">Επεξεργασία</summary><ItemForm venueId={venue.id} categories={categories.map((x) => ({ id: x.id, name: x.name }))} item={i} /></details>
                  <form action={deleteItem}><input type="hidden" name="id" value={i.id} /><button className="text-xs text-bad hover:underline">✕</button></form>
                </div>
                {i.description && <p className="text-xs text-ink-3">{i.description}</p>}
              </li>
            ))}
          </ul>
          <details className="mt-2 rounded-[14px] border border-dashed border-line p-3"><summary className="cursor-pointer text-sm font-bold">+ Νέο είδος</summary><ItemForm venueId={venue.id} categories={categories.map((x) => ({ id: x.id, name: x.name }))} defaultCategoryId={c.id} /></details>
        </section>
      ))}
      <details className="card p-4"><summary className="cursor-pointer text-sm font-bold">+ Νέα κατηγορία</summary><CategoryForm venueId={venue.id} /></details>
    </div>
  );
}
