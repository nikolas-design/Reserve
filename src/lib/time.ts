// Date/time helpers. All venue times are wall-clock strings ("HH:MM", "YYYY-MM-DD")
// interpreted in the venue's IANA timezone; instants are stored as UTC DateTimes.

export function pad(n: number): string {
  return n < 10 ? `0${n}` : String(n);
}

/** "HH:MM" -> minutes since midnight */
export function hmToMinutes(hm: string): number {
  const [h, m] = hm.split(":").map(Number);
  return h * 60 + (m || 0);
}

/** minutes since midnight -> "HH:MM" */
export function minutesToHm(min: number): string {
  const m = ((min % 1440) + 1440) % 1440;
  return `${pad(Math.floor(m / 60))}:${pad(m % 60)}`;
}

/** Offset (minutes) of `timeZone` from UTC at the given instant. */
export function tzOffsetMinutes(date: Date, timeZone: string): number {
  const dtf = new Intl.DateTimeFormat("en-US", {
    timeZone,
    hourCycle: "h23",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  });
  const parts = Object.fromEntries(
    dtf.formatToParts(date).map((p) => [p.type, p.value]),
  );
  const asUtc = Date.UTC(
    Number(parts.year),
    Number(parts.month) - 1,
    Number(parts.day),
    Number(parts.hour),
    Number(parts.minute),
    Number(parts.second),
  );
  return (asUtc - date.getTime()) / 60000;
}

/** Build the UTC instant for a local wall-clock time in `timeZone`. */
export function zonedToUtc(
  ymd: string,
  hm: string,
  timeZone: string,
): Date {
  const [y, mo, d] = ymd.split("-").map(Number);
  const [h, mi] = hm.split(":").map(Number);
  const guess = new Date(Date.UTC(y, mo - 1, d, h, mi));
  // Two passes handle DST edges well enough for a booking grid.
  const off1 = tzOffsetMinutes(guess, timeZone);
  const adjusted = new Date(guess.getTime() - off1 * 60000);
  const off2 = tzOffsetMinutes(adjusted, timeZone);
  return off1 === off2
    ? adjusted
    : new Date(guess.getTime() - off2 * 60000);
}

/** UTC instant -> { ymd, hm, dow } in `timeZone`. */
export function utcToZoned(date: Date, timeZone: string) {
  const dtf = new Intl.DateTimeFormat("en-US", {
    timeZone,
    hourCycle: "h23",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    weekday: "short",
  });
  const p = Object.fromEntries(
    dtf.formatToParts(date).map((x) => [x.type, x.value]),
  );
  const dow = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].indexOf(
    p.weekday,
  );
  return {
    ymd: `${p.year}-${p.month}-${p.day}`,
    hm: `${p.hour}:${p.minute}`,
    dow,
  };
}

/** Today's "YYYY-MM-DD" in `timeZone`. */
export function todayYmd(timeZone: string, now = new Date()): string {
  return utcToZoned(now, timeZone).ymd;
}

/** Add `days` to a "YYYY-MM-DD" string. */
export function addDaysYmd(ymd: string, days: number): string {
  const [y, m, d] = ymd.split("-").map(Number);
  const dt = new Date(Date.UTC(y, m - 1, d + days));
  return `${dt.getUTCFullYear()}-${pad(dt.getUTCMonth() + 1)}-${pad(dt.getUTCDate())}`;
}

/** Day of week (0 = Sunday) for a "YYYY-MM-DD" string. */
export function dowOfYmd(ymd: string): number {
  const [y, m, d] = ymd.split("-").map(Number);
  return new Date(Date.UTC(y, m - 1, d)).getUTCDay();
}

const GREEK_DAYS = ["Κυρ", "Δευ", "Τρί", "Τετ", "Πέμ", "Παρ", "Σάβ"];
const GREEK_DAYS_LONG = [
  "Κυριακή",
  "Δευτέρα",
  "Τρίτη",
  "Τετάρτη",
  "Πέμπτη",
  "Παρασκευή",
  "Σάββατο",
];
const GREEK_MONTHS_GEN = [
  "Ιανουαρίου",
  "Φεβρουαρίου",
  "Μαρτίου",
  "Απριλίου",
  "Μαΐου",
  "Ιουνίου",
  "Ιουλίου",
  "Αυγούστου",
  "Σεπτεμβρίου",
  "Οκτωβρίου",
  "Νοεμβρίου",
  "Δεκεμβρίου",
];

export function formatYmdShort(ymd: string): string {
  const [, m, d] = ymd.split("-").map(Number);
  return `${GREEK_DAYS[dowOfYmd(ymd)]} ${d}/${m}`;
}

export function formatYmdLong(ymd: string): string {
  const [, m, d] = ymd.split("-").map(Number);
  return `${GREEK_DAYS_LONG[dowOfYmd(ymd)]} ${d} ${GREEK_MONTHS_GEN[m - 1]}`;
}

export function dayChip(ymd: string): { dow: string; day: number } {
  return { dow: GREEK_DAYS[dowOfYmd(ymd)], day: Number(ymd.split("-")[2]) };
}
