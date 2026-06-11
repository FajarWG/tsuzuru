import { prisma } from "./prisma";

export async function seedUserFinancialData(userId: string) {
  // Check if settings already exist
  const existingSettings = await prisma.userSettings.findUnique({
    where: { userId },
  });

  if (existingSettings) {
    // User data is already seeded
    return;
  }

  // 1. Create Default Settings
  const settings = await prisma.userSettings.create({
    data: {
      userId,
      monthlyBudget: 150000, // Default: 150,000 JPY
      pocketMoneyLimit: 40000, // Default: 40,000 JPY
      shoppingLimit: 60000,  // Default: 60,000 JPY
      budgetCurrency: "JPY",
    },
  });

  // 2. Create Default Accounts
  const jago = await prisma.account.create({
    data: {
      userId,
      name: "Jago",
      currency: "IDR",
      balance: 5000000, // Rp 5.000.000 default balance
      type: "bank",
    },
  });

  const yucho = await prisma.account.create({
    data: {
      userId,
      name: "Yucho Bank",
      currency: "JPY",
      balance: 100000, // ¥100,000 default balance
      type: "bank",
    },
  });

  const paypay = await prisma.account.create({
    data: {
      userId,
      name: "PayPay",
      currency: "JPY",
      balance: 20000, // ¥20,000 default balance
      type: "ewallet",
    },
  });

  const paypayInvest = await prisma.account.create({
    data: {
      userId,
      name: "PayPay Investasi",
      currency: "JPY",
      balance: 50000, // ¥50,000 default balance
      type: "investment",
    },
  });

  // 3. Create Default Monthly Templates linked to their respective Accounts
  await prisma.monthlyTemplate.createMany({
    data: [
      {
        userId,
        name: "Apato (家賃)",
        amount: 55000,
        currency: "JPY",
        accountId: yucho.id,
      },
      {
        userId,
        name: "Listrik (電気)",
        amount: 6000,
        currency: "JPY",
        accountId: paypay.id,
      },
      {
        userId,
        name: "Air (水道)",
        amount: 3000,
        currency: "JPY",
        accountId: paypay.id,
      },
      {
        userId,
        name: "Gas (ガス)",
        amount: 4000,
        currency: "JPY",
        accountId: paypay.id,
      },
      {
        userId,
        name: "Kartu SIM",
        amount: 2500,
        currency: "JPY",
        accountId: paypay.id,
      },
    ],
  });

  console.log(`Seeded default financial data for user ${userId}`);
}
