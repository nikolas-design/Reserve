# Reserve

Online σύστημα κρατήσεων για εστιατόρια, bar και χώρους εστίασης.

## Ανάπτυξη

```bash
npm install
cp .env.example .env      # συμπλήρωσε AUTH_SECRET
npm run db:migrate        # δημιουργεί τη βάση (SQLite τοπικά)
npm run db:seed           # demo κατάστημα + login owner@reserve.local / reserve123
npm run dev
```

- Σελίδα πελάτη: `http://localhost:3000/metropolis`
- Admin: `http://localhost:3000/admin`

## Στοίβα

Next.js (App Router) · TypeScript · Tailwind v4 · Prisma · Auth.js

Τοπικά χρησιμοποιείται SQLite. Για παραγωγή άλλαξε το `provider` σε
`postgresql` στο `prisma/schema.prisma` και το `DATABASE_URL`.
