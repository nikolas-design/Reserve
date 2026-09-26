import Link from "next/link";
import { notFound } from "next/navigation";
import { canGuestCancel } from "@/lib/booking";
import { STATUS_LABEL, type ReservationStatus } from "@/lib/constants";
import { prisma } from "@/lib/prisma";
import { formatYmdLong, utcToZoned } from "@/lib/time";
import { CancelButton } from "./cancel-button";

export const dynamic = "force-dynamic";
export const metadata = { title: "Η κράτησή μου" };

export default async function ManageReservationPage({ params, searchParams }: PageProps<"/r/[code]">) {
  const { code } = await params;
  const { t, new: isNew } = await searchParams;
  const r = await prisma.reservation.findUnique({
    where: { code },
    include: { venue: true, customer: true, area: true },
  });
  if (!r || typeof t !== "string" || t !== r.manageToken) notFound();

  const { hm } = utcToZoned(r.startAt, r.venue.timezone);
  const status = r.status as ReservationStatus;
  const cancellable = canGuestCancel(r, r.venue);
  const active = status === "CONFIRMED" || status === "PENDING" || status === "SEATED";
  const tone =
    status === "CANCELLED" || status === "NO_SHOW"
      ? "bg-bad-soft text-bad"
      : status === "PENDING"
        ? "bg-warn-soft text-warn"
        : "bg-ok-soft text-ok";

  return (
    <div className="flex-1 px-4 py-6 sm:py-10">
      <div className="mx-auto w-full max-w-md flex flex-col gap-4">
        {isNew === "1" && active && (
          <div className="rounded-[18px] bg-ok-soft px-4 py-3 text-sm font-semibold text-ok">
            {status === "PENDING"
              ? "Λάβαμε το αίτημά σας. Θα σας επιβεβαιώσουμε σύντομα."
              : "Η κράτησή σας επιβεβαιώθηκε. Σας περιμένουμε!"}
          </div>
        )}

        <div className="card p-6 flex flex-col gap-5 shadow-[var(--shadow)]">
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className="text-xs font-bold uppercase tracking-wider text-accent">{r.venue.name}</p>
              <h1 className="mt-1 text-2xl font-bold">Η κράτησή μου</h1>
            </div>
            <span className={`pill ${tone}`}>● {STATUS_LABEL[status]}</span>
          </div>

          <dl className="grid grid-cols-[auto_1fr] gap-x-6 gap-y-3 text-sm">
            <dt className="text-ink-3">Πότε</dt>
            <dd className="font-bold">{formatYmdLong(r.date)}, <span className="num">{hm}</span></dd>
            <dt className="text-ink-3">Άτομα</dt>
            <dd className="font-bold num">{r.partySize}</dd>
            <dt className="text-ink-3">Όνομα</dt>
            <dd className="font-bold">{r.customer.firstName} {r.customer.lastName ?? ""}</dd>
            {r.area && (<><dt className="text-ink-3">Χώρος</dt><dd className="font-bold">{r.area.name}</dd></>)}
            {r.guestNotes && (<><dt className="text-ink-3">Σχόλια</dt><dd>{r.guestNotes}</dd></>)}
            {r.depositCents > 0 && (
              <><dt className="text-ink-3">Προκαταβολή</dt><dd className="font-bold num">{(r.depositCents / 100).toFixed(2)} €{r.depositStatus === "PAID" ? " · πληρώθηκε" : ""}</dd></>
            )}
            <dt className="text-ink-3">Κωδικός</dt>
            <dd className="font-bold num">{r.code}</dd>
          </dl>

          {(r.venue.address || r.venue.phone) && (
            <div className="rounded-[14px] bg-surface-2 px-4 py-3 text-sm text-ink-2">
              {r.venue.address && <p>{r.venue.address}{r.venue.city ? `, ${r.venue.city}` : ""}</p>}
              {r.venue.phone && <p className="num">Τηλ: {r.venue.phone}</p>}
            </div>
          )}

          {active && (
            <div className="flex flex-col gap-2">
              <a href={`/r/${r.code}/calendar?t=${r.manageToken}`} className="btn-ghost w-full">
                Προσθήκη στο ημερολόγιο
              </a>
              <Link href={`/${r.venue.slug}`} className="btn-ghost w-full">
                Νέα κράτηση
              </Link>
              {cancellable ? (
                <CancelButton code={r.code} token={r.manageToken} />
              ) : (
                <p className="text-center text-xs text-ink-3">
                  Η δωρεάν ακύρωση online ισχύει έως {r.venue.cancellationHours} ώρες πριν. Για αλλαγές καλέστε μας.
                </p>
              )}
            </div>
          )}
          {!active && (
            <Link href={`/${r.venue.slug}`} className="btn-primary w-full">Κάντε νέα κράτηση</Link>
          )}
        </div>
      </div>
    </div>
  );
}
