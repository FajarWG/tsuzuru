import { prisma } from "@/lib/prisma";
import { Prisma } from "@prisma/client";

export const budgetRepository = {
  async findMany(userId: string) {
    return prisma.budgetLimit.findMany({
      where: { userId },
      orderBy: { createdAt: "asc" },
    });
  },

  async findFirstByName(userId: string, name: string) {
    return prisma.budgetLimit.findFirst({
      where: { userId, name },
    });
  },

  async findFirstById(id: string, userId: string) {
    return prisma.budgetLimit.findFirst({
      where: { id, userId },
    });
  },

  async create(data: Prisma.BudgetLimitUncheckedCreateInput) {
    return prisma.budgetLimit.create({
      data,
    });
  },

  async createMany(data: Prisma.BudgetLimitUncheckedCreateInput[]) {
    return prisma.budgetLimit.createMany({
      data,
    });
  },

  async update(id: string, userId: string, data: Prisma.BudgetLimitUpdateInput) {
    return prisma.budgetLimit.update({
      where: { id, userId },
      data,
    });
  },

  async delete(id: string, userId: string) {
    return prisma.budgetLimit.delete({
      where: { id, userId },
    });
  },
};
