// Scheduled work: send reminders and auto-release unconfirmed reservations.
// Called by /api/cron/reminders (Vercel Cron or any scheduler) and by the
// admin "send reminder now" button.

import { RESERVATION_STATUS } from "./constants";
import { sendBirthdayEmail, sendCancellationEmail, sendReminder, sendReviewRequest } from "./notify";
import { utcToZoned } from "./time";
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

/** Ask for a review ~1h after the visit ended; award nothing yet (points come with the review). */
export async function runReviewRequests(now = new Date()) {
  let sent = 0;
  const venues = await prisma.venue.findMany({ where: { reviewRequestEnabled: true } });
  for (const v of venues) {
    const due = await prisma.reservation.findMany({
      where: {
        venueId: v.id,
        status: { in: ["SEATED", "COMPLETED"] },
        reviewRequestedAt: null,
        endAt: { lt: new Date(now.getTime() - 3600_000), gt: new Date(now.getTime() - 3 * 86400_000) },
        customer: { email: { not: null } },
      },
      include: { customer: true, venue: true },
      take: 200,
    });
    for (const r of due) {
      await prisma.reservation.update({ where: { id: r.id }, data: { reviewRequestedAt: now } });
      try { await sendReviewRequest(r); sent++; } catch (e) { console.error("[review]", r.code, e); }
    }
  }
  return sent;
}

/** Birthday wishes once per year, on the day, in the venue's timezone. */
export async function runBirthdays(now = new Date()) {
  let sent = 0;
  const venues = await prisma.venue.findMany({ where: { birthdayGreeting: true } });
  for (const v of venues) {
    const { ymd } = utcToZoned(now, v.timezone);
    const year = Number(ymd.slice(0, 4));
    const mmdd = ymd.slice(5);
    const people = await prisma.customer.findMany({
      where: { venueId: v.id, birthday: mmdd, email: { not: null }, OR: [{ birthdayGreetedYear: null }, { birthdayGreetedYear: { lt: year } }] },
    });
    for (const c of people) {
      await prisma.customer.update({ where: { id: c.id }, data: { birthdayGreetedYear: year } });
      try { await sendBirthdayEmail(c, v); sent++; } catch (e) { console.error("[birthday]", c.id, e); }
    }
  }
  return sent;
}
