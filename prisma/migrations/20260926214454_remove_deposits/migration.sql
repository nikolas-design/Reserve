-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_Reservation" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "venueId" TEXT NOT NULL,
    "customerId" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "manageToken" TEXT NOT NULL,
    "date" TEXT NOT NULL,
    "startAt" DATETIME NOT NULL,
    "endAt" DATETIME NOT NULL,
    "partySize" INTEGER NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'CONFIRMED',
    "source" TEXT NOT NULL DEFAULT 'WEBSITE',
    "occasion" TEXT,
    "guestNotes" TEXT,
    "internalNotes" TEXT,
    "areaId" TEXT,
    "confirmedAt" DATETIME,
    "seatedAt" DATETIME,
    "cancelledAt" DATETIME,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "Reservation_venueId_fkey" FOREIGN KEY ("venueId") REFERENCES "Venue" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "Reservation_customerId_fkey" FOREIGN KEY ("customerId") REFERENCES "Customer" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "Reservation_areaId_fkey" FOREIGN KEY ("areaId") REFERENCES "Area" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);
INSERT INTO "new_Reservation" ("areaId", "cancelledAt", "code", "confirmedAt", "createdAt", "customerId", "date", "endAt", "guestNotes", "id", "internalNotes", "manageToken", "occasion", "partySize", "seatedAt", "source", "startAt", "status", "updatedAt", "venueId") SELECT "areaId", "cancelledAt", "code", "confirmedAt", "createdAt", "customerId", "date", "endAt", "guestNotes", "id", "internalNotes", "manageToken", "occasion", "partySize", "seatedAt", "source", "startAt", "status", "updatedAt", "venueId" FROM "Reservation";
DROP TABLE "Reservation";
ALTER TABLE "new_Reservation" RENAME TO "Reservation";
CREATE UNIQUE INDEX "Reservation_code_key" ON "Reservation"("code");
CREATE UNIQUE INDEX "Reservation_manageToken_key" ON "Reservation"("manageToken");
CREATE INDEX "Reservation_venueId_date_idx" ON "Reservation"("venueId", "date");
CREATE INDEX "Reservation_venueId_startAt_idx" ON "Reservation"("venueId", "startAt");
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
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);
INSERT INTO "new_Venue" ("address", "autoConfirm", "brandColor", "cancellationHours", "city", "coverUrl", "createdAt", "currency", "defaultDurationMin", "description", "email", "id", "lateGraceMinutes", "locale", "logoText", "maxAdvanceDays", "maxPartyOnline", "minLeadMinutes", "minPartyOnline", "name", "phone", "slotMinutes", "slug", "tagline", "termsText", "timezone", "updatedAt") SELECT "address", "autoConfirm", "brandColor", "cancellationHours", "city", "coverUrl", "createdAt", "currency", "defaultDurationMin", "description", "email", "id", "lateGraceMinutes", "locale", "logoText", "maxAdvanceDays", "maxPartyOnline", "minLeadMinutes", "minPartyOnline", "name", "phone", "slotMinutes", "slug", "tagline", "termsText", "timezone", "updatedAt" FROM "Venue";
DROP TABLE "Venue";
ALTER TABLE "new_Venue" RENAME TO "Venue";
CREATE UNIQUE INDEX "Venue_slug_key" ON "Venue"("slug");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;

