// Guest notifications: email, SMS and Viber.
//
// Email  -> Resend when RESEND_API_KEY is set, otherwise logged.
// SMS    -> SMS_PROVIDER=twilio (TWILIO_ACCOUNT_SID/TWILIO_AUTH_TOKEN/TWILIO_FROM)
//        or SMS_PROVIDER=webhook (SMS_WEBHOOK_URL/SMS_WEBHOOK_TOKEN: a JSON POST
//        {channel, to, text, sender} that fits Greek gateways such as Yuboto,
//        Routee or SMS.to), otherwise logged.
// Viber  -> the same webhook with channel "viber".
// Every attempt is written to MessageLog.

import type { Customer, Reservation, Venue } from "@prisma/client";
import { prisma } from "./prisma";
import { formatYmdLong, formatYmdShort, utcToZoned } from "./time";

type Mail = { to: string; subject: string; html: string; text: string };
type Full = Reservation & { customer: Customer; venue: Venue };
type Kind = "confirmation" | "reminder" | "cancellation" | "release" | "review";

export function appUrl() {
  return (process.env.APP_URL || "http://localhost:3000").replace(/\/$/, "");
}

export function manageUrl(r: Reservation) {
  return `${appUrl()}/r/${r.code}?t=${r.manageToken}`;
}

export function confirmUrl(r: Reservation) {
  return `${appUrl()}/c/${r.code}/${r.manageToken}`;
}

export function reviewUrl(r: Reservation) {
  return `${appUrl()}/review/${r.code}?t=${r.manageToken}`;
}

async function log(r: Full, channel: string, kind: Kind, to: string, body: string, status: string, error?: string) {
  await prisma.messageLog
    .create({ data: { venueId: r.venueId, reservationId: r.id, channel, kind, to, body, status, error } })
    .catch((e) => console.error("[messagelog]", e));
}

// ---------- transports ----------

async function sendMail(mail: Mail): Promise<{ status: string; error?: string }> {
  const key = process.env.RESEND_API_KEY;
  const from = process.env.MAIL_FROM || "Reserve <onboarding@resend.dev>";
  if (!key) {
    console.log(`[mail:dev] to=${mail.to} subject="${mail.subject}"\n${mail.text}`);
    return { status: "LOGGED" };
  }
  const res = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json" },
    body: JSON.stringify({ from, to: mail.to, subject: mail.subject, html: mail.html, text: mail.text }),
  });
  if (!res.ok) return { status: "FAILED", error: `${res.status} ${await res.text()}` };
  return { status: "SENT" };
}

async function sendText(channel: "sms" | "viber", to: string, text: string, sender?: string | null): Promise<{ status: string; error?: string }> {
  const provider = process.env.SMS_PROVIDER || "log";
  if (provider === "twilio" && channel === "sms") {
    const sid = process.env.TWILIO_ACCOUNT_SID;
    const token = process.env.TWILIO_AUTH_TOKEN;
    const from = process.env.TWILIO_FROM;
    if (!sid || !token || !from) return { status: "FAILED", error: "Twilio env missing" };
    const res = await fetch(`https://api.twilio.com/2010-04-01/Accounts/${sid}/Messages.json`, {
      method: "POST",
      headers: { Authorization: `Basic ${Buffer.from(`${sid}:${token}`).toString("base64")}`, "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({ To: to, From: sender || from, Body: text }),
    });
    if (!res.ok) return { status: "FAILED", error: `${res.status} ${await res.text()}` };
    return { status: "SENT" };
  }
  if (provider === "webhook") {
    const url = process.env.SMS_WEBHOOK_URL;
    if (!url) return { status: "FAILED", error: "SMS_WEBHOOK_URL missing" };
    const res = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json", ...(process.env.SMS_WEBHOOK_TOKEN ? { Authorization: `Bearer ${process.env.SMS_WEBHOOK_TOKEN}` } : {}) },
      body: JSON.stringify({ channel, to, text, sender: sender || process.env.SMS_SENDER || "Reserve" }),
    });
    if (!res.ok) return { status: "FAILED", error: `${res.status} ${await res.text()}` };
    return { status: "SENT" };
  }
  console.log(`[${channel}:dev] to=${to}\n${text}`);
  return { status: "LOGGED" };
}

// ---------- messages ----------

function when(r: Full) {
  return `${formatYmdLong(r.date)}, ${utcToZoned(r.startAt, r.venue.timezone).hm}`;
}

function channels(v: Venue) {
  return v.reminderChannels.split(",").map((c) => c.trim()).filter(Boolean);
}

