"use server";

import { redirect } from "next/navigation";
import { z } from "zod";
import { nextOrderNumber } from "@/lib/menu";
import { prisma } from "@/lib/prisma";

export type OrderState = { error?: string };

const schema = z.object({
  slug: z.string().min(1),
  table: z.string().max(8).optional().or(z.literal("")),
  guestName: z.string().trim().max(60).optional().or(z.literal("")),
  notes: z.string().trim().max(300).optional().or(z.literal("")),
  lines: z.string(),
});

export async function placeOrder(_prev: OrderState, formData: FormData): Promise<OrderState> {
  const parsed = schema.safeParse(Object.fromEntries(formData.entries()));
  if (!parsed.success) return { error: "Ελέγξτε την παραγγελία." };
  const d = parsed.data;
  let lines: { id: string; qty: number }[];
  try {
    lines = z.array(z.object({ id: z.string(), qty: z.number().int().min(1).max(50) })).min(1).parse(JSON.parse(d.lines));
  } catch {
    return { error: "Το καλάθι είναι άδειο." };
  }

  const venue = await prisma.venue.findUnique({ where: { slug: d.slug } });
  if (!venue || !venue.orderingEnabled) return { error: "Οι παραγγελίες δεν είναι διαθέσιμες." };
  const table = d.table ? await prisma.table.findUnique({ where: { venueId_name: { venueId: venue.id, name: d.table } } }) : null;
  if (!table) return { error: "Σκανάρετε ξανά τον κωδικό QR του τραπεζιού σας." };

  const items = await prisma.menuItem.findMany({ where: { venueId: venue.id, id: { in: lines.map((l) => l.id) }, isAvailable: true } });
  const byId = new Map(items.map((i) => [i.id, i]));
  const orderItems = lines.flatMap((l) => {
    const it = byId.get(l.id);
    return it ? [{ menuItemId: it.id, name: it.name, priceCents: it.priceCents, qty: l.qty }] : [];
  });
  if (!orderItems.length) return { error: "Κάποια είδη δεν είναι πλέον διαθέσιμα. Ανανεώστε τη σελίδα." };

  const order = await prisma.order.create({
    data: {
      venueId: venue.id,
      number: await nextOrderNumber(venue.id),
      tableId: table.id,
      tableName: table.name,
      guestName: d.guestName || null,
      notes: d.notes || null,
      totalCents: orderItems.reduce((n, i) => n + i.priceCents * i.qty, 0),
      items: { create: orderItems },
    },
  });
  redirect(`/m/${venue.slug}/o/${order.id}`);
}
