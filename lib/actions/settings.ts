"use server";

import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";

interface UpdateUserSettingsInput {
  userId: string;
  monthlyBudget: number;
  pocketMoneyLimit: number;
  shoppingLimit: number;
  budgetCurrency?: string;
}

export async function updateUserSettingsAction(data: UpdateUserSettingsInput) {
  try {
    await prisma.userSettings.update({
      where: { userId: data.userId },
      data: {
        monthlyBudget: data.monthlyBudget,
        pocketMoneyLimit: data.pocketMoneyLimit,
        shoppingLimit: data.shoppingLimit,
        budgetCurrency: data.budgetCurrency,
      },
    });

    revalidatePath("/");
    revalidatePath("/settings");

    return { success: true };
  } catch (error) {
    console.error("Failed to update user settings:", error);
    return { success: false, error: (error as Error).message };
  }
}

interface AccountUpdateItem {
  id: string;
  name: string;
  balance: number;
  isActive: boolean;
}

export async function updateAccountsAction(
  userId: string,
  accounts: AccountUpdateItem[]
) {
  try {
    await prisma.$transaction(
      accounts.map((acc) =>
        prisma.account.update({
          where: { id: acc.id, userId },
          data: {
            name: acc.name,
            balance: acc.balance,
            isActive: acc.isActive,
          },
        })
      )
    );

    revalidatePath("/");
    revalidatePath("/settings");
    revalidatePath("/transactions");
    revalidatePath("/monthly-templates");

    return { success: true };
  } catch (error) {
    console.error("Failed to update accounts:", error);
    return { success: false, error: (error as Error).message };
  }
}

export async function resetUserSettingsAndDataAction() {
  const session = await auth();
  if (!session?.user?.id) return { success: false, error: "Unauthorized" };
  const userId = session.user.id;

  try {
    // Delete user's related data and reset settings in a transaction
    await prisma.$transaction([
      prisma.transaction.deleteMany({
        where: { userId },
      }),
      prisma.monthlyTemplate.deleteMany({
        where: { userId },
      }),
      prisma.billFriend.deleteMany({
        where: { userId },
      }),
      prisma.account.deleteMany({
        where: { userId },
      }),
      prisma.userSettings.update({
        where: { userId },
        data: {
          monthlyBudget: 0,
          pocketMoneyLimit: 0,
          shoppingLimit: 0,
          budgetCurrency: "JPY", // reset to default currency
          isOnboarded: false,
        },
      }),
    ]);

    revalidatePath("/");
    revalidatePath("/settings");
    revalidatePath("/transactions");
    revalidatePath("/monthly-templates");

    return { success: true };
  } catch (error) {
    console.error("Failed to reset user settings and data:", error);
    return { success: false, error: (error as Error).message };
  }
}

interface OnboardingInput {
  userId: string;
  currency: string;
  monthlyBudget: number;
  pocketMoneyLimit: number;
  shoppingLimit: number;
  accounts: {
    name: string;
    balance: number;
    type: string;
  }[];
  templates: {
    name: string;
    amount: number;
    accountName: string;
  }[];
}

export async function completeOnboardingAction(data: OnboardingInput) {
  try {
    await prisma.$transaction(async (tx) => {
      // 1. Update user settings with onboarding values
      await tx.userSettings.update({
        where: { userId: data.userId },
        data: {
          monthlyBudget: data.monthlyBudget,
          pocketMoneyLimit: data.pocketMoneyLimit,
          shoppingLimit: data.shoppingLimit,
          budgetCurrency: data.currency,
          isOnboarded: true,
        },
      });

      // 2. Create the chosen financial accounts
      const createdAccounts: Record<string, string> = {};
      for (const acc of data.accounts) {
        const dbAcc = await tx.account.create({
          data: {
            userId: data.userId,
            name: acc.name,
            currency: data.currency,
            balance: acc.balance,
            type: acc.type,
          },
        });
        createdAccounts[acc.name] = dbAcc.id;
      }

      // 3. Create the monthly template bills linked to accounts
      if (data.templates && data.templates.length > 0) {
        const templatesData = data.templates.map((tpl) => {
          const accountId = createdAccounts[tpl.accountName];
          if (!accountId) {
            throw new Error(`Account ID not found for account name: ${tpl.accountName}`);
          }
          return {
            userId: data.userId,
            name: tpl.name,
            amount: tpl.amount,
            currency: data.currency,
            accountId,
          };
        });

        await tx.monthlyTemplate.createMany({
          data: templatesData,
        });
      }
    });

    revalidatePath("/");
    revalidatePath("/settings");

    return { success: true };
  } catch (error) {
    console.error("Failed to complete onboarding:", error);
    return { success: false, error: (error as Error).message };
  }
}

export async function getUserSettingsDataAction() {
  const session = await auth();
  if (!session || !session.user || !session.user.id) {
    return { success: false, error: "Unauthorized" };
  }

  const userId = session.user.id;

  try {
    let userSettings = await prisma.userSettings.findUnique({
      where: { userId },
    });

    if (!userSettings) {
      userSettings = await prisma.userSettings.create({
        data: {
          userId,
          monthlyBudget: 150000,
          pocketMoneyLimit: 40000,
          shoppingLimit: 60000,
          budgetCurrency: "JPY",
        },
      });
    }

    const accounts = await prisma.account.findMany({
      where: { userId },
      orderBy: { name: "asc" },
    });

    const templates = await prisma.monthlyTemplate.findMany({
      where: { userId },
      orderBy: { name: "asc" },
    });

    let budgetLimits = await prisma.budgetLimit.findMany({
      where: { userId },
      orderBy: { createdAt: "asc" },
    });

    if (budgetLimits.length === 0) {
      const defaultLimits = [
        { name: "monthly", label: "Monthly Expected Budget", limit: userSettings.monthlyBudget || 150000 },
        { name: "pocket_money", label: "Pocket Money", limit: userSettings.pocketMoneyLimit || 40000 },
        { name: "shopping", label: "Shopping", limit: userSettings.shoppingLimit || 60000 },
      ];

      await prisma.budgetLimit.createMany({
        data: defaultLimits.map((dl) => ({
          userId,
          name: dl.name,
          label: dl.label,
          limit: dl.limit,
        })),
      });

      budgetLimits = await prisma.budgetLimit.findMany({
        where: { userId },
        orderBy: { createdAt: "asc" },
      });
    }

    return {
      success: true,
      data: {
        userSettings,
        accounts,
        templates,
        budgetLimits,
        profile: {
          name: session.user.name || null,
          email: session.user.email || null,
          image: session.user.image || null,
        },
      },
    };
  } catch (error) {
    console.error("Failed to fetch settings data:", error);
    return { success: false, error: "Failed to fetch settings data" };
  }
}