export async function sendReservationEmail(r: Full) {
  if (!r.customer.email) return;
  const pending = r.status === "PENDING";
  const subject = pending ? `Λάβαμε το αίτημά σας · ${r.venue.name}` : `Η κράτησή σας επιβεβαιώθηκε · ${r.venue.name}`;
  const url = manageUrl(r);
  const text = [
    `Γεια σας ${r.customer.firstName},`,
    pending ? `λάβαμε το αίτημα κράτησης στο ${r.venue.name} και θα σας επιβεβαιώσουμε σύντομα.` : `η κράτησή σας στο ${r.venue.name} επιβεβαιώθηκε.`,
    ``,
    `Πότε: ${when(r)}`,
    `Άτομα: ${r.partySize}`,
    `Κωδικός: ${r.code}`,
    ``,
    `Αλλαγή ή ακύρωση: ${url}`,
    r.venue.address ? `${r.venue.address}${r.venue.city ? `, ${r.venue.city}` : ""}` : ``,
    r.venue.phone ? `Τηλ: ${r.venue.phone}` : ``,
  ].filter((l) => l !== ``).join("\n");

  const html = layout(r, pending ? "Λάβαμε το αίτημά σας" : "Η κράτησή σας επιβεβαιώθηκε",
    `Γεια σας ${r.customer.firstName}, ${pending ? "θα σας επιβεβαιώσουμε σύντομα." : "σας περιμένουμε!"}`,
    [["Πότε", when(r)], ["Άτομα", String(r.partySize)], ["Κωδικός", r.code]],
    [{ href: url, label: "Η κράτησή μου" }]);

  const res = await sendMail({ to: r.customer.email, subject, html, text });
  await log(r, "email", "confirmation", r.customer.email, text, res.status, res.error);
}

export async function sendCancellationEmail(r: Full, kind: "cancellation" | "release" = "cancellation") {
  if (!r.customer.email) return;
  const text = kind === "release"
    ? `Γεια σας ${r.customer.firstName},\nεπειδή δεν λάβαμε επιβεβαίωση, η κράτησή σας (${r.code}) στο ${r.venue.name} για ${when(r)} ακυρώθηκε.\nΑν θέλετε να έρθετε, καλέστε μας${r.venue.phone ? ` στο ${r.venue.phone}` : ""} ή κάντε νέα κράτηση: ${appUrl()}/${r.venue.slug}`
    : `Γεια σας ${r.customer.firstName},\nη κράτησή σας (${r.code}) στο ${r.venue.name} για ${when(r)} ακυρώθηκε.\nΕλπίζουμε να σας δούμε σύντομα.`;
  const res = await sendMail({
    to: r.customer.email,
    subject: `Η κράτησή σας ακυρώθηκε · ${r.venue.name}`,
    text,
    html: `<p style="font-family:system-ui;line-height:1.5">${text.replace(/\n/g, "<br>")}</p>`,
  });
  await log(r, "email", kind, r.customer.email, text, res.status, res.error);
}

/** Reminder on every channel the venue enabled, with a one-tap confirm link. */
export async function sendReminder(r: Full) {
  const v = r.venue;
  const url = confirmUrl(r);
  const short = `${v.name}: υπενθύμιση κράτησης ${formatYmdShort(r.date)} ${utcToZoned(r.startAt, v.timezone).hm}, ${r.partySize} άτ. Θα έρθετε; Πατήστε για ΝΑΙ: ${url}  Ακύρωση: ${manageUrl(r)}`;
  const results: string[] = [];

  for (const ch of channels(v)) {
    if (ch === "email" && r.customer.email) {
      const text = `Γεια σας ${r.customer.firstName},\nσας υπενθυμίζουμε την κράτησή σας στο ${v.name}.\n\nΠότε: ${when(r)}\nΆτομα: ${r.partySize}\n\nΘα έρθετε; Επιβεβαιώστε με ένα κλικ: ${url}\nΑλλαγή ή ακύρωση: ${manageUrl(r)}`;
      const html = layout(r, "Σας περιμένουμε αύριο;", `Γεια σας ${r.customer.firstName}, μια υπενθύμιση για την κράτησή σας.`,
        [["Πότε", when(r)], ["Άτομα", String(r.partySize)]],
        [{ href: url, label: "Ναι, θα έρθω ✓" }, { href: manageUrl(r), label: "Αλλαγή ή ακύρωση", ghost: true }]);
      const res = await sendMail({ to: r.customer.email, subject: `Υπενθύμιση κράτησης · ${v.name}`, html, text });
      await log(r, "email", "reminder", r.customer.email, text, res.status, res.error);
      results.push(`email:${res.status}`);
    }
    if (ch === "sms" || ch === "viber") {
      const res = await sendText(ch, r.customer.phone, short, v.smsSenderName);
      await log(r, ch, "reminder", r.customer.phone, short, res.status, res.error);
      results.push(`${ch}:${res.status}`);
    }
  }
  await prisma.reservation.update({ where: { id: r.id }, data: { reminderSentAt: new Date() } });
  return results;
}

