import { redirect } from "next/navigation";
import { myVenues } from "@/lib/venue-access";

// Landing for /admin: jump straight into the user's venue.
export default async function AdminIndex() {
  const { memberships } = await myVenues();
  if (memberships.length === 1) redirect(`/admin/${memberships[0].venue.slug}`);
  return null;
}
