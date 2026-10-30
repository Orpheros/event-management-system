import bcrypt from "bcryptjs";
import { AppDataSource } from "./database.js";
import { User } from "../../modules/user/entities/user.entity.js";
import { ChekiPrice } from "../../modules/setting/entities/cheki-price.entity.js";
import { Member } from "../../modules/member/entities/member.entity.js";
import { Event } from "../../modules/event/entities/event.entity.js";

export async function seedDatabase() {
  if (!AppDataSource.isInitialized) {
    console.warn("⚠️ Cannot seed database: AppDataSource is not initialized.");
    return;
  }

  console.log("🌱 Seeding database...");

  // 1. Superadmin User
  const userRepo = AppDataSource.getRepository(User);
  const existingAdmin = await userRepo.findOneBy({ email: "xemmo25@gmail.com" });
  if (!existingAdmin) {
    const admin = new User();
    admin.id = "xemmoadmin0001";
    admin.email = "xemmo25@gmail.com";
    admin.passwordHash = await bcrypt.hash("password123", 10);
    admin.name = "Super Admin";
    admin.avatar = "";
    admin.stellarRole = "admin";
    admin.emailVisibility = true;
    admin.verified = true;
    await userRepo.save(admin);
    console.log("✅ Seeded superadmin: xemmo25@gmail.com / password123");
  }

  // 2. Cheki Prices
  const priceRepo = AppDataSource.getRepository(ChekiPrice);
  const existingPo = await priceRepo.findOneBy({ type: "po" });
  if (!existingPo) {
    const po = new ChekiPrice();
    po.id = "cheki_price_po0";
    po.type = "po";
    po.price = 35000;
    await priceRepo.save(po);
  }

  const existingOts = await priceRepo.findOneBy({ type: "ots" });
  if (!existingOts) {
    const ots = new ChekiPrice();
    ots.id = "cheki_price_ots";
    ots.type = "ots";
    ots.price = 40000;
    await priceRepo.save(ots);
  }
  console.log("✅ Seeded default Cheki prices (PO: 35000, OTS: 40000)");

  // 3. Members
  const memberRepo = AppDataSource.getRepository(Member);
  const memberCount = await memberRepo.count();
  if (memberCount === 0) {
    const membersData = [
      {
        id: "l17syk3g4nslfkb",
        slug: "maricel",
        name: "Maricel",
        role: "Lead Vocalist",
        hobby: "Singing, Reading",
        notes: "Center member of Stellar Luna",
        birthdate: "2004-03-15",
        image: "maricel.jpg",
        instagram: "https://instagram.com/maricel",
      },
      {
        id: "m88tyk3g4nslfa1",
        slug: "rakun",
        name: "Rakun",
        role: "Main Dancer",
        hobby: "Dancing, Gaming",
        notes: "Energetic dancer",
        birthdate: "2005-07-20",
        image: "rakun.jpg",
        instagram: "https://instagram.com/rakun",
      },
      {
        id: "y99tyk3g4nslfb2",
        slug: "yenna",
        name: "Yenna",
        role: "Visual & Vocalist",
        hobby: "Cooking, Photography",
        notes: "Charming visual",
        birthdate: "2004-11-02",
        image: "yenna.jpg",
        instagram: "https://instagram.com/yenna",
      },
    ];

    for (const data of membersData) {
      const member = new Member();
      Object.assign(member, data);
      await memberRepo.save(member);
    }
    console.log("✅ Seeded initial Stellar Luna members");
  }

  // 4. Sample Event
  const eventRepo = AppDataSource.getRepository(Event);
  const eventCount = await eventRepo.count();
  if (eventCount === 0) {
    const event = new Event();
    event.id = "5hot6qw6t16064o";
    event.title = "Event Stellar Luna";
    event.description = "JIEXPO Event";
    event.location = "Lippo Kramat Jati";
    event.startDate = new Date("2026-04-22T00:00:00.000Z");
    event.endDate = new Date("2026-04-22T00:00:00.000Z");
    event.variant = "success";
    event.status = "pre_sale";
    await eventRepo.save(event);
    console.log("✅ Seeded initial sample event");
  }

  console.log("✨ Seeding completed.");
}

// Allow running standalone: tsx src/config/database/seed.ts
if (process.argv[1]?.endsWith("seed.ts") || process.argv[1]?.endsWith("seed.js")) {
  AppDataSource.initialize()
    .then(async () => {
      await seedDatabase();
      process.exit(0);
    })
    .catch((err) => {
      console.error("Failed to seed database:", err);
      process.exit(1);
    });
}
