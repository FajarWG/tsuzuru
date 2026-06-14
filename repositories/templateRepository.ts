import { prisma } from "@/lib/prisma";
import { Prisma } from "@prisma/client";

export const templateRepository = {
  async findById(id: string) {
    return prisma.monthlyTemplate.findUnique({
      where: { id },
    });
  },

  async findMany(userId: string) {
    return prisma.monthlyTemplate.findMany({
      where: { userId },
      orderBy: { name: "asc" },
    });
  },

  async create(data: Prisma.MonthlyTemplateUncheckedCreateInput) {
    return prisma.monthlyTemplate.create({
      data,
    });
  },

  async update(id: string, userId: string, data: Prisma.MonthlyTemplateUpdateInput) {
    return prisma.monthlyTemplate.update({
      where: { id, userId },
      data,
    });
  },

  async delete(id: string, userId: string) {
    return prisma.monthlyTemplate.delete({
      where: { id, userId },
    });
  },

  async markTemplatePaidWithBalanceUpdate(params: {
    userId: string;
    accountId: string;
    amount: number;
    currency: string;
    description: string;
    newBalance: number;
  }) {
    const { userId, accountId, amount, currency, description, newBalance } = params;

    return prisma.$transaction([
      prisma.transaction.create({
        data: {
          userId,
          accountId,
          type: "expense",
          amount,
          currency,
          category: "adjustment",
          description,
          isTemplate: true,
          date: new Date(),
        },
      }),
      prisma.account.update({
        where: { id: accountId },
        data: { balance: newBalance },
      }),
    ]);
  },

  async markCreditCardTemplatePaidWithBalanceUpdate(params: {
    operations: Prisma.PrismaPromise<any>[];
  }) {
    return prisma.$transaction(params.operations);
  },
};
