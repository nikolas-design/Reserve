"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";

export type ReviewState = { error?: string };

const REVIEW_BONUS_POINTS = 5;

export async function submitReview(_prev: ReviewState, formData: FormData): Promise<ReviewState> {
  const code = String(formData.get("code") ?? "");
  const token = String(formData.get("t") ?? "");
  const rating = Number(formData.get("rating"));
  const comment = String(formData.get("comment") ?? "").trim().slice(0, 600) || null;
  if (!Number.isInteger(rating) || rating < 1 || rating > 5) return { error: "Επιλέξτε αστέρια." };

  const r = await prisma.reservation.findUnique({ where: { code }, include: { venue: true, review: true } });
  if (!r || r.manageToken !== token) return { error: "Η κράτηση δεν βρέθηκε." };
  if (r.review) return {};
  if (!["SEATED", "COMPLETED"].includes(r.status)) return { error: "Η αξιολόγηση ανοίγει μετά την επίσκεψη." };

  await prisma.$transaction([
    prisma.review.create({ data: { venueId: r.venueId, customerId: r.customerId, reservationId: r.id, rating, comment } }),
    ...(r.venue.loyaltyEnabled ? [prisma.customer.update({ where: { id: r.customerId }, data: { points: { increment: REVIEW_BONUS_POINTS } } })] : []),
  ]);
  revalidatePath(`/review/${code}`);
  redirect(`/review/${code}?t=${token}`);
}
