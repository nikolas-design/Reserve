-- CreateTable
CREATE TABLE "MenuCategory" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "venueId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    CONSTRAINT "MenuCategory_venueId_fkey" FOREIGN KEY ("venueId") REFERENCES "Venue" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "MenuItem" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "venueId" TEXT NOT NULL,
    "categoryId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "priceCents" INTEGER NOT NULL,
    "tags" TEXT,
    "isAvailable" BOOLEAN NOT NULL DEFAULT true,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    CONSTRAINT "MenuItem_venueId_fkey" FOREIGN KEY ("venueId") REFERENCES "Venue" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "MenuItem_categoryId_fkey" FOREIGN KEY ("categoryId") REFERENCES "MenuCategory" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "Order" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "venueId" TEXT NOT NULL,
    "number" INTEGER NOT NULL,
    "tableId" TEXT,
    "tableName" TEXT,
    "guestName" TEXT,
    "notes" TEXT,
    "status" TEXT NOT NULL DEFAULT 'NEW',
    "totalCents" INTEGER NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "Order_venueId_fkey" FOREIGN KEY ("venueId") REFERENCES "Venue" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "Order_tableId_fkey" FOREIGN KEY ("tableId") REFERENCES "Table" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "OrderItem" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "orderId" TEXT NOT NULL,
    "menuItemId" TEXT,
    "name" TEXT NOT NULL,
    "priceCents" INTEGER NOT NULL,
    "qty" INTEGER NOT NULL,
    "notes" TEXT,
    CONSTRAINT "OrderItem_orderId_fkey" FOREIGN KEY ("orderId") REFERENCES "Order" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "OrderItem_menuItemId_fkey" FOREIGN KEY ("menuItemId") REFERENCES "MenuItem" ("id") ON DELETE SET NULL ON UPDATE CASCADE
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
    "orderingEnabled" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);
INSERT INTO "new_Venue" ("address", "autoConfirm", "autoReleaseEnabled", "autoReleaseHoursBefore", "brandColor", "cancellationHours", "city", "coverUrl", "createdAt", "currency", "defaultDurationMin", "description", "email", "id", "lateGraceMinutes", "locale", "logoText", "maxAdvanceDays", "maxPartyOnline", "minLeadMinutes", "minPartyOnline", "name", "phone", "reminderChannels", "reminderEnabled", "reminderHoursBefore", "slotMinutes", "slug", "smsSenderName", "tagline", "termsText", "timezone", "updatedAt") SELECT "address", "autoConfirm", "autoReleaseEnabled", "autoReleaseHoursBefore", "brandColor", "cancellationHours", "city", "coverUrl", "createdAt", "currency", "defaultDurationMin", "description", "email", "id", "lateGraceMinutes", "locale", "logoText", "maxAdvanceDays", "maxPartyOnline", "minLeadMinutes", "minPartyOnline", "name", "phone", "reminderChannels", "reminderEnabled", "reminderHoursBefore", "slotMinutes", "slug", "smsSenderName", "tagline", "termsText", "timezone", "updatedAt" FROM "Venue";
DROP TABLE "Venue";
ALTER TABLE "new_Venue" RENAME TO "Venue";
CREATE UNIQUE INDEX "Venue_slug_key" ON "Venue"("slug");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;

-- CreateIndex
CREATE INDEX "Order_venueId_status_idx" ON "Order"("venueId", "status");

-- CreateIndex
CREATE INDEX "Order_venueId_createdAt_idx" ON "Order"("venueId", "createdAt");

