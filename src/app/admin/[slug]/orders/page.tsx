import { AutoRefresh } from "@/components/auto-refresh";
import { ORDER_STATUS_LABEL, euro, type OrderStatus } from "@/lib/menu";
import { prisma } from "@/lib/prisma";
import { utcToZoned } from "@/lib/time";
import { myVenue } from "@/lib/venue-access";
import { setOrderStatus } from "../menu-actions";

export const dynamic = "force-dynamic";

/** Orders from roughly the current service day. */
function recentCutoff() {
  return new Date(Date.now() - 20 * 3600_000);
}
export const metadata = { title: "Παραγγελίες" };

const NEXT: Record<string, { status: OrderStatus; label: string; tone: string }[]> = {
  NEW: [{ status: "ACCEPTED", label: "Αποδοχή", tone: "btn-primary" }, { status: "CANCELLED", label: "Ακύρωση", tone: "btn-ghost" }],
  ACCEPTED: [{ status: "READY", label: "Έτοιμη", tone: "btn-primary" }, { status: "CANCELLED", label: "Ακύρωση", tone: "btn-ghost" }],
  READY: [{ status: "SERVED", label: "Σερβιρίστηκε", tone: "btn-primary" }],
};

export default async function OrdersPage({ params }: PageProps<"/admin/[slug]/orders">) {
  const { slug } = await params;
  const { venue } = await myVenue(slug);
  const orders = await prisma.order.findMany({
    where: { venueId: venue.id, createdAt: { gte: recentCutoff() } },
    include: { items: true },
    orderBy: { createdAt: "asc" },
  });
  const cols: { status: OrderStatus; tone: string }[] = [
    { status: "NEW", tone: "bg-warn-soft text-warn" },
    { status: "ACCEPTED", tone: "bg-accent-soft text-accent" },
    { status: "READY", tone: "bg-ok-soft text-ok" },
  ];
  const done = orders.filter((o) => o.status === "SERVED" || o.status === "CANCELLED");

  return (
    <div className="flex flex-col gap-5">
      <AutoRefresh seconds={10} />
      <header className="flex flex-wrap items-center gap-3">
        <h1 className="text-xl font-bold sm:text-2xl">Παραγγελίες</h1>
        <span className="text-xs text-ink-3">ανανέωση κάθε 10″</span>
        <span className="ml-auto text-sm text-ink-2">Σήμερα: <b className="num">{orders.length}</b> · <b className="num">{euro(orders.filter((o) => o.status !== "CANCELLED").reduce((n, o) => n + o.totalCents, 0))}</b></span>
      </header>
      <div className="grid gap-4 lg:grid-cols-3">
        {cols.map((c) => {
          const list = orders.filter((o) => o.status === c.status);
          return (
            <section key={c.status} className="flex flex-col gap-2">
              <h2 className="flex items-center gap-2 text-sm font-bold"><span className={`pill ${c.tone}`}>{ORDER_STATUS_LABEL[c.status]}</span><span className="num text-ink-3">{list.length}</span></h2>
              {list.length === 0 && <p className="rounded-[18px] border border-dashed border-line p-6 text-center text-xs text-ink-3">—</p>}
              {list.map((o) => (
                <article key={o.id} className="card flex flex-col gap-2 p-4">
                  <div className="flex items-center gap-2">
                    <span className="font-display text-lg font-bold num">#{o.number}</span>
                    <span className="rounded-full bg-ink px-2 py-0.5 text-xs font-bold text-surface">{o.tableName ?? "—"}</span>
                    <span className="ml-auto text-xs text-ink-3 num">{utcToZoned(o.createdAt, venue.timezone).hm}</span>
                  </div>
                  <ul className="text-sm">
                    {o.items.map((i) => <li key={i.id}><b className="num">{i.qty}×</b> {i.name}</li>)}
                  </ul>
                  {(o.notes || o.guestName) && <p className="text-xs text-ink-2">{o.guestName ? `${o.guestName} · ` : ""}{o.notes}</p>}
                  <div className="flex items-center gap-1.5">
                    <span className="mr-auto text-sm font-bold num">{euro(o.totalCents)}</span>
                    {NEXT[o.status]?.map((n) => (
                      <form key={n.status} action={setOrderStatus}><input type="hidden" name="id" value={o.id} /><input type="hidden" name="status" value={n.status} /><button className={`${n.tone} px-3 py-1.5 text-xs`}>{n.label}</button></form>
                    ))}
                  </div>
                </article>
              ))}
            </section>
          );
        })}
      </div>
      {done.length > 0 && (
        <details className="card p-4">
          <summary className="cursor-pointer text-sm font-bold">Ολοκληρωμένες σήμερα ({done.length})</summary>
          <ul className="mt-2 flex flex-col gap-1 text-sm">
            {done.map((o) => (
              <li key={o.id} className="flex gap-2 text-ink-2"><span className="num font-bold">#{o.number}</span><span>{o.tableName}</span><span>{ORDER_STATUS_LABEL[o.status as OrderStatus]}</span><span className="ml-auto num">{euro(o.totalCents)}</span></li>
            ))}
          </ul>
        </details>
      )}
    </div>
  );
}
