-- AlterTable
ALTER TABLE "Reservation" ADD COLUMN "guestConfirmedAt" DATETIME;
ALTER TABLE "Reservation" ADD COLUMN "releasedAt" DATETIME;
ALTER TABLE "Reservation" ADD COLUMN "reminderSentAt" DATETIME;

-- CreateTable
CREATE TABLE "MessageLog" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "venueId" TEXT NOT NULL,
    "reservationId" TEXT,
    "channel" TEXT NOT NULL,
    "kind" TEXT NOT NULL,
    "to" TEXT NOT NULL,
    "body" TEXT NOT NULL,
    "status" TEXT NOT NULL,
    "error" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "MessageLog_venueId_fkey" FOREIGN KEY ("venueId") REFERENCES "Venue" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "MessageLog_reservationId_fkey" FOREIGN KEY ("reservationId") REFERENCES "Reservation" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_Venue" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "slug" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "tagline" TEXT,
    "description" TEXT,
    "phone" TEXT,
    "email" TEXT,
    "address" TEXT,
    "city" TEXT,
    "timezone" TEXT NOT NULL DEFAULT 'Europe/Athens',
    "locale" TEXT NOT NULL DEFAULT 'el',
    "currency" TEXT NOT NULL DEFAULT 'EUR',
    "brandColor" TEXT NOT NULL DEFAULT '#2B5CFF',
    "logoText" TEXT,
    "coverUrl" TEXT,
    "slotMinutes" INTEGER NOT NULL DEFAULT 30,
    "defaultDurationMin" INTEGER NOT NULL DEFAULT 120,
    "minPartyOnline" INTEGER NOT NULL DEFAULT 1,
    "maxPartyOnline" INTEGER NOT NULL DEFAULT 8,
    "minLeadMinutes" INTEGER NOT NULL DEFAULT 60,
    "maxAdvanceDays" INTEGER NOT NULL DEFAULT 60,
    "autoConfirm" BOOLEAN NOT NULL DEFAULT true,
    "cancellationHours" INTEGER NOT NULL DEFAULT 48,
    "lateGraceMinutes" INTEGER NOT NULL DEFAULT 20,
    "termsText" TEXT,
    "reminderEnabled" BOOLEAN NOT NULL DEFAULT true,
    "reminderHoursBefore" INTEGER NOT NULL DEFAULT 24,
    "reminderChannels" TEXT NOT NULL DEFAULT 'email,sms',
    "autoReleaseEnabled" BOOLEAN NOT NULL DEFAULT false,
    "autoReleaseHoursBefore" INTEGER NOT NULL DEFAULT 3,
    "smsSenderName" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);
INSERT INTO "new_Venue" ("address", "autoConfirm", "brandColor", "cancellationHours", "city", "coverUrl", "createdAt", "currency", "defaultDurationMin", "description", "email", "id", "lateGraceMinutes", "locale", "logoText", "maxAdvanceDays", "maxPartyOnline", "minLeadMinutes", "minPartyOnline", "name", "phone", "slotMinutes", "slug", "tagline", "termsText", "timezone", "updatedAt") SELECT "address", "autoConfirm", "brandColor", "cancellationHours", "city", "coverUrl", "createdAt", "currency", "defaultDurationMin", "description", "email", "id", "lateGraceMinutes", "locale", "logoText", "maxAdvanceDays", "maxPartyOnline", "minLeadMinutes", "minPartyOnline", "name", "phone", "slotMinutes", "slug", "tagline", "termsText", "timezone", "updatedAt" FROM "Venue";
DROP TABLE "Venue";
ALTER TABLE "new_Venue" RENAME TO "Venue";
CREATE UNIQUE INDEX "Venue_slug_key" ON "Venue"("slug");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;

-- CreateIndex
CREATE INDEX "MessageLog_venueId_createdAt_idx" ON "MessageLog"("venueId", "createdAt");

