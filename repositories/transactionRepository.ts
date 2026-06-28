import { prisma } from "@/lib/prisma";
import { Prisma } from "@prisma/client";

export const transactionRepository = {
  async findById(id: string, userId?: string) {
    if (userId) {
      return prisma.transaction.findFirst({
        where: { id, userId },
      });
    }
    return prisma.transaction.findUnique({
      where: { id },
    });
  },

  async findMany(userId: string) {
    return prisma.transaction.findMany({
      where: {
        userId,
        NOT: [
          {
            category: "adjustment",
            description: { contains: "[tx_id:" },
          },
          {
            description: { startsWith: "Settled Bill with" },
            OR: [
              { description: { contains: "[tx_id:split_" } },
              { splitGroupId: { startsWith: "split_" } },
            ],
          },
        ],
      },
      orderBy: { date: "desc" },
      include: {
        account: {
          select: {
            id: true,
            name: true,
            currency: true,
          },
        },
      },
    });
  },

  async findManyReceipts(userId: string) {
    return prisma.transaction.findMany({
      where: {
        userId,
        isReceipt: true,
      },
      select: {
        id: true,
        description: true,
        isReceipt: true,
        receiptItems: true,
        currency: true,
      },
    });
  },

  async findManyByDateRange(params: {
    userId: string;
    type: "expense" | "income";
    currency: string;
    startDate: Date;
    endDate: Date;
  }) {
    const { userId, type, currency, startDate, endDate } = params;
    return prisma.transaction.findMany({
      where: {
        userId,
        type,
        currency,
        date: { gte: startDate, lte: endDate },
      },
      select: {
        id: true,
        amount: true,
        category: true,
        currency: true,
        type: true,
        date: true,
      },
    });
  },

  async create(data: Prisma.TransactionUncheckedCreateInput) {
    return prisma.transaction.create({
      data,
    });
  },

  async createWithBalanceUpdate(
    txData: Prisma.TransactionUncheckedCreateInput,
    accountId: string,
    newBalance: number
  ) {
    return prisma.$transaction([
      prisma.transaction.create({
        data: txData,
      }),
      prisma.account.update({
        where: { id: accountId },
        data: { balance: newBalance },
      }),
    ]);
  },

  async updateWithBalanceUpdate(params: {
    transactionId: string;
    txData: Prisma.TransactionUncheckedUpdateInput;
    oldAccountId: string;
    newAccountId: string;
    oldDelta: number;
    newDelta: number;
  }) {
    const { transactionId, txData, oldAccountId, newAccountId, oldDelta, newDelta } = params;

    return prisma.$transaction(async (tx) => {
      if (oldAccountId === newAccountId) {
        await tx.account.update({
          where: { id: newAccountId },
          data: { balance: { increment: newDelta - oldDelta } },
        });
      } else {
        await tx.account.update({
          where: { id: oldAccountId },
          data: { balance: { increment: -oldDelta } },
        });
        await tx.account.update({
          where: { id: newAccountId },
          data: { balance: { increment: newDelta } },
        });
      }

      await tx.transaction.update({
        where: { id: transactionId },
        data: txData,
      });
    });
  },

  async deleteWithBalanceUpdate(transactionId: string, accountId: string, balanceIncrement: number) {
    return prisma.$transaction([
      prisma.transaction.delete({
        where: { id: transactionId },
      }),
      prisma.account.update({
        where: { id: accountId },
        data: { balance: { increment: balanceIncrement } },
      }),
    ]);
  },
};
