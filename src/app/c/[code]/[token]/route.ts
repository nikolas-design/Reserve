import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";

// One-tap "yes, I'm coming" link from reminders. GET so it works from SMS.
export async function GET(_req: Request, ctx: RouteContext<"/c/[code]/[token]">) {
  const { code, token } = await ctx.params;
  const r = await prisma.reservation.findUnique({ where: { code } });
  if (!r || r.manageToken !== token) return new Response("Not found", { status: 404 });
  if (["CONFIRMED", "PENDING"].includes(r.status) && !r.guestConfirmedAt) {
    await prisma.reservation.update({ where: { id: r.id }, data: { guestConfirmedAt: new Date() } });
  }
  redirect(`/r/${code}?t=${token}&confirmed=1`);
}
