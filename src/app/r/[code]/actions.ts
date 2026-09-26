"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { cancelReservation, canGuestCancel } from "@/lib/booking";
import { sendCancellationEmail } from "@/lib/notify";
import { prisma } from "@/lib/prisma";

export type CancelState = { error?: string };

export async function cancelAction(_prev: CancelState, formData: FormData): Promise<CancelState> {
  const code = String(formData.get("code") ?? "");
  const token = String(formData.get("t") ?? "");
  const r = await prisma.reservation.findUnique({
    where: { code },
    include: { venue: true, customer: true },
  });
  if (!r || r.manageToken !== token) return { error: "Η κράτηση δεν βρέθηκε." };
  if (!canGuestCancel(r, r.venue)) {
    return { error: "Η online ακύρωση δεν είναι πλέον διαθέσιμη. Καλέστε μας." };
  }
  await cancelReservation(r.id, "guest");
  sendCancellationEmail(r).catch((e) => console.error("[mail]", e));
  revalidatePath(`/r/${code}`);
  redirect(`/r/${code}?t=${token}`);
}
