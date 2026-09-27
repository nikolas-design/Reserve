# Deploy σε Plesk / cPanel (Node.js hosting)

Το `output: "standalone"` παράγει αυτόνομο bundle. Για να φτιάξεις το zip:

```bash
npm ci
npx prisma generate
npm run build
B=dist/reserve-plesk && rm -rf "$B" && mkdir -p "$B"
cp -r .next/standalone/. "$B"/ && mkdir -p "$B/.next" && cp -r .next/static "$B/.next/static"
cp -r public "$B/public" && mkdir -p "$B/prisma" && cp -r prisma/schema.prisma prisma/migrations prisma/seed.ts "$B/prisma/"
cp deploy/app.js "$B/app.js" && cp deploy/env.production.example "$B/.env"
mkdir -p "$B/data" && DATABASE_URL="file:$PWD/$B/data/reserve.db" npx prisma migrate deploy
DATABASE_URL="file:$PWD/$B/data/reserve.db" npx tsx prisma/seed.ts
(cd dist && zip -qr reserve-plesk.zip reserve-plesk)
```

Στον server: extract, συμπλήρωσε `.env` (AUTH_SECRET, APP_URL, CRON_SECRET),
Node.js app με startup file `app.js`, document root `public`, Restart.
Βάση: SQLite στο `data/reserve.db` (το `app.js` ορίζει το `DATABASE_URL` αυτόματα).
Cron: `GET /api/cron/reminders?key=<CRON_SECRET>` κάθε 15′.
