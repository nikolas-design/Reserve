import { type NextRequest } from "next/server";
import { computeSlots, loadDayContext, upcomingDays } from "@/lib/availability";
import { SERVICE_ID, checkBasicAuth } from "@/lib/google-reserve";
import { prisma } from "@/lib/prisma";

// Feed JSON for Reserve with Google (merchants, services, availability).
// Download and upload to the Actions Center SFTP, or point a scheduled job here.
export async function GET(request: NextRequest, ctx: RouteContext<"/api/google/feeds/[feed]">) {
  if (!checkBasicAuth(request.headers.get("authorization"))) return new Response("Unauthorized", { status: 401 });
  const { feed } = await ctx.params;
  const venues = await prisma.venue.findMany({ include: { shifts: { where: { isActive: true, isOnlineBookable: true } } } });
  const generation_timestamp = Math.floor(Date.now() / 1000);

  if (feed === "merchants") {
    return Response.json({
      metadata: { generation_timestamp, processing_instruction: "PROCESS_AS_COMPLETE", total_shards: 1 },
      merchant: venues.map((v) => ({
        merchant_id: v.slug,
        name: v.name,
        telephone: v.phone ?? undefined,
        url: `${process.env.APP_URL ?? ""}/${v.slug}`,
        category: "restaurant",
        geo: v.address ? { address: { locality: v.city ?? "", country: "GR", street_address: v.address } } : undefined,
      })),
    });
  }
  if (feed === "services") {
    return Response.json({
      metadata: { generation_timestamp, processing_instruction: "PROCESS_AS_COMPLETE", total_shards: 1 },
      service: venues.map((v) => ({
        merchant_id: v.slug,
        service_id: SERVICE_ID,
        localized_service_name: { value: "Κράτηση τραπεζιού", localized_value: [{ locale: "el", value: "Κράτηση τραπεζιού" }, { locale: "en", value: "Table reservation" }] },
        prepayment_type: "NOT_SUPPORTED",
        tax_rate: { micro_percent: 0 },
        rules: { admission_policy: "TIME_STRICT" },
        type: "SERVICE_TYPE_DINING_RESERVATION",
      })),
    });
  }
  if (feed === "availability") {
    const service_availability = [];
    for (const v of venues) {
      const availability = [];
      for (const day of upcomingDays(v, v.shifts, 30)) {
        const ctx = await loadDayContext(v.id, day);
        for (let party = v.minPartyOnline; party <= v.maxPartyOnline; party++) {
          for (const s of computeSlots(ctx, day, party, { onlineOnly: true })) {
            if (!s.available) continue;
            availability.push({
              merchant_id: v.slug,
              service_id: SERVICE_ID,
              start_sec: Math.floor(s.startAt.getTime() / 1000),
              duration_sec: Math.floor((s.endAt.getTime() - s.startAt.getTime()) / 1000),
              spots_total: 1,
              spots_open: 1,
              resources: { party_size: party },
            });
          }
        }
      }
      service_availability.push({ availability });
    }
    return Response.json({ metadata: { generation_timestamp, processing_instruction: "PROCESS_AS_COMPLETE", total_shards: 1 }, service_availability });
  }
  return new Response("Unknown feed", { status: 404 });
}
