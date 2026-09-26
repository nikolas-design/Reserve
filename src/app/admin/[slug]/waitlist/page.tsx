import { prisma } from "@/lib/prisma";
import { myVenue } from "@/lib/venue-access";
import { setWaitlistStatus } from "../actions";
import { WaitlistForm } from "./waitlist-form";
import { WaitMinutes } from "./wait-minutes";

export const dynamic = "force-dynamic";
export const metadata = { title: "Λίστα αναμονής" };

export default async function WaitlistPage({ params }: PageProps<"/admin/[slug]/waitlist">) {
  const { slug } = await params;
  const { venue } = await myVenue(slug);
  const entries = await prisma.waitlistEntry.findMany({
    where: { venueId: venue.id, status: { in: ["WAITING", "NOTIFIED"] } },
    include: { customer: true },
    orderBy: { createdAt: "asc" },
  });

  return (
    <div className="flex flex-col gap-5">
      <header className="flex flex-wrap items-center gap-3">
        <h1 className="text-xl font-bold sm:text-2xl">Λίστα αναμονής</h1>
        <span className="pill bg-warn-soft text-warn">{entries.length} περιμένουν</span>
      </header>
      <div className="grid gap-4 lg:grid-cols-[1fr_320px]">
        <ul className="flex flex-col gap-2">
          {entries.length === 0 && <li className="card p-8 text-center text-ink-3">Κανείς δεν περιμένει.</li>}
          {entries.map((e, i) => {
            return (
              <li key={e.id} className="card flex flex-wrap items-center gap-3 p-4">
                <span className="grid h-9 w-9 place-items-center rounded-full bg-surface-2 font-display font-bold num">{i + 1}</span>
                <div className="min-w-0 flex-1">
                  <p className="font-bold">{e.customer.firstName} {e.customer.lastName ?? ""} <span className="num text-ink-2">· {e.partySize} άτ.</span></p>
                  <p className="text-xs text-ink-3">
                    περιμένει <WaitMinutes sinceMs={e.createdAt.getTime()} quoted={e.quotedMinutes} />
                    {e.quotedMinutes != null && <> · εκτίμηση {e.quotedMinutes}′</>}
                    {e.status === "NOTIFIED" && <> · <span className="text-accent">ειδοποιήθηκε</span></>}
                    {" · "}<span className="num">{e.customer.phone}</span>
                  </p>
                </div>
                <div className="flex gap-1.5">
                  {e.status === "WAITING" && (
                    <form action={setWaitlistStatus}><input type="hidden" name="id" value={e.id} /><input type="hidden" name="status" value="NOTIFIED" /><button className="btn-ghost px-3 py-1.5 text-xs">Ειδοποίηση</button></form>
                  )}
                  <form action={setWaitlistStatus}><input type="hidden" name="id" value={e.id} /><input type="hidden" name="status" value="SEATED" /><button className="btn-primary px-3 py-1.5 text-xs">Κάθισε</button></form>
                  <form action={setWaitlistStatus}><input type="hidden" name="id" value={e.id} /><input type="hidden" name="status" value="LEFT" /><button className="btn-ghost px-3 py-1.5 text-xs">Έφυγε</button></form>
                </div>
              </li>
            );
          })}
        </ul>
        <WaitlistForm venueId={venue.id} />
      </div>
    </div>
  );
}
