import { settingsRepository } from "@/repositories/settingsRepository";
import { accountRepository } from "@/repositories/accountRepository";
import { templateRepository } from "@/repositories/templateRepository";
import { budgetRepository } from "@/repositories/budgetRepository";
import { prisma } from "@/lib/prisma";
import { UpdateUserSettingsInput, OnboardingInput } from "@/types/settings";
import { AccountUpdateItem } from "@/types/account";

export const settingsService = {
  async updateUserSettings(data: UpdateUserSettingsInput) {
    return settingsRepository.updateUserSettings(data.userId, {
      monthlyBudget: data.monthlyBudget,
      pocketMoneyLimit: data.pocketMoneyLimit,
      shoppingLimit: data.shoppingLimit,
      budgetCurrency: data.budgetCurrency,
    });
  },

  async updateAccounts(userId: string, accounts: AccountUpdateItem[]) {
    return accountRepository.updateMany(userId, accounts);
  },

  async resetUserSettingsAndData(userId: string) {
    return settingsRepository.resetUserSettingsAndData(userId);
  },

  async completeOnboarding(data: OnboardingInput) {
    return settingsRepository.completeOnboarding({
      userId: data.userId,
      currency: data.currency,
      monthlyBudget: data.monthlyBudget,
      pocketMoneyLimit: data.pocketMoneyLimit,
      shoppingLimit: data.shoppingLimit,
      accounts: data.accounts,
      templates: data.templates,
    });
  },

  async getUserSettingsData(userId: string, profile: { name: string | null; email: string | null; image: string | null }) {
    let userSettings = await settingsRepository.findUserSettings(userId);

    if (!userSettings) {
      userSettings = await settingsRepository.createUserSettings({
        userId,
        monthlyBudget: 150000,
        pocketMoneyLimit: 40000,
        shoppingLimit: 60000,
        budgetCurrency: "JPY",
        isOnboarded: false,
      });
    }

    const accounts = await accountRepository.findMany(userId);
    const templates = await templateRepository.findMany(userId);
    let budgetLimits = await budgetRepository.findMany(userId);

    if (budgetLimits.length === 0) {
      const defaultLimits = [
        { name: "monthly", label: "Monthly Expected Budget", limit: userSettings.monthlyBudget || 150000 },
        { name: "pocket_money", label: "Pocket Money", limit: userSettings.pocketMoneyLimit || 40000 },
        { name: "shopping", label: "Shopping", limit: userSettings.shoppingLimit || 60000 },
      ];

      await budgetRepository.createMany(
        defaultLimits.map((dl) => ({
          userId,
          name: dl.name,
          label: dl.label,
          limit: dl.limit,
        }))
      );

      budgetLimits = await budgetRepository.findMany(userId);
    }

    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const paidTxs = await prisma.transaction.findMany({
      where: {
        userId,
        date: { gte: startOfMonth },
        isTemplate: true,
      },
      select: {
        description: true,
      },
    });
    const paidTemplateNamesThisMonth = paidTxs
      .map((tx) => tx.description)
      .filter((desc): desc is string => !!desc);

    return {
      userSettings,
      accounts,
      templates,
      budgetLimits,
      profile,
      paidTemplateNamesThisMonth,
    };
  },
};
