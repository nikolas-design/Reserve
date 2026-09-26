import Link from "next/link";
import { notFound } from "next/navigation";
import { ORDER_STATUS_LABEL, euro, type OrderStatus } from "@/lib/menu";
import { prisma } from "@/lib/prisma";
import { AutoRefresh } from "@/components/auto-refresh";

export const dynamic = "force-dynamic";
export const metadata = { title: "Η παραγγελία σας" };

const STEPS: OrderStatus[] = ["NEW", "ACCEPTED", "READY", "SERVED"];

export default async function OrderStatusPage({ params }: PageProps<"/m/[slug]/o/[id]">) {
  const { slug, id } = await params;
  const order = await prisma.order.findFirst({ where: { id, venue: { slug } }, include: { items: true, venue: true } });
  if (!order) notFound();
  const status = order.status as OrderStatus;
  const idx = STEPS.indexOf(status);
  const live = status !== "SERVED" && status !== "CANCELLED";

  return (
    <div className="flex-1 px-4 py-8">
      {live && <AutoRefresh seconds={10} />}
      <div className="mx-auto w-full max-w-md flex flex-col gap-4">
        <div className="card p-6 flex flex-col gap-4 shadow-[var(--shadow)]">
          <div>
            <p className="text-xs font-bold uppercase tracking-wider" style={{ color: order.venue.brandColor }}>{order.venue.name}</p>
            <h1 className="text-2xl font-bold">Παραγγελία #{order.number}</h1>
            <p className="text-sm text-ink-3">{order.tableName ? `Τραπέζι ${order.tableName}` : ""}</p>
          </div>
          {status === "CANCELLED" ? (
            <p className="rounded-[14px] bg-bad-soft px-4 py-3 text-sm font-semibold text-bad">Η παραγγελία ακυρώθηκε. Ρωτήστε το προσωπικό.</p>
          ) : (
            <ol className="grid grid-cols-4 gap-1 text-center text-[11px] font-bold">
              {STEPS.map((s, i) => (
                <li key={s} className={`rounded-xl px-1 py-2 ${i <= idx ? "text-white" : "bg-surface-2 text-ink-3"}`} style={i <= idx ? { background: order.venue.brandColor } : undefined}>
                  {ORDER_STATUS_LABEL[s]}
                </li>
              ))}
            </ol>
          )}
          <ul className="flex flex-col gap-1.5 text-sm">
            {order.items.map((i) => (
              <li key={i.id} className="flex items-center gap-2"><span className="w-6 font-bold num">{i.qty}×</span><span className="flex-1">{i.name}</span><span className="num text-ink-2">{euro(i.priceCents * i.qty)}</span></li>
            ))}
            <li className="mt-1 flex items-center justify-between border-t border-line pt-2 font-bold"><span>Σύνολο</span><span className="num">{euro(order.totalCents)}</span></li>
          </ul>
          {order.notes && <p className="text-xs text-ink-2">💬 {order.notes}</p>}
          <Link href={`/m/${slug}${order.tableName ? `?t=${order.tableName}` : ""}`} className="btn-ghost w-full">Παραγγείλτε κάτι ακόμα</Link>
        </div>
        {live && <p className="text-center text-xs text-ink-3">Η σελίδα ανανεώνεται αυτόματα.</p>}
      </div>
    </div>
  );
}
