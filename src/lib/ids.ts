import { randomBytes } from "node:crypto";

// No 0/O/1/I so codes read cleanly over the phone.
const ALPHABET = "23456789ABCDEFGHJKLMNPQRSTUVWXYZ";

export function shortCode(len = 5): string {
  const bytes = randomBytes(len);
  let out = "";
  for (let i = 0; i < len; i++) out += ALPHABET[bytes[i] % ALPHABET.length];
  return out;
}

export function reservationCode(): string {
  return `RSV-${shortCode(5)}`;
}

export function secretToken(): string {
  return randomBytes(24).toString("base64url");
}

/** Normalize Greek/intl phone numbers to a stable key: digits only, with country code. */
export function normalizePhone(raw: string): string {
  let digits = raw.replace(/[^\d+]/g, "");
  if (digits.startsWith("00")) digits = `+${digits.slice(2)}`;
  if (!digits.startsWith("+")) {
    // Greek mobiles/landlines are 10 digits
    if (digits.length === 10) digits = `+30${digits}`;
    else digits = `+${digits}`;
  }
  return digits;
}
