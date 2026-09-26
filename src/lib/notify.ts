// Guest notifications. Email goes through Resend when RESEND_API_KEY is set;
// otherwise it is logged, so local development needs no credentials.
// SMS (Viber/WhatsApp) providers plug in here later.

import type { Customer, Reservation, Venue } from "@prisma/client";
import { formatYmdLong, utcToZoned } from "./time";

type Mail = { to: string; subject: string; html: string; text: string };

async function sendMail(mail: Mail) {
  const key = process.env.RESEND_API_KEY;
  const from = process.env.MAIL_FROM || "Reserve <onboarding@resend.dev>";
  if (!key) {
    console.log(`[mail:dev] to=${mail.to} subject="${mail.subject}"\n${mail.text}`);
    return;
  }
  const res = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json" },
    body: JSON.stringify({ from, to: mail.to, subject: mail.subject, html: mail.html, text: mail.text }),
  });
  if (!res.ok) console.error("[mail] failed", res.status, await res.text());
}

export function manageUrl(r: Reservation) {
  const base = process.env.APP_URL || "http://localhost:3000";
  return `${base}/r/${r.code}?t=${r.manageToken}`;
}

export async function sendReservationEmail(
  r: Reservation & { customer: Customer; venue: Venue },
) {
  if (!r.customer.email) return;
  const { hm } = utcToZoned(r.startAt, r.venue.timezone);
  const when = `${formatYmdLong(r.date)}, ${hm}`;
  const pending = r.status === "PENDING";
  const subject = pending
    ? `Λάβαμε το αίτημά σας · ${r.venue.name}`
    : `Η κράτησή σας επιβεβαιώθηκε · ${r.venue.name}`;
  const url = manageUrl(r);
  const text = [
    `Γεια σας ${r.customer.firstName},`,
    pending
      ? `λάβαμε το αίτημα κράτησης στο ${r.venue.name} και θα σας επιβεβαιώσουμε σύντομα.`
      : `η κράτησή σας στο ${r.venue.name} επιβεβαιώθηκε.`,
    ``,
    `Πότε: ${when}`,
    `Άτομα: ${r.partySize}`,
    `Κωδικός: ${r.code}`,
    r.depositCents ? `Προκαταβολή: ${(r.depositCents / 100).toFixed(2)} €` : ``,
    ``,
    `Αλλαγή ή ακύρωση: ${url}`,
    r.venue.address ? `${r.venue.address}${r.venue.city ? `, ${r.venue.city}` : ""}` : ``,
    r.venue.phone ? `Τηλ: ${r.venue.phone}` : ``,
  ]
    .filter((l) => l !== ``)
    .join("\n");

  const html = `<!doctype html><html lang="el"><body style="margin:0;background:#f3f5fa;font-family:Manrope,system-ui,sans-serif;color:#0b1220">
  <div style="max-width:520px;margin:0 auto;padding:32px 16px">
    <div style="background:#fff;border:1px solid #e2e7f0;border-radius:22px;padding:28px">
      <p style="margin:0 0 4px;font-size:12px;font-weight:700;letter-spacing:.08em;color:#2b5cff;text-transform:uppercase">${r.venue.name}</p>
      <h1 style="margin:0 0 16px;font-size:22px">${pending ? "Λάβαμε το αίτημά σας" : "Η κράτησή σας επιβεβαιώθηκε"}</h1>
      <p style="margin:0 0 20px;color:#4b5568">Γεια σας ${r.customer.firstName}, ${pending ? "θα σας επιβεβαιώσουμε σύντομα." : "σας περιμένουμε!"}</p>
      <table style="width:100%;border-collapse:collapse;font-size:15px">
        <tr><td style="padding:8px 0;color:#8a94a8">Πότε</td><td style="padding:8px 0;font-weight:700;text-align:right">${when}</td></tr>
        <tr><td style="padding:8px 0;color:#8a94a8">Άτομα</td><td style="padding:8px 0;font-weight:700;text-align:right">${r.partySize}</td></tr>
        <tr><td style="padding:8px 0;color:#8a94a8">Κωδικός</td><td style="padding:8px 0;font-weight:700;text-align:right">${r.code}</td></tr>
        ${r.depositCents ? `<tr><td style="padding:8px 0;color:#8a94a8">Προκαταβολή</td><td style="padding:8px 0;font-weight:700;text-align:right">${(r.depositCents / 100).toFixed(2)} €</td></tr>` : ""}
      </table>
      <a href="${url}" style="display:block;margin:24px 0 8px;background:#2b5cff;color:#fff;text-decoration:none;text-align:center;padding:14px;border-radius:999px;font-weight:700">Η κράτησή μου</a>
      <p style="margin:0;font-size:12px;color:#8a94a8;text-align:center">Αλλαγή ή ακύρωση από τον παραπάνω σύνδεσμο.</p>
    </div>
    <p style="margin:16px 0 0;font-size:12px;color:#8a94a8;text-align:center">${[r.venue.address, r.venue.city].filter(Boolean).join(", ")}${r.venue.phone ? ` · ${r.venue.phone}` : ""}</p>
  </div></body></html>`;

  await sendMail({ to: r.customer.email, subject, html, text });
}

export async function sendCancellationEmail(
  r: Reservation & { customer: Customer; venue: Venue },
) {
  if (!r.customer.email) return;
  const { hm } = utcToZoned(r.startAt, r.venue.timezone);
  const when = `${formatYmdLong(r.date)}, ${hm}`;
  const text = `Γεια σας ${r.customer.firstName},\nη κράτησή σας (${r.code}) στο ${r.venue.name} για ${when} ακυρώθηκε.\nΕλπίζουμε να σας δούμε σύντομα.`;
  await sendMail({
    to: r.customer.email,
    subject: `Η κράτησή σας ακυρώθηκε · ${r.venue.name}`,
    text,
    html: `<p style="font-family:system-ui">${text.replace(/\n/g, "<br>")}</p>`,
  });
}