export async function sendReviewRequest(r: Full) {
  if (!r.customer.email) return;
  const url = reviewUrl(r);
  const text = `Γεια σας ${r.customer.firstName},\nευχαριστούμε που ήρθατε στο ${r.venue.name}! Πώς ήταν; Πείτε μας με ένα κλικ: ${url}`;
  const html = layout(r, "Πώς ήταν;", `Γεια σας ${r.customer.firstName}, ευχαριστούμε που ήρθατε. Θα θέλαμε τη γνώμη σας, παίρνει 10 δευτερόλεπτα.`,
    [["Επίσκεψη", when(r)]],
    [1, 2, 3, 4, 5].map((n) => ({ href: `${url}&rating=${n}`, label: `${"★".repeat(n)}${"☆".repeat(5 - n)}`, ghost: n < 5 })));
  const res = await sendMail({ to: r.customer.email, subject: `Πώς ήταν στο ${r.venue.name};`, html, text });
  await log(r, "email", "review", r.customer.email, text, res.status, res.error);
}

export async function sendBirthdayEmail(c: Customer, v: Venue) {
  if (!c.email) return;
  const text = `Χρόνια πολλά ${c.firstName}! 🎂\nΑπό όλους μας στο ${v.name}. Σας περιμένουμε να το γιορτάσουμε μαζί: ${appUrl()}/${v.slug}`;
  const res = await sendMail({
    to: c.email,
    subject: `Χρόνια πολλά από το ${v.name} 🎂`,
    text,
    html: `<div style="font-family:system-ui;line-height:1.6;max-width:520px;margin:0 auto;padding:32px 16px"><h1 style="color:${v.brandColor}">Χρόνια πολλά ${c.firstName}! 🎂</h1><p>Από όλους μας στο ${v.name}. Σας περιμένουμε να το γιορτάσουμε μαζί.</p><a href="${appUrl()}/${v.slug}" style="display:inline-block;background:${v.brandColor};color:#fff;text-decoration:none;padding:12px 22px;border-radius:999px;font-weight:700">Κράτηση τραπεζιού</a></div>`,
  });
  await prisma.messageLog.create({ data: { venueId: v.id, channel: "email", kind: "birthday", to: c.email, body: text, status: res.status, error: res.error } }).catch(() => {});
}

function layout(r: Full, title: string, intro: string, rows: [string, string][], buttons: { href: string; label: string; ghost?: boolean }[]) {
  return `<!doctype html><html lang="el"><body style="margin:0;background:#f3f5fa;font-family:Manrope,system-ui,sans-serif;color:#0b1220">
  <div style="max-width:520px;margin:0 auto;padding:32px 16px">
    <div style="background:#fff;border:1px solid #e2e7f0;border-radius:22px;padding:28px">
      <p style="margin:0 0 4px;font-size:12px;font-weight:700;letter-spacing:.08em;color:${r.venue.brandColor};text-transform:uppercase">${r.venue.name}</p>
      <h1 style="margin:0 0 16px;font-size:22px">${title}</h1>
      <p style="margin:0 0 20px;color:#4b5568">${intro}</p>
      <table style="width:100%;border-collapse:collapse;font-size:15px">
        ${rows.map(([k, v]) => `<tr><td style="padding:8px 0;color:#8a94a8">${k}</td><td style="padding:8px 0;font-weight:700;text-align:right">${v}</td></tr>`).join("")}
      </table>
      ${buttons.map((b) => `<a href="${b.href}" style="display:block;margin:${b.ghost ? "8px" : "24px"} 0 0;background:${b.ghost ? "#eef2f9" : r.venue.brandColor};color:${b.ghost ? "#0b1220" : "#fff"};text-decoration:none;text-align:center;padding:14px;border-radius:999px;font-weight:700">${b.label}</a>`).join("")}
    </div>
    <p style="margin:16px 0 0;font-size:12px;color:#8a94a8;text-align:center">${[r.venue.address, r.venue.city].filter(Boolean).join(", ")}${r.venue.phone ? ` · ${r.venue.phone}` : ""}</p>
  </div></body></html>`;
}
