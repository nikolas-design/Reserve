import Link from "next/link";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export default async function Home() {
  const venues = await prisma.venue.findMany({
    orderBy: { name: "asc" },
    select: { slug: true, name: true, city: true, tagline: true, logoText: true },
  });

  return (
    <div className="flex-1 px-4 py-10">
      <div className="mx-auto max-w-3xl flex flex-col gap-8">
        <header className="flex items-center gap-3">
          <span className="grid h-10 w-10 place-items-center rounded-2xl bg-gradient-to-br from-accent to-[#7ce7ff] font-display text-lg font-extrabold text-white">
            R
          </span>
          <span className="font-display text-2xl font-extrabold">Reserve</span>
          <Link href="/admin" className="btn-ghost ml-auto">
            Είσοδος καταστήματος
          </Link>
        </header>

        <section className="flex flex-col gap-3">
          <h1 className="text-3xl font-bold">Κλείστε τραπέζι online</h1>
          <p className="text-ink-2 max-w-[60ch]">
            Επιλέξτε κατάστημα, μέρα, ώρα και άτομα. Χωρίς λογαριασμό, χωρίς
            τηλέφωνα.
          </p>
        </section>

        <ul className="grid gap-3 sm:grid-cols-2">
          {venues.map((v) => (
            <li key={v.slug}>
              <Link
                href={`/${v.slug}`}
                className="card flex items-center gap-4 p-4 transition-shadow hover:shadow-[var(--shadow)]"
              >
                <span className="grid h-12 w-12 shrink-0 place-items-center rounded-2xl bg-accent-soft font-display font-extrabold text-accent">
                  {v.logoText ?? v.name.slice(0, 2).toUpperCase()}
                </span>
                <span className="min-w-0">
                  <span className="block font-display font-bold">{v.name}</span>
                  <span className="block truncate text-sm text-ink-3">
                    {[v.city, v.tagline].filter(Boolean).join(" · ")}
                  </span>
                </span>
              </Link>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
