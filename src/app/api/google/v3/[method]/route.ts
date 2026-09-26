import { type NextRequest } from "next/server";
import {
  batchAvailabilityLookup,
  checkAvailability,
  checkBasicAuth,
  createBooking,
  getBookingStatus,
  listBookings,
  updateBooking,
} from "@/lib/google-reserve";

// Reserve with Google booking server, API v3.
// Point the partner portal at https://YOUR-DOMAIN/api/google/v3
export async function POST(request: NextRequest, ctx: RouteContext<"/api/google/v3/[method]">) {
  if (!checkBasicAuth(request.headers.get("authorization"))) {
    return new Response("Unauthorized", { status: 401, headers: { "WWW-Authenticate": "Basic" } });
  }
  const { method } = await ctx.params;
  let body: Record<string, unknown> = {};
  try {
    const text = await request.text();
    body = text ? JSON.parse(text) : {};
  } catch {
    return Response.json({ error: "invalid json" }, { status: 400 });
  }

  try {
    switch (method) {
      case "HealthCheck":
        return new Response(null, { status: 200 });
      case "BatchAvailabilityLookup":
        return Response.json(await batchAvailabilityLookup(String(body.merchant_id ?? ""), (body.slot_time as never[]) ?? []));
      case "CheckAvailability":
        return Response.json(await checkAvailability(body.slot as never));
      case "CreateBooking":
        return Response.json(await createBooking(body as never));
      case "UpdateBooking":
        return Response.json(await updateBooking(body as never));
      case "GetBookingStatus": {
        const r = await getBookingStatus(String(body.booking_id ?? ""));
        return r ? Response.json(r) : Response.json({ error: "not found" }, { status: 404 });
      }
      case "ListBookings":
        return Response.json(await listBookings(String(body.user_id ?? "")));
      default:
        return Response.json({ error: "unknown method" }, { status: 404 });
    }
  } catch (e) {
    console.error("[google-reserve]", method, e);
    return Response.json({ error: "internal" }, { status: 500 });
  }
}

export async function GET(request: NextRequest, ctx: RouteContext<"/api/google/v3/[method]">) {
  const { method } = await ctx.params;
  if (method === "HealthCheck") return new Response(null, { status: 200 });
  return new Response("Use POST", { status: 405 });
}
