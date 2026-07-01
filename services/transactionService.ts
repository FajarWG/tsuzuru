import { transactionRepository } from "@/repositories/transactionRepository";
import { accountRepository } from "@/repositories/accountRepository";
import { billFriendRepository } from "@/repositories/billFriendRepository";
import { prisma } from "@/lib/prisma";
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

    if (existing.transferGroupId) {
      const { transferService } = await import("./transferService");
      await transferService.deleteTransfer(existing.transferGroupId, userId);
      return;
    }

    const oldDelta = getBalanceDelta(existing.type as "expense" | "income", existing.amount);

    await transactionRepository.deleteWithBalanceUpdate(transactionId, existing.accountId, -oldDelta);
  },

  async getTransactionsData(userId: string) {
    const transactionsRaw = await transactionRepository.findMany(userId);
    const accounts = await accountRepository.findMany(userId);

    // Resolve splitGroupIds from transactions
    const splitGroupIds: string[] = [];
    transactionsRaw.forEach((tx) => {
      const match = tx.description ? tx.description.match(/\[tx_id:([^\]]+)\]/) : null;
      const id = match ? match[1] : tx.splitGroupId;
      if (id) splitGroupIds.push(id);
    });

    let adjustmentsMap: Record<string, number> = {};
    let billFriendsMap: Record<string, any[]> = {};

    if (splitGroupIds.length > 0) {
      // Fetch adjustments
      const adjustments = await prisma.transaction.findMany({
        where: {
          userId,
          OR: [
            {
              category: "adjustment",
              OR: [
                { splitGroupId: { in: splitGroupIds } },
                ...splitGroupIds.map((id) => ({
                  description: { contains: `[tx_id:${id}]` },
                })),
              ],
            },
            {
              description: { startsWith: "Settled Bill with" },
              OR: [
                { splitGroupId: { in: splitGroupIds } },
                ...splitGroupIds.map((id) => ({
                  description: { contains: `[tx_id:${id}]` },
                })),
              ],
            },
          ],
        },
        select: {
          amount: true,
          description: true,
          splitGroupId: true,
        },
      });

      adjustments.forEach((tx) => {
        const match = tx.description ? tx.description.match(/\[tx_id:([^\]]+)\]/) : null;
        const id = match ? match[1] : tx.splitGroupId;
        if (id) {
          adjustmentsMap[id] = (adjustmentsMap[id] || 0) + tx.amount;
        }
      });

      // Fetch BillFriends
      const billFriends = await billFriendRepository.findMany(userId);

      billFriends.forEach((bf) => {
        const match = bf.description ? bf.description.match(/\[tx_id:([^\]]+)\]/) : null;
        const id = match ? match[1] : null;
        if (id) {
          if (!billFriendsMap[id]) {
            billFriendsMap[id] = [];
          }
          billFriendsMap[id].push({
            id: bf.id,
            personName: bf.personName,
            amount: bf.amount,
            currency: bf.currency,
            direction: bf.direction,
            isSettled: bf.isSettled,
            settledAt: bf.settledAt ? bf.settledAt.toISOString() : null,
          });
        }
      });
    }

    // Serialize Dates, calculate adjusted amounts, and attach splitBills
    const transactions = transactionsRaw.map((tx) => {
      const match = tx.description ? tx.description.match(/\[tx_id:([^\]]+)\]/) : null;
      const splitGroupId = match ? match[1] : tx.splitGroupId;

      let settledAmount = 0;
      let adjustedAmount = tx.amount;
      if (splitGroupId && adjustmentsMap[splitGroupId]) {
        settledAmount = adjustmentsMap[splitGroupId];
        adjustedAmount = Math.max(0, tx.amount - settledAmount);
      }

      return {
        ...tx,
        amount: adjustedAmount,
        originalAmount: tx.amount,
        settledAmount,
        date: tx.date.toISOString(),
        splitBills: splitGroupId ? (billFriendsMap[splitGroupId] || []) : [],
      };
    });

    return {
      transactions,
      accounts,
    };
  },
};
