import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { formatYmdShort } from "@/lib/time";
import { myVenue } from "@/lib/venue-access";
import { replyToReview } from "../actions";

export const dynamic = "force-dynamic";
export const metadata = { title: "Αξιολογήσεις" };

export default async function ReviewsPage({ params }: PageProps<"/admin/[slug]/reviews">) {
  const { slug } = await params;
  const { venue } = await myVenue(slug);
  const reviews = await prisma.review.findMany({
    where: { venueId: venue.id },
    include: { customer: true, reservation: true },
    orderBy: { createdAt: "desc" },
    take: 200,
  });
  const avg = reviews.length ? reviews.reduce((n, r) => n + r.rating, 0) / reviews.length : 0;
  const dist = [5, 4, 3, 2, 1].map((n) => ({ n, count: reviews.filter((r) => r.rating === n).length }));

  return (
    <div className="flex flex-col gap-5">
      <header className="flex flex-wrap items-center gap-3">
        <h1 className="text-xl font-bold sm:text-2xl">Αξιολογήσεις</h1>
        <span className="text-sm text-ink-3">{reviews.length} συνολικά</span>
      </header>
      <div className="grid gap-4 md:grid-cols-[220px_1fr]">
        <section className="card p-5 text-center">
          <p className="font-display text-5xl font-bold num text-accent">{avg ? avg.toFixed(1) : "—"}</p>
          <p className="text-sm text-ink-3">{"★".repeat(Math.round(avg))}{"☆".repeat(5 - Math.round(avg))}</p>
          <ul className="mt-4 flex flex-col gap-1.5 text-left text-xs">
            {dist.map((d) => (
              <li key={d.n} className="flex items-center gap-2"><span className="w-4 num">{d.n}★</span><span className="h-2 flex-1 overflow-hidden rounded-full bg-surface-2"><span className="block h-full rounded-full bg-accent" style={{ width: reviews.length ? `${(d.count / reviews.length) * 100}%` : 0 }} /></span><span className="w-6 text-right num">{d.count}</span></li>
            ))}
          </ul>
        </section>
        <ul className="flex flex-col gap-2">
          {reviews.length === 0 && <li className="card p-8 text-center text-ink-3">Καμία αξιολόγηση ακόμα. Στέλνονται αυτόματα μετά από κάθε επίσκεψη.</li>}
          {reviews.map((rv) => (
            <li key={rv.id} className="card flex flex-col gap-2 p-4">
              <div className="flex flex-wrap items-center gap-2 text-sm">
                <span className="text-accent">{"★".repeat(rv.rating)}<span className="text-line">{"★".repeat(5 - rv.rating)}</span></span>
                <Link href={`/admin/${slug}/customers/${rv.customerId}`} className="font-bold hover:text-accent">{rv.customer.firstName} {rv.customer.lastName ?? ""}</Link>
                <span className="text-xs text-ink-3">επίσκεψη {formatYmdShort(rv.reservation.date)} · {rv.reservation.partySize} άτ.</span>
              </div>
              {rv.comment ? <p className="text-sm">{rv.comment}</p> : <p className="text-sm text-ink-3">Χωρίς σχόλιο.</p>}
              <details className="text-xs" open={Boolean(rv.reply)}>
                <summary className="cursor-pointer text-ink-3">{rv.reply ? "Η απάντησή σας" : "Απάντηση"}</summary>
                <form action={replyToReview} className="mt-1 flex gap-2">
                  <input type="hidden" name="id" value={rv.id} />
                  <input name="reply" defaultValue={rv.reply ?? ""} className="input py-1.5 text-xs" placeholder="Ευχαριστούμε πολύ! Σας περιμένουμε ξανά." />
                  <button className="btn-ghost px-3 py-1.5 text-xs">OK</button>
                </form>
              </details>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
