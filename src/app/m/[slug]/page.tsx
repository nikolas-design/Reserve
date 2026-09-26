import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { loadMenu } from "@/lib/menu";
import { prisma } from "@/lib/prisma";
import { MenuClient } from "./menu-client";

export const dynamic = "force-dynamic";

export async function generateMetadata({ params }: PageProps<"/m/[slug]">): Promise<Metadata> {
  const { slug } = await params;
  const v = await prisma.venue.findUnique({ where: { slug }, select: { name: true } });
  return { title: v ? `Μενού · ${v.name}` : "Μενού" };
}

// Guest QR menu: /m/[slug]?t=T4
export default async function MenuPage({ params, searchParams }: PageProps<"/m/[slug]">) {
  const { slug } = await params;
  const sp = await searchParams;
  const venue = await prisma.venue.findUnique({ where: { slug } });
  if (!venue) notFound();
  const tableName = typeof sp.t === "string" ? sp.t.slice(0, 8) : null;
  const table = tableName ? await prisma.table.findUnique({ where: { venueId_name: { venueId: venue.id, name: tableName } } }) : null;
  const categories = await loadMenu(venue.id);

  return (
    <div className="flex-1 px-4 py-6">
      <div className="mx-auto w-full max-w-md flex flex-col gap-4">
        <header className="flex items-center gap-3">
          <span className="grid h-12 w-12 place-items-center rounded-[16px] font-display font-extrabold text-white" style={{ background: venue.brandColor }}>
            {venue.logoText ?? venue.name.slice(0, 2).toUpperCase()}
          </span>
          <div className="min-w-0">
            <h1 className="text-lg font-bold">{venue.name}</h1>
            <p className="text-xs text-ink-3">{table ? `Τραπέζι ${table.name}` : "Μενού"}{venue.orderingEnabled && table ? " · παραγγείλτε από εδώ" : ""}</p>
          </div>
        </header>
        <MenuClient
          slug={venue.slug}
          orderingEnabled={venue.orderingEnabled && Boolean(table)}
          tableName={table?.name ?? null}
          brandColor={venue.brandColor}
          categories={categories.map((c) => ({
            id: c.id,
            name: c.name,
            items: c.items.map((i) => ({ id: i.id, name: i.name, description: i.description, priceCents: i.priceCents, tags: i.tags ? i.tags.split(",") : [] })),
          }))}
        />
      </div>
    </div>
  );
}
