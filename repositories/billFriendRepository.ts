import { prisma } from "@/lib/prisma";
import { Prisma } from "@prisma/client";

export const billFriendRepository = {
  async findById(id: string, userId?: string) {
    if (userId) {
      return prisma.billFriend.findFirst({
        where: { id, userId },
      });
    }
    return prisma.billFriend.findUnique({
      where: { id },
    });
  },

  async findMany(userId: string) {
    return prisma.billFriend.findMany({
      where: { userId },
      orderBy: { createdAt: "desc" },
    });
  },

  async create(data: Prisma.BillFriendUncheckedCreateInput) {
    return prisma.billFriend.create({
      data,
    });
  },

  async createMany(billsData: Prisma.BillFriendUncheckedCreateInput[]) {
    return prisma.$transaction(
      billsData.map((data) =>
        prisma.billFriend.create({
          data,
        })
      )
    );
  },

  async update(id: string, data: Prisma.BillFriendUpdateInput) {
    return prisma.billFriend.update({
      where: { id },
      data,
    });
  },

  async delete(id: string) {
    return prisma.billFriend.delete({
      where: { id },
    });
  },

  async settleBillWithAllocations(params: {
    billId: string;
    userId: string;
    settleDate: Date;
    allocations: {
      accountId: string;
      amount: number;
      type: "expense" | "income";
      balanceDelta: number;
      currency: string;
      category: string;
      subCategory?: string | null;
      description: string;
      splitGroupId?: string | null;
    }[];
  }) {
    const { billId, userId, settleDate, allocations } = params;

    return prisma.$transaction(async (tx) => {
      // 1. Mark bill as settled
      await tx.billFriend.update({
        where: { id: billId },
        data: {
          isSettled: true,
          settledAt: settleDate,
        },
      });

      // 2. Adjust each account and create transaction history entries
      for (const alloc of allocations) {
        // Create Transaction
        await tx.transaction.create({
          data: {
            userId: userId,
            accountId: alloc.accountId,
            type: alloc.type,
            amount: alloc.amount,
            currency: alloc.currency,
            category: alloc.category,
            subCategory: alloc.subCategory || null,
            description: alloc.description,
            splitGroupId: alloc.splitGroupId || null,
            date: new Date(),
          },
        });

        // Update Account Balance
        await tx.account.update({
          where: { id: alloc.accountId },
          data: {
            balance: { increment: alloc.balanceDelta },
          },
        });
      }
    });
  },
};

