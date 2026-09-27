import { type NextRequest } from "next/server";
import { runBirthdays, runReminders, runReviewRequests } from "@/lib/reminders";

// GET /api/cron/reminders  (Authorization: Bearer $CRON_SECRET)
// Schedule it every 15 minutes (see vercel.json).
export async function GET(request: NextRequest) {
  const secret = process.env.CRON_SECRET;
  const auth = request.headers.get("authorization") ?? "";
  // ?key= lets simple schedulers (Plesk "Fetch a URL") authenticate without headers.
  const key = request.nextUrl.searchParams.get("key");
  if (secret && auth !== `Bearer ${secret}` && key !== secret) return new Response("Unauthorized", { status: 401 });
  if (!secret && process.env.NODE_ENV === "production") return new Response("CRON_SECRET not set", { status: 500 });
  const summary = await runReminders();
  const reviewsRequested = await runReviewRequests();
  const birthdays = await runBirthdays();
  return Response.json({ ok: true, ...summary, reviewsRequested, birthdays, at: new Date().toISOString() });
}
