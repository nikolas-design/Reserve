import Link from "next/link";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { formatYmdLong } from "@/lib/time";
import { ReviewForm } from "./review-form";

export const dynamic = "force-dynamic";
export const metadata = { title: "Αξιολόγηση" };

export default async function ReviewPage({ params, searchParams }: PageProps<"/review/[code]">) {
  const { code } = await params;
  const sp = await searchParams;
  const r = await prisma.reservation.findUnique({ where: { code }, include: { venue: true, customer: true, review: true } });
  if (!r || sp.t !== r.manageToken) notFound();
  const preset = Number(sp.rating);

  return (
    <div className="flex-1 px-4 py-8">
      <div className="mx-auto w-full max-w-md">
        <div className="card p-6 flex flex-col gap-4 shadow-[var(--shadow)]">
          <p className="text-xs font-bold uppercase tracking-wider" style={{ color: r.venue.brandColor }}>{r.venue.name}</p>
          {r.review ? (
            <>
              <h1 className="text-2xl font-bold">Ευχαριστούμε!</h1>
              <p className="text-ink-2">Η αξιολόγησή σας ({"★".repeat(r.review.rating)}) καταχωρήθηκε.</p>
              {r.review.reply && <p className="rounded-[14px] bg-surface-2 px-4 py-3 text-sm"><b>Απάντηση από το {r.venue.name}:</b> {r.review.reply}</p>}
              <Link href={`/${r.venue.slug}`} className="btn-primary w-full">Νέα κράτηση</Link>
            </>
          ) : (
            <>
              <h1 className="text-2xl font-bold">Πώς ήταν;</h1>
              <p className="text-sm text-ink-3">Επίσκεψη {formatYmdLong(r.date)} · {r.customer.firstName}</p>
              <ReviewForm code={r.code} token={r.manageToken} preset={preset >= 1 && preset <= 5 ? preset : 0} brandColor={r.venue.brandColor} bonus={r.venue.loyaltyEnabled ? 5 : 0} />
            </>
          )}
        </div>
      </div>
    </div>
  );
}
