"use server";

import { redirect } from "next/navigation";
import { BookingError, createGuestReservation, guestBookingSchema } from "@/lib/booking";
import { sendReservationEmail } from "@/lib/notify";

export type BookingState = {
  error?: string;
  fieldErrors?: Record<string, string>;
  /** Submitted values, echoed back so the form can re-seed its inputs after an error. */
  values?: Record<string, string>;
};

function stringValues(raw: Record<string, FormDataEntryValue>) {
  const out: Record<string, string> = {};
  for (const [k, v] of Object.entries(raw)) {
    if (typeof v === "string" && !k.startsWith("$")) out[k] = v;
  }
  return out;
}

export async function bookAction(
  _prev: BookingState,
  formData: FormData,
): Promise<BookingState> {
  const raw = Object.fromEntries(formData.entries());
  const parsed = guestBookingSchema.safeParse(raw);
  if (!parsed.success) {
    const fieldErrors: Record<string, string> = {};
    for (const issue of parsed.error.issues) {
      const key = String(issue.path[0] ?? "form");
      if (!fieldErrors[key]) fieldErrors[key] = issue.message;
    }
    return { fieldErrors, error: "Ελέγξτε τα στοιχεία της φόρμας.", values: stringValues(raw) };
  }

  let reservation;
  try {
    reservation = await createGuestReservation(parsed.data);
  } catch (err) {
    if (err instanceof BookingError) return { error: err.message, values: stringValues(raw) };
    console.error(err);
    return { error: "Κάτι πήγε στραβά. Δοκιμάστε ξανά σε λίγο.", values: stringValues(raw) };
  }

  // Don't fail the booking if email delivery has a problem.
  sendReservationEmail(reservation).catch((e) => console.error("[mail]", e));

  redirect(`/r/${reservation.code}?t=${reservation.manageToken}&new=1`);
}
