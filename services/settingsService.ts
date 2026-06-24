import { settingsRepository } from "@/repositories/settingsRepository";
import { accountRepository } from "@/repositories/accountRepository";
import { templateRepository } from "@/repositories/templateRepository";
import { budgetRepository } from "@/repositories/budgetRepository";
import { prisma } from "@/lib/prisma";
import { seedBudgetLimitsIfEmpty } from "@/lib/seedBudgetLimits";
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
    const budgetLimits = await seedBudgetLimitsIfEmpty(userId);

    const now = new Date();
    const twelveMonthsAgo = new Date(now.getFullYear(), now.getMonth() - 11, 1);
    const paidTxs = await prisma.transaction.findMany({
      where: {
        userId,
        date: { gte: twelveMonthsAgo },
        isTemplate: true,
      },
      select: {
        description: true,
        date: true,
      },
    });

    const paidTemplateNamesThisMonth: string[] = [];

    for (const template of templates) {
      const interval = template.intervalMonths || 1;
      const windowStart = new Date(now.getFullYear(), now.getMonth() - interval + 1, 1);

      const hasPayment = paidTxs.some((tx) => {
        if (!tx.description) return false;
        return (
          tx.description.startsWith(template.name) &&
          new Date(tx.date) >= windowStart
        );
      });

      if (hasPayment) {
        paidTemplateNamesThisMonth.push(template.name);
      }
    }

    // For Credit Card bills (always monthly, so interval = 1)
    const ccAccounts = accounts.filter((acc) => acc.type === "credit_card" && acc.isActive);
    for (const acc of ccAccounts) {
      const windowStart = new Date(now.getFullYear(), now.getMonth(), 1);
      const ccPaidName = `CC Payoff: ${acc.name}`;
      const hasCcPayment = paidTxs.some((tx) => {
        if (!tx.description) return false;
        return (
          tx.description.includes(ccPaidName) &&
          new Date(tx.date) >= windowStart
        );
      });
      if (hasCcPayment) {
        paidTemplateNamesThisMonth.push(ccPaidName);
      }
    }

    const bills = await prisma.billFriend.findMany({
      where: { userId },
      select: { personName: true },
    });
    const friendNames = Array.from(
      new Set(bills.map((b) => b.personName.trim()))
    ).filter(Boolean);

    return {
      userSettings,
      accounts,
      templates,
      budgetLimits,
      profile,
      paidTemplateNamesThisMonth,
      friendNames,
    };
  },
};
