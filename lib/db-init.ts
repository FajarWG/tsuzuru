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

  // 1. Create Default Settings with isOnboarded = false
  await prisma.userSettings.create({
    data: {
      userId,
      monthlyBudget: 0,
      pocketMoneyLimit: 0,
      shoppingLimit: 0,
      budgetCurrency: "JPY",
      isOnboarded: false,
    },
  });

  console.log(`Initialized empty settings (onboarding required) for user ${userId}`);
}
