import Link from "next/link";
import { notFound } from "next/navigation";
import { StatusPill } from "@/components/status-pill";
import { prisma } from "@/lib/prisma";
import { formatYmdShort, utcToZoned } from "@/lib/time";
import { myVenue } from "@/lib/venue-access";
import { CustomerForm } from "./customer-form";

export const dynamic = "force-dynamic";

export default async function CustomerPage({ params }: PageProps<"/admin/[slug]/customers/[id]">) {
  const { slug, id } = await params;
  const { venue } = await myVenue(slug);
  const c = await prisma.customer.findFirst({
    where: { id, venueId: venue.id },
    include: { reservations: { orderBy: { startAt: "desc" }, take: 30, include: { tables: { include: { table: true } } } } },
  });
  if (!c) notFound();

  return (
    <div className="flex flex-col gap-5">
      <header className="flex flex-wrap items-center gap-3">
        <Link href={`/admin/${slug}/customers`} className="text-sm text-ink-3 hover:text-accent">← Πελάτες</Link>
        <h1 className="text-xl font-bold sm:text-2xl">{c.firstName} {c.lastName ?? ""}</h1>
        {c.isVip && <span className="pill bg-accent-soft text-accent">★ VIP</span>}
      </header>
      <div className="grid grid-cols-3 gap-3 sm:max-w-md">
        <Stat label="Επισκέψεις" value={c.visits} />
        <Stat label="No-show" value={c.noShows} tone={c.noShows ? "text-bad" : ""} />
        <Stat label="Κρατήσεις" value={c.reservations.length} />
      </div>
      <div className="grid gap-4 lg:grid-cols-[380px_1fr]">
        <CustomerForm customer={{ id: c.id, firstName: c.firstName, lastName: c.lastName, phone: c.phone, email: c.email, notes: c.notes, allergies: c.allergies, tags: c.tags, birthday: c.birthday, isVip: c.isVip }} />
        <section className="card p-4">
          <h2 className="mb-3 font-bold">Ιστορικό</h2>
          <ul className="flex flex-col gap-2">
            {c.reservations.length === 0 && <li className="text-sm text-ink-3">Καμία κράτηση ακόμα.</li>}
            {c.reservations.map((r) => (
              <li key={r.id} className="flex flex-wrap items-center gap-2 rounded-[14px] bg-surface-2 px-3 py-2 text-sm">
                <Link href={`/admin/${slug}?date=${r.date}`} className="font-bold num hover:text-accent">{formatYmdShort(r.date)} {utcToZoned(r.startAt, venue.timezone).hm}</Link>
                <span className="num text-ink-2">{r.partySize} άτ.</span>
                <span className="text-ink-3">{r.tables.map((t) => t.table.name).join("+") || "—"}</span>
                <span className="ml-auto"><StatusPill status={r.status} /></span>
                {r.guestNotes && <p className="w-full text-xs text-ink-2">💬 {r.guestNotes}</p>}
              </li>
            ))}
          </ul>
        </section>
      </div>
    </div>
  );
}

function Stat({ label, value, tone = "" }: { label: string; value: number; tone?: string }) {
  return (
    <div className="rounded-[18px] bg-surface-2 p-3">
      <p className="text-xs font-semibold text-ink-3">{label}</p>
      <p className={`font-display text-xl font-bold num ${tone}`}>{value}</p>
    </div>
  );
}
