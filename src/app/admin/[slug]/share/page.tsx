import QRCode from "qrcode";
import { appUrl } from "@/lib/notify";
import { myVenue } from "@/lib/venue-access";
import { prisma } from "@/lib/prisma";
import { CopyBox } from "./copy-box";

export const dynamic = "force-dynamic";
export const metadata = { title: "Προώθηση" };

export default async function SharePage({ params }: PageProps<"/admin/[slug]/share">) {
  const { slug } = await params;
  const { venue } = await myVenue(slug);
  const tables = await prisma.table.findMany({ where: { venueId: venue.id, isActive: true }, orderBy: { sortOrder: "asc" } });
  const base = appUrl();
  const link = `${base}/${slug}`;
  const qr = await QRCode.toString(`${link}?channel=qr`, { type: "svg", margin: 1, width: 220, color: { dark: "#0b1220", light: "#ffffff" } });

  return (
    <div className="flex flex-col gap-5">
      <header>
        <h1 className="text-xl font-bold sm:text-2xl">Προώθηση</h1>
        <p className="text-sm text-ink-3">Βάλτε τη σελίδα κράτησης παντού: website, Instagram, Facebook, Google, μενού, κάρτες.</p>
      </header>

      <div className="grid gap-4 lg:grid-cols-2">
        <section className="card flex flex-col gap-3 p-5">
          <h2 className="font-bold">Σύνδεσμος κράτησης</h2>
          <CopyBox label="Website / Facebook" value={link} />
          <CopyBox label="Instagram bio (μετράει ως κανάλι Instagram)" value={`${link}?channel=instagram`} />
          <CopyBox label="Google Business Profile → «Κράτηση»" value={`${link}?channel=google`} />
          <p className="text-xs text-ink-3">Στο Instagram: Edit profile → Website. Στο Google: Business Profile → Booking link.</p>
        </section>

        <section className="card flex flex-col gap-3 p-5">
          <h2 className="font-bold">QR code</h2>
          <p className="text-sm text-ink-3">Για μενού, βιτρίνα, κάρτες.</p>
          <div className="flex items-center gap-4">
            <div className="w-[180px] rounded-[14px] border border-line bg-white p-2" dangerouslySetInnerHTML={{ __html: qr }} />
            <a href={`/admin/${slug}/share/qr.svg`} download={`${slug}-qr.svg`} className="btn-ghost text-xs">⬇ Λήψη SVG</a>
          </div>
        </section>

        <section className="card flex flex-col gap-3 p-5 lg:col-span-2">
          <h2 className="font-bold">QR μενού & παραγγελία ανά τραπέζι</h2>
          <p className="text-sm text-ink-3">Τυπώστε ένα ανά τραπέζι. Ο πελάτης βλέπει το μενού και παραγγέλνει από το κινητό του.</p>
          <div className="flex flex-wrap gap-2">
            {tables.map((t) => (
              <a key={t.id} href={`/admin/${slug}/share/qr.svg?menu=${encodeURIComponent(t.name)}`} download={`${slug}-menu-${t.name}.svg`} className="btn-ghost py-1.5 text-xs">⬇ {t.name}</a>
            ))}
          </div>
          <CopyBox label="Σύνδεσμος μενού (χωρίς παραγγελία)" value={`${base}/m/${slug}`} />
        </section>

        <section className="card flex flex-col gap-3 p-5 lg:col-span-2">
          <h2 className="font-bold">Ενσωμάτωση στο website σας</h2>
          <p className="text-sm text-ink-3">Επικολλήστε το εκεί που θέλετε να εμφανίζεται η φόρμα. Παίρνει αυτόματα το σωστό ύψος.</p>
          <CopyBox label="Widget (προτείνεται)" value={`<div data-reserve="${slug}"></div>\n<script src="${base}/embed.js" async></script>`} multiline />
          <CopyBox label="Απλό iframe" value={`<iframe src="${link}?embed=1" style="width:100%;max-width:480px;height:760px;border:0;border-radius:22px" title="Κράτηση τραπεζιού"></iframe>`} multiline />
          <CopyBox label="Κουμπί" value={`<a href="${link}" style="display:inline-block;background:#2b5cff;color:#fff;padding:12px 22px;border-radius:999px;font-weight:700;text-decoration:none">Κράτηση τραπεζιού</a>`} multiline />
        </section>
      </div>
    </div>
  );
}
