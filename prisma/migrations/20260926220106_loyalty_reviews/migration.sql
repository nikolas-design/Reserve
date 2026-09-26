-- CreateTable
CREATE TABLE "Review" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "venueId" TEXT NOT NULL,
    "customerId" TEXT NOT NULL,
    "reservationId" TEXT NOT NULL,
    "rating" INTEGER NOT NULL,
    "comment" TEXT,
    "reply" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "Review_venueId_fkey" FOREIGN KEY ("venueId") REFERENCES "Venue" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "Review_customerId_fkey" FOREIGN KEY ("customerId") REFERENCES "Customer" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "Review_reservationId_fkey" FOREIGN KEY ("reservationId") REFERENCES "Reservation" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_Customer" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "venueId" TEXT NOT NULL,
    "firstName" TEXT NOT NULL,
    "lastName" TEXT,
    "phone" TEXT NOT NULL,
    "email" TEXT,
    "notes" TEXT,
    "allergies" TEXT,
    "tags" TEXT,
    "birthday" TEXT,
    "isVip" BOOLEAN NOT NULL DEFAULT false,
    "visits" INTEGER NOT NULL DEFAULT 0,
    "noShows" INTEGER NOT NULL DEFAULT 0,
    "points" INTEGER NOT NULL DEFAULT 0,
    "rewardsRedeemed" INTEGER NOT NULL DEFAULT 0,
    "birthdayGreetedYear" INTEGER,
    "lastVisitAt" DATETIME,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "Customer_venueId_fkey" FOREIGN KEY ("venueId") REFERENCES "Venue" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);
INSERT INTO "new_Customer" ("allergies", "birthday", "createdAt", "email", "firstName", "id", "isVip", "lastName", "lastVisitAt", "noShows", "notes", "phone", "tags", "updatedAt", "venueId", "visits") SELECT "allergies", "birthday", "createdAt", "email", "firstName", "id", "isVip", "lastName", "lastVisitAt", "noShows", "notes", "phone", "tags", "updatedAt", "venueId", "visits" FROM "Customer";
DROP TABLE "Customer";
ALTER TABLE "new_Customer" RENAME TO "Customer";
CREATE INDEX "Customer_venueId_lastName_idx" ON "Customer"("venueId", "lastName");
CREATE UNIQUE INDEX "Customer_venueId_phone_key" ON "Customer"("venueId", "phone");
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
    "reminderSentAt" DATETIME,
    "guestConfirmedAt" DATETIME,
    "releasedAt" DATETIME,
    "reviewRequestedAt" DATETIME,
    "pointsAwarded" INTEGER NOT NULL DEFAULT 0,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "Reservation_venueId_fkey" FOREIGN KEY ("venueId") REFERENCES "Venue" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "Reservation_customerId_fkey" FOREIGN KEY ("customerId") REFERENCES "Customer" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "Reservation_areaId_fkey" FOREIGN KEY ("areaId") REFERENCES "Area" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);
INSERT INTO "new_Reservation" ("areaId", "cancelledAt", "code", "confirmedAt", "createdAt", "customerId", "date", "endAt", "guestConfirmedAt", "guestNotes", "id", "internalNotes", "manageToken", "occasion", "partySize", "releasedAt", "reminderSentAt", "seatedAt", "source", "startAt", "status", "updatedAt", "venueId") SELECT "areaId", "cancelledAt", "code", "confirmedAt", "createdAt", "customerId", "date", "endAt", "guestConfirmedAt", "guestNotes", "id", "internalNotes", "manageToken", "occasion", "partySize", "releasedAt", "reminderSentAt", "seatedAt", "source", "startAt", "status", "updatedAt", "venueId" FROM "Reservation";
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
    "reminderEnabled" BOOLEAN NOT NULL DEFAULT true,
    "reminderHoursBefore" INTEGER NOT NULL DEFAULT 24,
    "reminderChannels" TEXT NOT NULL DEFAULT 'email,sms',
    "autoReleaseEnabled" BOOLEAN NOT NULL DEFAULT false,
    "autoReleaseHoursBefore" INTEGER NOT NULL DEFAULT 3,
    "smsSenderName" TEXT,
    "orderingEnabled" BOOLEAN NOT NULL DEFAULT true,
    "loyaltyEnabled" BOOLEAN NOT NULL DEFAULT true,
    "pointsPerVisit" INTEGER NOT NULL DEFAULT 10,
    "rewardPoints" INTEGER NOT NULL DEFAULT 100,
    "rewardText" TEXT NOT NULL DEFAULT 'Ένα δωρεάν επιδόρπιο',
    "reviewRequestEnabled" BOOLEAN NOT NULL DEFAULT true,
    "birthdayGreeting" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);
INSERT INTO "new_Venue" ("address", "autoConfirm", "autoReleaseEnabled", "autoReleaseHoursBefore", "brandColor", "cancellationHours", "city", "coverUrl", "createdAt", "currency", "defaultDurationMin", "description", "email", "id", "lateGraceMinutes", "locale", "logoText", "maxAdvanceDays", "maxPartyOnline", "minLeadMinutes", "minPartyOnline", "name", "orderingEnabled", "phone", "reminderChannels", "reminderEnabled", "reminderHoursBefore", "slotMinutes", "slug", "smsSenderName", "tagline", "termsText", "timezone", "updatedAt") SELECT "address", "autoConfirm", "autoReleaseEnabled", "autoReleaseHoursBefore", "brandColor", "cancellationHours", "city", "coverUrl", "createdAt", "currency", "defaultDurationMin", "description", "email", "id", "lateGraceMinutes", "locale", "logoText", "maxAdvanceDays", "maxPartyOnline", "minLeadMinutes", "minPartyOnline", "name", "orderingEnabled", "phone", "reminderChannels", "reminderEnabled", "reminderHoursBefore", "slotMinutes", "slug", "smsSenderName", "tagline", "termsText", "timezone", "updatedAt" FROM "Venue";
DROP TABLE "Venue";
ALTER TABLE "new_Venue" RENAME TO "Venue";
CREATE UNIQUE INDEX "Venue_slug_key" ON "Venue"("slug");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;

-- CreateIndex
CREATE UNIQUE INDEX "Review_reservationId_key" ON "Review"("reservationId");

-- CreateIndex
CREATE INDEX "Review_venueId_createdAt_idx" ON "Review"("venueId", "createdAt");

