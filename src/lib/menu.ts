// Menu & ordering helpers shared by the guest menu and the admin.

import { prisma } from "./prisma";

export const ORDER_STATUS = {
  NEW: "NEW",
  ACCEPTED: "ACCEPTED",
  READY: "READY",
  SERVED: "SERVED",
  CANCELLED: "CANCELLED",
} as const;
export type OrderStatus = (typeof ORDER_STATUS)[keyof typeof ORDER_STATUS];

export const ORDER_STATUS_LABEL: Record<OrderStatus, string> = {
  NEW: "Νέα",
  ACCEPTED: "Σε εξέλιξη",
  READY: "Έτοιμη",
  SERVED: "Σερβιρίστηκε",
  CANCELLED: "Ακυρώθηκε",
};

export const MENU_TAGS: Record<string, string> = {
  vegan: "🌱 vegan",
  vegetarian: "🥬 χορτοφαγικό",
  "gluten-free": "🌾 χωρίς γλουτένη",
  spicy: "🌶 καυτερό",
  new: "✨ νέο",
  popular: "⭐ δημοφιλές",
};

export function euro(cents: number) {
  return `${(cents / 100).toFixed(2).replace(".", ",")} €`;
}

export async function loadMenu(venueId: string, includeUnavailable = false) {
  return prisma.menuCategory.findMany({
    where: { venueId, ...(includeUnavailable ? {} : { isActive: true }) },
    orderBy: { sortOrder: "asc" },
    include: {
      items: {
        where: includeUnavailable ? {} : { isAvailable: true },
        orderBy: { sortOrder: "asc" },
      },
    },
  });
}

/** Next order number for a venue: 1, 2, 3… resetting when a new day starts. */
export async function nextOrderNumber(venueId: string) {
  const since = new Date(Date.now() - 20 * 3600_000);
  const last = await prisma.order.findFirst({
    where: { venueId, createdAt: { gte: since } },
    orderBy: { number: "desc" },
    select: { number: true },
  });
  return (last?.number ?? 0) + 1;
}
