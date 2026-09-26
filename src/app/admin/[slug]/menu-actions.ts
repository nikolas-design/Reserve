"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { requireVenueAccess } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export type ActionState = { error?: string; ok?: boolean };

async function guard(venueId: string) {
  const access = await requireVenueAccess(venueId);
  if (!access) throw new Error("Unauthorized");
  return access;
}

async function refresh(venueId: string) {
  const v = await prisma.venue.findUniqueOrThrow({ where: { id: venueId } });
  revalidatePath(`/admin/${v.slug}`, "layout");
  revalidatePath(`/m/${v.slug}`);
}

export async function setOrderStatus(formData: FormData): Promise<void> {
  const id = String(formData.get("id"));
  const status = String(formData.get("status"));
  const o = await prisma.order.findUniqueOrThrow({ where: { id } });
  await guard(o.venueId);
  if (!["ACCEPTED", "READY", "SERVED", "CANCELLED"].includes(status)) return;
  await prisma.order.update({ where: { id }, data: { status } });
  await refresh(o.venueId);
}

export async function saveCategory(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const venueId = String(formData.get("venueId"));
  const id = String(formData.get("id") ?? "");
  const name = String(formData.get("name") ?? "").trim();
  if (!name) return { error: "Όνομα κατηγορίας;" };
  await guard(venueId);
  if (id) await prisma.menuCategory.update({ where: { id }, data: { name, isActive: formData.get("isActive") === "on" } });
  else {
    const count = await prisma.menuCategory.count({ where: { venueId } });
    await prisma.menuCategory.create({ data: { venueId, name, sortOrder: count } });
  }
  await refresh(venueId);
  return { ok: true };
}

export async function deleteCategory(formData: FormData): Promise<void> {
  const id = String(formData.get("id"));
  const c = await prisma.menuCategory.findUniqueOrThrow({ where: { id } });
  await guard(c.venueId);
  await prisma.menuCategory.delete({ where: { id } });
  await refresh(c.venueId);
}

const itemSchema = z.object({
  id: z.string().optional().or(z.literal("")),
  venueId: z.string(),
  categoryId: z.string(),
  name: z.string().trim().min(1).max(80),
  description: z.string().trim().max(300).optional().or(z.literal("")),
  price: z.coerce.number().min(0).max(10000),
  tags: z.string().optional().or(z.literal("")),
  isAvailable: z.string().optional(),
});

export async function saveItem(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const raw = Object.fromEntries(formData.entries());
  raw.tags = formData.getAll("tags").join(",");
  const parsed = itemSchema.safeParse(raw);
  if (!parsed.success) return { error: "Ελέγξτε όνομα και τιμή." };
  const d = parsed.data;
  await guard(d.venueId);
  const data = { categoryId: d.categoryId, name: d.name, description: d.description || null, priceCents: Math.round(d.price * 100), tags: d.tags || null, isAvailable: d.isAvailable === "on" };
  if (d.id) await prisma.menuItem.update({ where: { id: d.id }, data });
  else {
    const count = await prisma.menuItem.count({ where: { categoryId: d.categoryId } });
    await prisma.menuItem.create({ data: { venueId: d.venueId, ...data, sortOrder: count } });
  }
  await refresh(d.venueId);
  return { ok: true };
}

export async function toggleItem(formData: FormData): Promise<void> {
  const id = String(formData.get("id"));
  const it = await prisma.menuItem.findUniqueOrThrow({ where: { id } });
  await guard(it.venueId);
  await prisma.menuItem.update({ where: { id }, data: { isAvailable: !it.isAvailable } });
  await refresh(it.venueId);
}

export async function deleteItem(formData: FormData): Promise<void> {
  const id = String(formData.get("id"));
  const it = await prisma.menuItem.findUniqueOrThrow({ where: { id } });
  await guard(it.venueId);
  await prisma.menuItem.delete({ where: { id } });
  await refresh(it.venueId);
}

export async function toggleOrdering(formData: FormData): Promise<void> {
  const venueId = String(formData.get("venueId"));
  await guard(venueId);
  const v = await prisma.venue.findUniqueOrThrow({ where: { id: venueId } });
  await prisma.venue.update({ where: { id: venueId }, data: { orderingEnabled: !v.orderingEnabled } });
  await refresh(venueId);
}
