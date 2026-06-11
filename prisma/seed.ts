import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import pg from "pg";
import "dotenv/config";

const pool = new pg.Pool({
  connectionString: process.env.DATABASE_URL,
});
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

async function main() {
  console.log("Seeding test user...");
  const email = "test@example.com";
  
  const user = await prisma.user.upsert({
    where: { email },
    update: {},
    create: {
      email,
      name: "Test User",
      image: "https://api.dicebear.com/7.x/adventurer/svg?seed=test",
    },
  });

  const existingSettings = await prisma.userSettings.findUnique({
    where: { userId: user.id },
  });

  if (!existingSettings) {
    await prisma.userSettings.create({
      data: {
        userId: user.id,
        monthlyBudget: 150000,
        pocketMoneyLimit: 40000,
        shoppingLimit: 60000,
        budgetCurrency: "JPY",
      },
    });

    const jago = await prisma.account.create({
      data: {
        userId: user.id,
        name: "Jago",
        currency: "IDR",
        balance: 5000000,
        type: "bank",
      },
    });

    const yucho = await prisma.account.create({
      data: {
        userId: user.id,
        name: "Yucho Bank",
        currency: "JPY",
        balance: 100000,
        type: "bank",
      },
    });

    const paypay = await prisma.account.create({
      data: {
        userId: user.id,
        name: "PayPay",
        currency: "JPY",
        balance: 20000,
        type: "ewallet",
      },
    });

    const paypayInvest = await prisma.account.create({
      data: {
        userId: user.id,
        name: "PayPay Investasi",
        currency: "JPY",
        balance: 50000,
        type: "investment",
      },
    });

    await prisma.monthlyTemplate.createMany({
      data: [
        {
          userId: user.id,
          name: "Apato (家賃)",
          amount: 55000,
          currency: "JPY",
          accountId: yucho.id,
        },
        {
          userId: user.id,
          name: "Listrik (電気)",
          amount: 6000,
          currency: "JPY",
          accountId: paypay.id,
        },
        {
          userId: user.id,
          name: "Air (水道)",
          amount: 3000,
          currency: "JPY",
          accountId: paypay.id,
        },
        {
          userId: user.id,
          name: "Gas (ガス)",
          amount: 4000,
          currency: "JPY",
          accountId: paypay.id,
        },
        {
          userId: user.id,
          name: "Kartu SIM",
          amount: 2500,
          currency: "JPY",
          accountId: paypay.id,
        },
      ],
    });
    console.log("Seeding test user data completed.");
  } else {
    console.log("Test user financial data already seeded.");
  }
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
    await pool.end();
  });
