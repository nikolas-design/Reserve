import { myVenue } from "@/lib/venue-access";

export default async function VenueToday({ params }: PageProps<"/admin/[slug]">) {
  const { slug } = await params;
  const { venue, user } = await myVenue(slug);
  return (
    <div className="px-4 py-10">
      <div className="mx-auto max-w-5xl">
        <h1 className="text-2xl font-bold">{venue.name}</h1>
        <p className="text-ink-3">Συνδεδεμένος ως {user.name}. Το admin έρχεται στο Βήμα 3.</p>
      </div>
    </div>
  );
}
