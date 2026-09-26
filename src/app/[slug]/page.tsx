import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { computeSlots, loadDayContext, upcomingDays } from "@/lib/availability";
import { prisma } from "@/lib/prisma";
import { BookingWidget } from "./booking-widget";

export const dynamic = "force-dynamic";

async function getVenue(slug: string) {
  return prisma.venue.findUnique({
    where: { slug },
    include: {
      areas: { where: { isOnlineBookable: true }, orderBy: { sortOrder: "asc" } },
      shifts: { where: { isActive: true } },
    },
  });
}

export async function generateMetadata({ params }: PageProps<"/[slug]">): Promise<Metadata> {
  const { slug } = await params;
  const venue = await prisma.venue.findUnique({ where: { slug }, select: { name: true, tagline: true } });
  if (!venue) return {};
  return { title: `Κράτηση · ${venue.name}`, description: venue.tagline ?? undefined };
}

export default async function VenueBookingPage({ params }: PageProps<"/[slug]">) {
  const { slug } = await params;
  const venue = await getVenue(slug);
  if (!venue) notFound();

  const days = upcomingDays(venue, venue.shifts, 14);
  const firstDay = days[0];
  const defaultParty = 2;
  const initialSlots = firstDay
    ? computeSlots(await loadDayContext(venue.id, firstDay), firstDay, defaultParty, {
        onlineOnly: true,
      }).map((s) => ({ hm: s.hm, shift: s.shiftName, available: s.available, reason: s.reason ?? null }))
    : [];

  return (
    <div className="flex-1 px-4 py-6 sm:py-10">
      <div className="mx-auto w-full max-w-md">
        <div className="card overflow-hidden shadow-[var(--shadow)] sm:rounded-[36px]">
          <div
            className="relative h-36"
            style={{
              background: `linear-gradient(120deg, #0b1220 0%, ${venue.brandColor} 60%, #7ce7ff 100%)`,
            }}
          >
            <span className="absolute -bottom-6 left-5 grid h-14 w-14 place-items-center rounded-[18px] border border-line bg-surface font-display text-lg font-extrabold text-accent">
              {venue.logoText ?? venue.name.slice(0, 2).toUpperCase()}
            </span>
          </div>
          <div className="flex flex-col gap-5 px-5 pb-6 pt-9">
            <header>
              <h1 className="text-xl font-bold">{venue.name}</h1>
              <p className="mt-0.5 text-sm text-ink-3">
                {[venue.city, venue.tagline].filter(Boolean).join(" · ")}
              </p>
            </header>

            <BookingWidget
              venue={{
                slug: venue.slug,
                name: venue.name,
                phone: venue.phone,
                minParty: venue.minPartyOnline,
                maxParty: venue.maxPartyOnline,
                depositEnabled: venue.depositEnabled,
                depositPerPersonCents: venue.depositPerPersonCents,
                depositFromPartySize: venue.depositFromPartySize,
                cancellationHours: venue.cancellationHours,
                termsText: venue.termsText,
              }}
              areas={venue.areas.map((a) => ({ id: a.id, name: a.name }))}
              days={days}
              initialDate={firstDay ?? null}
              initialParty={defaultParty}
              initialSlots={initialSlots}
            />
          </div>
        </div>
        <p className="mt-4 text-center text-xs text-ink-3">
          Powered by <span className="font-display font-bold text-ink-2">Reserve</span>
        </p>
      </div>
    </div>
  );
}
