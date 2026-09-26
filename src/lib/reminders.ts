// Scheduled work: send reminders and auto-release unconfirmed reservations.
// Called by /api/cron/reminders (Vercel Cron or any scheduler) and by the
// admin "send reminder now" button.

import { RESERVATION_STATUS } from "./constants";
import { sendCancellationEmail, sendReminder } from "./notify";
import { prisma } from "./prisma";

export async function runReminders(now = new Date()) {
  const venues = await prisma.venue.findMany({ where: { OR: [{ reminderEnabled: true }, { autoReleaseEnabled: true }] } });
  const summary = { reminded: 0, released: 0, failed: 0 };

  for (const v of venues) {
    if (v.reminderEnabled) {
      const until = new Date(now.getTime() + v.reminderHoursBefore * 3600_000);
      const due = await prisma.reservation.findMany({
        where: {
          venueId: v.id,
          status: RESERVATION_STATUS.CONFIRMED,
          reminderSentAt: null,
          guestConfirmedAt: null,
          startAt: { gt: now, lte: until },
          // Don't remind for reservations made moments ago.
          createdAt: { lt: new Date(now.getTime() - 15 * 60_000) },
        },
        include: { customer: true, venue: true },
      });
      for (const r of due) {
        try {
          await sendReminder(r);
          summary.reminded++;
        } catch (e) {
          summary.failed++;
          console.error("[reminder]", r.code, e);
        }
      }
    }

    if (v.autoReleaseEnabled) {
      const cutoff = new Date(now.getTime() + v.autoReleaseHoursBefore * 3600_000);
      const stale = await prisma.reservation.findMany({
        where: {
          venueId: v.id,
          status: RESERVATION_STATUS.CONFIRMED,
          source: { in: ["WEBSITE", "INSTAGRAM", "GOOGLE"] }, // only self-service bookings
          guestConfirmedAt: null,
          reminderSentAt: { not: null }, // they were asked
          startAt: { gt: now, lte: cutoff },
        },
        include: { customer: true, venue: true },
      });
      for (const r of stale) {
        await prisma.reservation.update({
          where: { id: r.id },
          data: { status: RESERVATION_STATUS.CANCELLED, cancelledAt: now, releasedAt: now, internalNotes: "Αυτόματη ακύρωση: ο πελάτης δεν επιβεβαίωσε" },
        });
        sendCancellationEmail(r, "release").catch((e) => console.error("[mail]", e));
        summary.released++;
      }
    }
  }
  return summary;
}
