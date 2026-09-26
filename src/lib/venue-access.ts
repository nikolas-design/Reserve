import { redirect } from "next/navigation";
import { requireUser } from "./auth";
import { prisma } from "./prisma";

/** Venues the signed-in user can manage. Redirects to /login when signed out. */
export async function myVenues() {
  const user = await requireUser();
  if (!user) redirect("/login");
  const memberships = await prisma.venueMember.findMany({
    where: { userId: user.id },
    include: { venue: true },
    orderBy: { venue: { name: "asc" } },
  });
  return { user, memberships };
}

/** Venue by slug, only if the signed-in user is a member. */
export async function myVenue(slug: string) {
  const user = await requireUser();
  if (!user) redirect("/login");
  const membership = await prisma.venueMember.findFirst({
    where: { userId: user.id, venue: { slug } },
    include: { venue: true },
  });
  if (!membership) redirect("/admin");
  return { user, venue: membership.venue, role: membership.role };
}
