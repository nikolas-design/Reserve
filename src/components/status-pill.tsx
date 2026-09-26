import { STATUS_LABEL, type ReservationStatus } from "@/lib/constants";

const TONE: Record<ReservationStatus, string> = {
  PENDING: "bg-warn-soft text-warn",
  CONFIRMED: "bg-ok-soft text-ok",
  SEATED: "bg-accent-soft text-accent",
  COMPLETED: "bg-surface-2 text-ink-2",
  CANCELLED: "bg-bad-soft text-bad",
  NO_SHOW: "bg-bad-soft text-bad",
};

export function StatusPill({ status }: { status: string }) {
  const s = status as ReservationStatus;
  return <span className={`pill ${TONE[s] ?? "bg-surface-2 text-ink-2"}`}>● {STATUS_LABEL[s] ?? status}</span>;
}
