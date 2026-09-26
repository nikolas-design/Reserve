// String "enums" shared by the Prisma schema, server code and UI.

export const RESERVATION_STATUS = {
  PENDING: "PENDING",
  CONFIRMED: "CONFIRMED",
  SEATED: "SEATED",
  COMPLETED: "COMPLETED",
  CANCELLED: "CANCELLED",
  NO_SHOW: "NO_SHOW",
} as const;
export type ReservationStatus =
  (typeof RESERVATION_STATUS)[keyof typeof RESERVATION_STATUS];

/** Statuses that hold a table (count against availability). */
export const ACTIVE_STATUSES: ReservationStatus[] = [
  RESERVATION_STATUS.PENDING,
  RESERVATION_STATUS.CONFIRMED,
  RESERVATION_STATUS.SEATED,
];

export const RESERVATION_SOURCE = {
  WEBSITE: "WEBSITE",
  PHONE: "PHONE",
  WALK_IN: "WALK_IN",
  INSTAGRAM: "INSTAGRAM",
  GOOGLE: "GOOGLE",
  OTHER: "OTHER",
} as const;
export type ReservationSource =
  (typeof RESERVATION_SOURCE)[keyof typeof RESERVATION_SOURCE];

export const MEMBER_ROLE = {
  OWNER: "OWNER",
  MANAGER: "MANAGER",
  HOST: "HOST",
} as const;
export type MemberRole = (typeof MEMBER_ROLE)[keyof typeof MEMBER_ROLE];

export const WAITLIST_STATUS = {
  WAITING: "WAITING",
  NOTIFIED: "NOTIFIED",
  SEATED: "SEATED",
  LEFT: "LEFT",
} as const;

export const OCCASIONS = [
  { value: "birthday", label: "Γενέθλια" },
  { value: "anniversary", label: "Επέτειος" },
  { value: "business", label: "Επαγγελματικό" },
  { value: "date", label: "Ραντεβού" },
  { value: "celebration", label: "Γιορτή" },
] as const;

export const STATUS_LABEL: Record<ReservationStatus, string> = {
  PENDING: "Αναμονή",
  CONFIRMED: "Επιβεβαιωμένη",
  SEATED: "Κάθεται",
  COMPLETED: "Ολοκληρώθηκε",
  CANCELLED: "Ακυρώθηκε",
  NO_SHOW: "No-show",
};

export const SOURCE_LABEL: Record<ReservationSource, string> = {
  WEBSITE: "Website",
  PHONE: "Τηλέφωνο",
  WALK_IN: "Walk-in",
  INSTAGRAM: "Instagram",
  GOOGLE: "Google",
  OTHER: "Άλλο",
};
