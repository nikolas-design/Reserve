import QRCode from "qrcode";
import { appUrl } from "@/lib/notify";
import { requireUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET(req: Request, ctx: RouteContext<"/admin/[slug]/share/qr.svg">) {
  const { slug } = await ctx.params;
  const user = await requireUser();
  if (!user) return new Response("Unauthorized", { status: 401 });
  const ok = await prisma.venueMember.findFirst({ where: { userId: user.id, venue: { slug } } });
  if (!ok) return new Response("Forbidden", { status: 403 });
  const menuTable = new URL(req.url).searchParams.get("menu");
  const target = menuTable ? `${appUrl()}/m/${slug}?t=${encodeURIComponent(menuTable)}` : `${appUrl()}/${slug}?channel=qr`;
  const svg = await QRCode.toString(target, { type: "svg", margin: 2, width: 1024 });
  return new Response(svg, { headers: { "Content-Type": "image/svg+xml", "Content-Disposition": `attachment; filename="${slug}-qr.svg"` } });
}
