import { transactionRepository } from "@/repositories/transactionRepository";
import { accountRepository } from "@/repositories/accountRepository";
import { CreateTransactionInput, UpdateTransactionInput } from "@/types/transaction";

function getBalanceDelta(type: "expense" | "income", amount: number) {
  return type === "expense" ? -amount : amount;
}

export const transactionService = {
  async createTransaction(data: CreateTransactionInput, userId: string) {
    const account = await accountRepository.findById(data.accountId);

    if (!account) {
      throw new Error("Account not found");
    }

    if (!account.isActive) {
      throw new Error("Selected account is inactive");
    }

    const transactionDate = data.date || new Date();
    const newBalance = account.balance + getBalanceDelta(data.type, data.amount);

    const [newTx] = await transactionRepository.createWithBalanceUpdate(
      {
        userId: userId,
        accountId: data.accountId,
        type: data.type,
        amount: data.amount,
        currency: account.currency,
        category: data.category,
        subCategory: data.subCategory,
        mealNumber: data.mealNumber,
        description: data.description,
        date: transactionDate,
        isReceipt: data.isReceipt ?? false,
        receiptItems: data.receiptItems ?? null,
      },
      data.accountId,
      newBalance
    );

    return newTx;
  },

  async updateTransaction(data: UpdateTransactionInput, userId: string) {
    if (!data.amount || data.amount <= 0) {
      throw new Error("Please enter a valid amount");
    }

    const existing = await transactionRepository.findById(data.id, userId);

    if (!existing) {
      throw new Error("Transaction not found");
    }

    const account = await accountRepository.findById(data.accountId, userId);

    if (!account) {
      throw new Error("Account not found");
    }

    if (!account.isActive) {
      throw new Error("Selected account is inactive");
    }

    const oldDelta = getBalanceDelta(existing.type as "expense" | "income", existing.amount);
    const newDelta = getBalanceDelta(data.type, data.amount);

    await transactionRepository.updateWithBalanceUpdate({
      transactionId: data.id,
      txData: {
        accountId: data.accountId,
        type: data.type,
        amount: data.amount,
        currency: account.currency,
        category: data.category,
        subCategory: data.subCategory,
        mealNumber: data.mealNumber,
        description: data.description,
        date: data.date || existing.date,
        isReceipt: data.isReceipt ?? existing.isReceipt,
        receiptItems: data.receiptItems !== undefined ? data.receiptItems : existing.receiptItems,
      },
      oldAccountId: existing.accountId,
      newAccountId: data.accountId,
      oldDelta,
      newDelta,
    });
  },

  async deleteTransaction(transactionId: string, userId: string) {
    const existing = await transactionRepository.findById(transactionId, userId);

    if (!existing) {
      throw new Error("Transaction not found");
    }

    const oldDelta = getBalanceDelta(existing.type as "expense" | "income", existing.amount);

    await transactionRepository.deleteWithBalanceUpdate(transactionId, existing.accountId, -oldDelta);
  },

  async getTransactionsData(userId: string) {
    const transactionsRaw = await transactionRepository.findMany(userId);
    const accounts = await accountRepository.findMany(userId);

    // Serialize Dates
    const transactions = transactionsRaw.map((tx) => ({
      ...tx,
      date: tx.date.toISOString(),
    }));

    return {
      transactions,
      accounts,
    };
  },
};
