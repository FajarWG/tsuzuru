import { prisma } from "@/lib/prisma";
import { Prisma } from "@prisma/client";

export const accountRepository = {
  async findById(id: string, userId?: string) {
    if (userId) {
      return prisma.account.findFirst({
        where: { id, userId },
      });
    }
    return prisma.account.findUnique({
      where: { id },
    });
  },

  async findMany(userId: string) {
    return prisma.account.findMany({
      where: { userId },
      orderBy: { name: "asc" },
    });
  },

  async findManyActive(userId: string) {
    return prisma.account.findMany({
      where: { userId, isActive: true },
      orderBy: { name: "asc" },
    });
  },

  async create(data: Prisma.AccountUncheckedCreateInput) {
    return prisma.account.create({
      data,
    });
  },

  async update(id: string, userId: string, data: Prisma.AccountUpdateInput) {
    return prisma.account.update({
      where: { id, userId },
      data,
    });
  },

  async updateMany(userId: string, accounts: { id: string; name: string; balance: number; isActive: boolean }[]) {
    return prisma.$transaction(
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
  },

  async updateBalanceWithAdjustmentTransaction(params: {
    userId: string;
    accountId: string;
    newBalance: number;
    amount: number;
    type: "income" | "expense";
    currency: string;
    description: string;
  }) {
    const { userId, accountId, newBalance, amount, type, currency, description } = params;

    return prisma.$transaction([
      prisma.transaction.create({
        data: {
          userId,
          accountId,
          type,
          amount,
          currency,
          category: "adjustment",
          description,
          date: new Date(),
        },
      }),
      prisma.account.update({
        where: { id: accountId },
        data: { balance: newBalance },
      }),
    ]);
  },

  async deleteWithAssociations(accountId: string, userId: string) {
    return prisma.$transaction([
      prisma.monthlyTemplate.deleteMany({
        where: { accountId, userId },
      }),
      prisma.account.updateMany({
        where: { defaultPaymentAccountId: accountId, userId },
        data: { defaultPaymentAccountId: null },
      }),
      prisma.account.delete({
        where: { id: accountId, userId },
      }),
    ]);
  },
};
