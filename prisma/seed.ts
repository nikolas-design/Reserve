// Demo data: one venue with areas, tables, shifts, a few customers and
// reservations for today, plus an owner login. Run with `npm run db:seed`.

import { PrismaClient, type Customer } from "@prisma/client";
import bcrypt from "bcryptjs";
import { reservationCode, secretToken } from "../src/lib/ids";
import { addDaysYmd, todayYmd, zonedToUtc } from "../src/lib/time";

const prisma = new PrismaClient();

async function main() {
  const passwordHash = await bcrypt.hash("reserve123", 10);
  const owner = await prisma.user.upsert({
    where: { email: "owner@reserve.local" },
    update: {},
    create: { email: "owner@reserve.local", name: "Νίκος", passwordHash },
  });

  const venue = await prisma.venue.upsert({
    where: { slug: "metropolis" },
    update: {},
    create: {
      slug: "metropolis",
      name: "Metropolis Roof Garden",
      tagline: "Bar-Restaurant με θέα την Ακρόπολη",
      description:
        "Μοντέρνα ελληνική κουζίνα και cocktails στον 7ο όροφο, δίπλα στο Σύνταγμα.",
      phone: "+30 210 000 0000",
      email: "hello@metropolis.example",
      address: "Μητροπόλεως 1",
      city: "Αθήνα",
      logoText: "MR",
      termsText:
        "Σε καθυστέρηση άνω των 20 λεπτών χωρίς ενημέρωση, η κράτηση μπορεί να ακυρωθεί. Παρακαλούμε ενημερώστε μας για αλλεργίες ή διατροφικές ανάγκες.",
    },
  });

  await prisma.venueMember.upsert({
    where: { userId_venueId: { userId: owner.id, venueId: venue.id } },
    update: { role: "OWNER" },
    create: { userId: owner.id, venueId: venue.id, role: "OWNER" },
  });

  const existingAreas = await prisma.area.count({ where: { venueId: venue.id } });
  if (existingAreas === 0) {
    const terrace = await prisma.area.create({
      data: { venueId: venue.id, name: "Βεράντα", sortOrder: 0 },
    });
    const indoor = await prisma.area.create({
      data: { venueId: venue.id, name: "Εσωτερικά", sortOrder: 1 },
    });
    const bar = await prisma.area.create({
      data: { venueId: venue.id, name: "Μπαρ", sortOrder: 2, isOnlineBookable: false },
    });

    type T = [string, string, number, number, string, number, number, number, number];
    const tables: T[] = [
      // name, areaId, min, max, shape, x, y, w, h
      ["T1", terrace.id, 1, 2, "RECT", 0, 0, 2, 2],
      ["T2", terrace.id, 1, 2, "RECT", 3, 0, 2, 2],
      ["T3", terrace.id, 2, 4, "RECT", 6, 0, 3, 2],
      ["T4", terrace.id, 2, 4, "RECT", 10, 0, 3, 2],
      ["T5", terrace.id, 4, 6, "ROUND", 0, 3, 3, 3],
      ["T6", terrace.id, 4, 6, "ROUND", 4, 3, 3, 3],
      ["T7", terrace.id, 2, 4, "RECT", 8, 3, 3, 2],
      ["T8", terrace.id, 2, 4, "RECT", 12, 3, 3, 2],
      ["T10", indoor.id, 1, 2, "RECT", 0, 0, 2, 2],
      ["T11", indoor.id, 2, 4, "RECT", 3, 0, 3, 2],
      ["T12", indoor.id, 2, 4, "RECT", 7, 0, 3, 2],
      ["T13", indoor.id, 2, 4, "RECT", 11, 0, 3, 2],
      ["T14", indoor.id, 6, 8, "RECT", 0, 3, 5, 2],
      ["T15", indoor.id, 4, 6, "ROUND", 6, 3, 3, 3],
      ["T16", indoor.id, 2, 4, "RECT", 10, 3, 3, 2],
      ["B1", bar.id, 1, 2, "ROUND", 0, 0, 2, 2],
      ["B2", bar.id, 1, 2, "ROUND", 3, 0, 2, 2],
      ["B3", bar.id, 1, 2, "ROUND", 6, 0, 2, 2],
      ["B4", bar.id, 1, 2, "ROUND", 9, 0, 2, 2],
    ];
    await prisma.table.createMany({
      data: tables.map(([name, areaId, minSeats, maxSeats, shape, x, y, w, h], i) => ({
        venueId: venue.id,
        areaId,
        name,
        minSeats,
        maxSeats,
        shape,
        x,
        y,
        w,
        h,
        sortOrder: i,
      })),
    });

    await prisma.shift.createMany({
      data: [
        {
          venueId: venue.id,
          name: "Μεσημέρι",
          daysOfWeek: "0,6",
          startTime: "13:00",
          endTime: "17:00",
          lastSeatingOffset: 90,
        },
        {
          venueId: venue.id,
          name: "Δείπνο",
          daysOfWeek: "0,1,2,3,4,5,6",
          startTime: "19:00",
          endTime: "00:30",
          lastSeatingOffset: 90,
          maxCoversPerSlot: 30,
        },
      ],
    });
  }

  // A few customers + reservations for today and tomorrow.
  const existingRes = await prisma.reservation.count({ where: { venueId: venue.id } });
  if (existingRes === 0) {
    const today = todayYmd(venue.timezone);
    const tomorrow = addDaysYmd(today, 1);
    const allTables = await prisma.table.findMany({ where: { venueId: venue.id } });
    const byName = Object.fromEntries(allTables.map((t) => [t.name, t]));

    const guests = [
      { firstName: "Μαρία", lastName: "Παπαδοπούλου", phone: "+306900000001", email: "maria@example.com", isVip: true, allergies: "χωρίς γλουτένη", visits: 12 },
      { firstName: "Γιώργος", lastName: "Κωνσταντίνου", phone: "+306900000002", email: "giorgos@example.com", visits: 3 },
      { firstName: "Elena", lastName: "Rossi", phone: "+393330000003", email: "elena@example.com", visits: 2 },
      { firstName: "Δημήτρης", lastName: "Λαμπρόπουλος", phone: "+306900000004", visits: 1, noShows: 1 },
      { firstName: "Κατερίνα", lastName: "Μ.", phone: "+306900000005", visits: 0 },
    ];
    const customers: Customer[] = [];
    for (const g of guests) {
      customers.push(
        await prisma.customer.create({ data: { venueId: venue.id, ...g } }),
      );
    }

    const mk = (
      c: (typeof customers)[number],
      ymd: string,
      hm: string,
      partySize: number,
      status: string,
      source: string,
      tableNames: string[],
      extra: Record<string, unknown> = {},
    ) => {
      const startAt = zonedToUtc(ymd, hm, venue.timezone);
      const endAt = new Date(startAt.getTime() + venue.defaultDurationMin * 60000);
      return prisma.reservation.create({
        data: {
          venueId: venue.id,
          customerId: c.id,
          code: reservationCode(),
          manageToken: secretToken(),
          date: ymd,
          startAt,
          endAt,
          partySize,
          status,
          source,
          confirmedAt: status === "PENDING" ? null : new Date(),
          tables: { create: tableNames.map((n) => ({ tableId: byName[n].id })) },
          ...extra,
        },
      });
    };

    await mk(customers[0], today, "19:30", 2, "CONFIRMED", "WEBSITE", ["T1"], { guestNotes: "Τραπέζι με θέα αν γίνεται" });
    await mk(customers[1], today, "20:00", 6, "CONFIRMED", "PHONE", ["T14"], { occasion: "birthday" });
    await mk(customers[2], today, "21:00", 3, "CONFIRMED", "GOOGLE", ["T11"]);
    await mk(customers[3], today, "21:30", 2, "PENDING", "INSTAGRAM", ["T2"]);
    await mk(customers[4], tomorrow, "20:30", 4, "CONFIRMED", "WEBSITE", ["T3"]);
  }

  console.log("Seeded venue:", venue.slug, "| login: owner@reserve.local / reserve123");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
