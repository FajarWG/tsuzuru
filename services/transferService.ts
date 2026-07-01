import { prisma } from "@/lib/prisma";
import { accountRepository } from "@/repositories/accountRepository";
import { CreateTransferInput } from "@/types/transfer";
import crypto from "crypto";

export const transferService = {
  async createTransfer(data: CreateTransferInput, userId: string) {
    const { fromAccountId, toAccountId, amount, description, date } = data;

    if (amount <= 0) {
      throw new Error("Amount must be greater than 0");
    }

    if (fromAccountId === toAccountId) {
      throw new Error("Source and destination accounts must be different");
    }

    const fromAccount = await accountRepository.findById(fromAccountId, userId);
    const toAccount = await accountRepository.findById(toAccountId, userId);

    if (!fromAccount || !toAccount) {
      throw new Error("One or both accounts not found");
    }

    if (!fromAccount.isActive || !toAccount.isActive) {
      throw new Error("Both accounts must be active");
    }

    if (fromAccount.currency !== toAccount.currency) {
      throw new Error("Transfers are only supported between accounts of the same currency");
    }

    const transferGroupId = crypto.randomUUID();
    const transferDate = date || new Date();

    const sourceDesc = description?.trim() 
      ? `${description.trim()} (Transfer to ${toAccount.name})`
      : `Transfer to ${toAccount.name}`;

    const destDesc = description?.trim()
      ? `${description.trim()} (Transfer from ${fromAccount.name})`
      : `Transfer from ${fromAccount.name}`;

    return prisma.$transaction(async (tx) => {
      // 1. Create source transaction (expense)
      const sourceTx = await tx.transaction.create({
        data: {
          userId,
          accountId: fromAccountId,
          type: "expense",
          amount,
          currency: fromAccount.currency,
          category: "transfer",
          description: sourceDesc,
          transferGroupId,
          date: transferDate,
        },
      });

      // 2. Create destination transaction (income)
      const destTx = await tx.transaction.create({
        data: {
          userId,
          accountId: toAccountId,
          type: "income",
          amount,
          currency: toAccount.currency,
          category: "transfer",
          description: destDesc,
          transferGroupId,
          date: transferDate,
        },
      });

      // 3. Decrement source account balance
      await tx.account.update({
        where: { id: fromAccountId, userId },
        data: { balance: { decrement: amount } },
      });

      // 4. Increment destination account balance
      await tx.account.update({
        where: { id: toAccountId, userId },
        data: { balance: { increment: amount } },
      });

      return { sourceTx, destTx };
    });
  },

  async deleteTransfer(transferGroupId: string, userId: string) {
    if (!transferGroupId) {
      throw new Error("Transfer group ID is required");
    }

    // Find the sepasang transactions
    const txs = await prisma.transaction.findMany({
      where: { transferGroupId, userId },
    });

    if (txs.length === 0) {
      throw new Error("Transfer transactions not found");
    }

    const sourceTx = txs.find((t) => t.type === "expense");
    const destTx = txs.find((t) => t.type === "income");

    if (!sourceTx || !destTx) {
      throw new Error("Invalid transfer transactions pair");
    }

    return prisma.$transaction(async (tx) => {
      // 1. Revert source account balance (increment)
      await tx.account.update({
        where: { id: sourceTx.accountId, userId },
        data: { balance: { increment: sourceTx.amount } },
      });

      // 2. Revert destination account balance (decrement)
      await tx.account.update({
        where: { id: destTx.accountId, userId },
        data: { balance: { decrement: destTx.amount } },
      });

      // 3. Delete both transactions
      await tx.transaction.deleteMany({
        where: { transferGroupId, userId },
      });

      return true;
    });
  },
};
