import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { myVenue } from "@/lib/venue-access";

export const dynamic = "force-dynamic";
export const metadata = { title: "Πελάτες" };

export default async function CustomersPage({ params, searchParams }: PageProps<"/admin/[slug]/customers">) {
  const { slug } = await params;
  const sp = await searchParams;
  const { venue } = await myVenue(slug);
  const q = typeof sp.q === "string" ? sp.q.trim() : "";

  const customers = await prisma.customer.findMany({
    where: {
      venueId: venue.id,
      ...(q
        ? { OR: [{ firstName: { contains: q } }, { lastName: { contains: q } }, { phone: { contains: q.replace(/\s/g, "") } }, { email: { contains: q } }] }
        : {}),
    },
    orderBy: [{ isVip: "desc" }, { lastVisitAt: "desc" }, { createdAt: "desc" }],
    take: 100,
  });

  return (
    <div className="flex flex-col gap-5">
      <header className="flex flex-wrap items-center gap-3">
        <h1 className="text-xl font-bold sm:text-2xl">Πελάτες</h1>
        <form className="ml-auto flex gap-2">
          <input name="q" defaultValue={q} placeholder="Όνομα, τηλέφωνο, email" className="input w-64 py-2" aria-label="Αναζήτηση πελάτη" />
          <button className="btn-ghost py-2">Αναζήτηση</button>
        </form>
      </header>
      <ul className="flex flex-col gap-2">
        {customers.length === 0 && <li className="card p-8 text-center text-ink-3">Δεν βρέθηκαν πελάτες.</li>}
        {customers.map((c) => (
          <li key={c.id}>
            <Link href={`/admin/${slug}/customers/${c.id}`} className="card flex flex-wrap items-center gap-3 p-4 hover:border-accent">
              <span className="grid h-10 w-10 place-items-center rounded-full bg-accent-soft font-display font-bold text-accent">
                {c.firstName[0]}{c.lastName?.[0] ?? ""}
              </span>
              <div className="min-w-0 flex-1">
                <p className="font-bold">{c.firstName} {c.lastName ?? ""} {c.isVip && <span className="pill bg-accent-soft text-accent">★ VIP</span>}</p>
                <p className="text-xs text-ink-3 num">{c.phone}{c.email ? ` · ${c.email}` : ""}</p>
              </div>
              <div className="text-right text-xs text-ink-3">
                <p><b className="num text-ink">{c.visits}</b> επισκέψεις{c.points ? <> · <b className="num text-accent">{c.points}</b> πόντοι</> : null}{c.noShows ? <> · <b className="num text-bad">{c.noShows}</b> no-show</> : null}</p>
                {c.tags && <p className="truncate">{c.tags.split(",").map((t) => `#${t.trim()}`).join(" ")}</p>}
              </div>
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}
