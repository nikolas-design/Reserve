# Reserve

Online σύστημα κρατήσεων για εστιατόρια, bar και χώρους εστίασης.

**Τι περιλαμβάνει**

- Σελίδα κράτησης πελάτη (`/[slug]`) με ζωντανή διαθεσιμότητα, email επιβεβαίωσης, σελίδα «Η κράτησή μου» (ημερολόγιο, ακύρωση, επιβεβαίωση 1 κλικ)
- Admin: βάρδια ημέρας, κάτοψη με ζωντανές καταστάσεις, λίστα αναμονής, πελατολόγιο, αναφορές με Excel, ρυθμίσεις
- Υπενθυμίσεις email / SMS / Viber με «Ναι, θα έρθω» και αυτόματη απελευθέρωση τραπεζιού
- Widget για website, links για Instagram/Google, QR codes
- QR μενού & παραγγελία από το τραπέζι, kitchen board
- Πόντοι επιβράβευσης, αξιολογήσεις μετά την επίσκεψη, ευχές γενεθλίων
- Booking server για «Κράτηση με Google» (Reserve with Google, API v3)

## Ανάπτυξη

```bash
npm install
cp .env.example .env      # συμπλήρωσε AUTH_SECRET
npx prisma migrate deploy # δημιουργεί τη βάση (SQLite τοπικά)
npm run db:seed           # demo κατάστημα + login owner@reserve.local / reserve123
npm run dev
```

- Σελίδα πελάτη: `http://localhost:3000/metropolis`
- QR μενού: `http://localhost:3000/m/metropolis?t=T1`
- Admin: `http://localhost:3000/admin`

## Deploy στο Vercel (βήμα-βήμα)

1. **Βάση δεδομένων**: φτιάξε μια δωρεάν Postgres στο [neon.tech](https://neon.tech) (ή Vercel Postgres / Supabase) και κράτα το `DATABASE_URL`.
2. **Άλλαξε τον provider σε Postgres**: στο `prisma/schema.prisma` βάλε `provider = "postgresql"`. Σβήσε τον φάκελο `prisma/migrations` (οι υπάρχουσες migrations είναι για SQLite) και τρέξε τοπικά με το Postgres `DATABASE_URL`:
   ```bash
   npx prisma migrate dev --name init
   npm run db:seed
   ```
   Κάνε commit το `prisma/migrations` που δημιουργήθηκε.
3. **Vercel**: [vercel.com/new](https://vercel.com/new) → Import το repo `nikolas-design/reserve`. Στο *Environment Variables* βάλε:
   - `DATABASE_URL` (από το βήμα 1)
   - `AUTH_SECRET` (`openssl rand -base64 32`)
   - `AUTH_TRUST_HOST=true`
   - `APP_URL=https://<το-domain-σου>.vercel.app`
   - `CRON_SECRET` (τυχαίο string, για τις υπενθυμίσεις)
   - προαιρετικά `RESEND_API_KEY`, `MAIL_FROM`, `SMS_PROVIDER` κ.λπ. (βλ. `.env.example`)
4. **Build command**: `npx prisma migrate deploy && next build` (Settings → Build & Development).
5. Πάτα **Deploy**. Το `vercel.json` ρυθμίζει αυτόματα το cron για υπενθυμίσεις/αξιολογήσεις κάθε 15′.
6. Άνοιξε `https://<domain>/login` με `owner@reserve.local / reserve123` και **άλλαξε τον κωδικό** (Ρυθμίσεις → Ο λογαριασμός μου) πριν το μοιραστείς.

## Ενσωματώσεις

| Τι | Πού |
|---|---|
| Email | Resend: `RESEND_API_KEY`, `MAIL_FROM` |
| SMS | Twilio (`SMS_PROVIDER=twilio`) ή οποιοδήποτε ελληνικό gateway με webhook JSON `{channel,to,text,sender}` (`SMS_PROVIDER=webhook`) |
| Viber | ίδιο webhook, `channel: "viber"` |
| Reserve with Google | Booking server: `POST https://<domain>/api/google/v3/{HealthCheck,BatchAvailabilityLookup,CheckAvailability,CreateBooking,UpdateBooking,GetBookingStatus,ListBookings}` με Basic auth (`GOOGLE_RESERVE_USER/PASSWORD`). Feeds: `GET /api/google/feeds/{merchants,services,availability}`. Απαιτείται εγγραφή partner στο Google Actions Center. |
| Website widget | Admin → Προώθηση → αντιγραφή snippet |

## Στοίβα

Next.js 16 (App Router) · TypeScript · Tailwind v4 · Prisma · Auth.js · exceljs · qrcode
