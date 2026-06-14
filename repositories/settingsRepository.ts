import { prisma } from "@/lib/prisma";
import { Prisma } from "@prisma/client";

export const settingsRepository = {
  async findUserSettings(userId: string) {
    return prisma.userSettings.findUnique({
      where: { userId },
    });
  },

  async createUserSettings(data: Prisma.UserSettingsUncheckedCreateInput) {
    return prisma.userSettings.create({
      data,
    });
  },

  async updateUserSettings(userId: string, data: Prisma.UserSettingsUpdateInput) {
    return prisma.userSettings.update({
      where: { userId },
      data,
    });
  },

  async resetUserSettingsAndData(userId: string) {
    return prisma.$transaction([
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
      prisma.budgetLimit.deleteMany({
        where: { userId },
      }),
      prisma.userSettings.update({
        where: { userId },
        data: {
          monthlyBudget: 0,
          pocketMoneyLimit: 0,
          shoppingLimit: 0,
          budgetCurrency: "JPY",
          isOnboarded: false,
        },
      }),
    ]);
  },

  async completeOnboarding(params: {
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
  }) {
    const { userId, currency, monthlyBudget, pocketMoneyLimit, shoppingLimit, accounts, templates } = params;

    return prisma.$transaction(async (tx) => {
      // 1. Update user settings with onboarding values
      await tx.userSettings.update({
        where: { userId },
        data: {
          monthlyBudget,
          pocketMoneyLimit,
          shoppingLimit,
          budgetCurrency: currency,
          isOnboarded: true,
        },
      });

      // 2. Create the chosen financial accounts
      const createdAccounts: Record<string, string> = {};
      for (const acc of accounts) {
        const dbAcc = await tx.account.create({
          data: {
            userId,
            name: acc.name,
            currency: currency,
            balance: acc.balance,
            type: acc.type,
          },
        });
        createdAccounts[acc.name] = dbAcc.id;
      }

      // 3. Create the monthly template bills linked to accounts
      if (templates && templates.length > 0) {
        const templatesData = templates.map((tpl) => {
          const accountId = createdAccounts[tpl.accountName];
          if (!accountId) {
            throw new Error(`Account ID not found for account name: ${tpl.accountName}`);
          }
          return {
            userId,
            name: tpl.name,
            amount: tpl.amount,
            currency: currency,
            accountId,
          };
        });

        await tx.monthlyTemplate.createMany({
          data: templatesData,
        });
      }
    });
  },
};
