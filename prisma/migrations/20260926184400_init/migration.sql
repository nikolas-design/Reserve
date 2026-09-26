-- CreateTable
CREATE TABLE "User" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "email" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "passwordHash" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- CreateTable
CREATE TABLE "VenueMember" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "userId" TEXT NOT NULL,
    "venueId" TEXT NOT NULL,
    "role" TEXT NOT NULL DEFAULT 'HOST',
    CONSTRAINT "VenueMember_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "VenueMember_venueId_fkey" FOREIGN KEY ("venueId") REFERENCES "Venue" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "Venue" (
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
    "depositEnabled" BOOLEAN NOT NULL DEFAULT false,
    "depositPerPersonCents" INTEGER NOT NULL DEFAULT 0,
    "depositFromPartySize" INTEGER NOT NULL DEFAULT 7,
    "cancellationHours" INTEGER NOT NULL DEFAULT 48,
    "lateGraceMinutes" INTEGER NOT NULL DEFAULT 20,
    "termsText" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "Area" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "venueId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "isOnlineBookable" BOOLEAN NOT NULL DEFAULT true,
    CONSTRAINT "Area_venueId_fkey" FOREIGN KEY ("venueId") REFERENCES "Venue" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "Table" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "venueId" TEXT NOT NULL,
    "areaId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "minSeats" INTEGER NOT NULL DEFAULT 1,
    "maxSeats" INTEGER NOT NULL DEFAULT 4,
    "shape" TEXT NOT NULL DEFAULT 'RECT',
    "x" INTEGER NOT NULL DEFAULT 0,
    "y" INTEGER NOT NULL DEFAULT 0,
    "w" INTEGER NOT NULL DEFAULT 2,
    "h" INTEGER NOT NULL DEFAULT 2,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    CONSTRAINT "Table_venueId_fkey" FOREIGN KEY ("venueId") REFERENCES "Venue" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "Table_areaId_fkey" FOREIGN KEY ("areaId") REFERENCES "Area" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "Shift" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "venueId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "daysOfWeek" TEXT NOT NULL DEFAULT '0,1,2,3,4,5,6',
    "startTime" TEXT NOT NULL,
    "endTime" TEXT NOT NULL,
    "lastSeatingOffset" INTEGER NOT NULL DEFAULT 90,
    "durationMin" INTEGER,
    "maxCoversPerSlot" INTEGER,
    "isOnlineBookable" BOOLEAN NOT NULL DEFAULT true,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    CONSTRAINT "Shift_venueId_fkey" FOREIGN KEY ("venueId") REFERENCES "Venue" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "SpecialDay" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "venueId" TEXT NOT NULL,
    "date" TEXT NOT NULL,
    "isClosed" BOOLEAN NOT NULL DEFAULT true,
    "note" TEXT,
    CONSTRAINT "SpecialDay_venueId_fkey" FOREIGN KEY ("venueId") REFERENCES "Venue" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "Customer" (
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
    "lastVisitAt" DATETIME,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "Customer_venueId_fkey" FOREIGN KEY ("venueId") REFERENCES "Venue" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "Reservation" (
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
    "depositCents" INTEGER NOT NULL DEFAULT 0,
    "depositStatus" TEXT NOT NULL DEFAULT 'NONE',
    "confirmedAt" DATETIME,
    "seatedAt" DATETIME,
    "cancelledAt" DATETIME,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "Reservation_venueId_fkey" FOREIGN KEY ("venueId") REFERENCES "Venue" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "Reservation_customerId_fkey" FOREIGN KEY ("customerId") REFERENCES "Customer" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "Reservation_areaId_fkey" FOREIGN KEY ("areaId") REFERENCES "Area" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "ReservationTable" (
    "reservationId" TEXT NOT NULL,
    "tableId" TEXT NOT NULL,

    PRIMARY KEY ("reservationId", "tableId"),
    CONSTRAINT "ReservationTable_reservationId_fkey" FOREIGN KEY ("reservationId") REFERENCES "Reservation" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "ReservationTable_tableId_fkey" FOREIGN KEY ("tableId") REFERENCES "Table" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "WaitlistEntry" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "venueId" TEXT NOT NULL,
    "customerId" TEXT NOT NULL,
    "partySize" INTEGER NOT NULL,
    "quotedMinutes" INTEGER,
    "status" TEXT NOT NULL DEFAULT 'WAITING',
    "notes" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "notifiedAt" DATETIME,
    "seatedAt" DATETIME,
    CONSTRAINT "WaitlistEntry_venueId_fkey" FOREIGN KEY ("venueId") REFERENCES "Venue" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "WaitlistEntry_customerId_fkey" FOREIGN KEY ("customerId") REFERENCES "Customer" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateIndex
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");

-- CreateIndex
CREATE UNIQUE INDEX "VenueMember_userId_venueId_key" ON "VenueMember"("userId", "venueId");

-- CreateIndex
CREATE UNIQUE INDEX "Venue_slug_key" ON "Venue"("slug");

-- CreateIndex
CREATE UNIQUE INDEX "Table_venueId_name_key" ON "Table"("venueId", "name");

-- CreateIndex
CREATE UNIQUE INDEX "SpecialDay_venueId_date_key" ON "SpecialDay"("venueId", "date");

-- CreateIndex
CREATE INDEX "Customer_venueId_lastName_idx" ON "Customer"("venueId", "lastName");

-- CreateIndex
CREATE UNIQUE INDEX "Customer_venueId_phone_key" ON "Customer"("venueId", "phone");

-- CreateIndex
CREATE UNIQUE INDEX "Reservation_code_key" ON "Reservation"("code");

-- CreateIndex
CREATE UNIQUE INDEX "Reservation_manageToken_key" ON "Reservation"("manageToken");

-- CreateIndex
CREATE INDEX "Reservation_venueId_date_idx" ON "Reservation"("venueId", "date");

-- CreateIndex
CREATE INDEX "Reservation_venueId_startAt_idx" ON "Reservation"("venueId", "startAt");

-- CreateIndex
CREATE INDEX "WaitlistEntry_venueId_status_idx" ON "WaitlistEntry"("venueId", "status");
