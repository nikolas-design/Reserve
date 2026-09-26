import { type NextRequest } from "next/server";
import { runReminders } from "@/lib/reminders";

// GET /api/cron/reminders  (Authorization: Bearer $CRON_SECRET)
// Schedule it every 15 minutes (see vercel.json).
export async function GET(request: NextRequest) {
  const secret = process.env.CRON_SECRET;
  const auth = request.headers.get("authorization") ?? "";
  if (secret && auth !== `Bearer ${secret}`) return new Response("Unauthorized", { status: 401 });
  if (!secret && process.env.NODE_ENV === "production") return new Response("CRON_SECRET not set", { status: 500 });
  const summary = await runReminders();
  return Response.json({ ok: true, ...summary, at: new Date().toISOString() });
}
