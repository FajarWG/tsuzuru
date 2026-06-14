import { accountRepository } from "@/repositories/accountRepository";
import { CreateAccountInput, UpdateAccountInput } from "@/types/account";

export const accountService = {
  async updateAccountBalanceWithHistory(accountId: string, newBalance: number, userId: string, reason?: string) {
    const account = await accountRepository.findById(accountId, userId);
    if (!account) {
      throw new Error("Account not found");
    }

    const diff = newBalance - account.balance;
    if (diff === 0) {
      await accountRepository.update(accountId, userId, { balance: newBalance });
      return;
    }

    const isIncrease = diff > 0;

    await accountRepository.updateBalanceWithAdjustmentTransaction({
      userId,
      accountId,
      newBalance,
      amount: Math.abs(diff),
      type: isIncrease ? "income" : "expense",
      currency: account.currency,
      description: reason?.trim() || "Balance adjustment",
    });
  },

  async updateAccountName(accountId: string, name: string, isActive: boolean, userId: string) {
    await accountRepository.update(accountId, userId, {
      name: name.trim(),
      isActive,
    });
  },

  async createAccount(data: CreateAccountInput, userId: string) {
    return accountRepository.create({
      userId,
      name: data.name.trim(),
      currency: data.currency,
      balance: data.balance,
      type: data.type,
      isActive: true,
      defaultPaymentAccountId: data.type === "credit_card" ? data.defaultPaymentAccountId || null : null,
    });
  },

  async updateAccount(accountId: string, data: UpdateAccountInput, userId: string) {
    return accountRepository.update(accountId, userId, {
      name: data.name.trim(),
      currency: data.currency,
      balance: data.balance,
      type: data.type,
      isActive: data.isActive,
      defaultPaymentAccountId: data.type === "credit_card" ? data.defaultPaymentAccountId || null : null,
    });
  },

  async deleteAccount(accountId: string, userId: string) {
    await accountRepository.deleteWithAssociations(accountId, userId);
  },
};
