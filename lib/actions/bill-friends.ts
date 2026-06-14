"use server";

import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";

interface CreateBillInput {
  personName: string;
  amount: number;
  currency: string;
  direction: "i_owe" | "they_owe";
  description?: string;
}

export async function createBillAction(data: CreateBillInput) {
  const session = await auth();
  if (!session?.user?.id) return { success: false, error: "Unauthorized" };

  const { personName, amount, currency, direction, description } = data;

  if (!personName.trim()) return { success: false, error: "Person name is required" };
  if (amount <= 0) return { success: false, error: "Amount must be greater than 0" };
  if (!["JPY", "IDR"].includes(currency)) return { success: false, error: "Invalid currency" };
  if (!["i_owe", "they_owe"].includes(direction)) return { success: false, error: "Invalid direction" };

  try {
    await prisma.billFriend.create({
      data: {
        userId: session.user.id,
        personName: personName.trim(),
        amount,
        currency,
        direction,
        description: description?.trim() || null,
      },
    });

    revalidatePath("/bill-friends");
    return { success: true };
  } catch (err) {
    console.error("createBillAction error:", err);
    return { success: false, error: "Failed to create bill" };
  }
}

export async function settleBillAction(billId: string) {
  const session = await auth();
  if (!session?.user?.id) return { success: false, error: "Unauthorized" };

  try {
    const bill = await prisma.billFriend.findUnique({ where: { id: billId } });
    if (!bill || bill.userId !== session.user.id) {
      return { success: false, error: "Bill not found" };
    }

    await prisma.billFriend.update({
      where: { id: billId },
      data: {
        isSettled: true,
        settledAt: new Date(),
      },
    });

    revalidatePath("/bill-friends");
    return { success: true };
  } catch (err) {
    console.error("settleBillAction error:", err);
    return { success: false, error: "Failed to settle bill" };
  }
}

export async function deleteBillAction(billId: string) {
  const session = await auth();
  if (!session?.user?.id) return { success: false, error: "Unauthorized" };

  try {
    const bill = await prisma.billFriend.findUnique({ where: { id: billId } });
    if (!bill || bill.userId !== session.user.id) {
      return { success: false, error: "Bill not found" };
    }

    await prisma.billFriend.delete({ where: { id: billId } });

    revalidatePath("/bill-friends");
    return { success: true };
  } catch (err) {
    console.error("deleteBillAction error:", err);
    return { success: false, error: "Failed to delete bill" };
  }
}

export async function getBillFriendsDataAction() {
  const session = await auth();
  if (!session?.user?.id) return { success: false, error: "Unauthorized" };

  try {
    const billsRaw = await prisma.billFriend.findMany({
      where: { userId: session.user.id },
      orderBy: { createdAt: "desc" },
    });

    const bills = billsRaw.map((bill) => ({
      ...bill,
      settledAt: bill.settledAt ? bill.settledAt.toISOString() : null,
      createdAt: bill.createdAt.toISOString(),
    }));

    const accounts = await prisma.account.findMany({
      where: { userId: session.user.id, isActive: true },
      orderBy: { name: "asc" },
    });

    const transactions = await prisma.transaction.findMany({
      where: {
        userId: session.user.id,
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

    return {
      success: true,
      data: {
        bills,
        accounts,
        transactions,
      },
    };
  } catch (err) {
    console.error("getBillFriendsDataAction error:", err);
    return { success: false, error: "Failed to fetch bill friends data" };
  }
}

interface SettleAllocationInput {
  accountId: string;
  amount: number;
}

export async function settleBillWithAllocationsAction(
  billId: string,
  allocations: SettleAllocationInput[]
) {
  const session = await auth();
  if (!session?.user?.id) return { success: false, error: "Unauthorized" };

  try {
    const bill = await prisma.billFriend.findUnique({ where: { id: billId } });
    if (!bill || bill.userId !== session.user.id) {
      return { success: false, error: "Bill not found" };
    }

    if (bill.isSettled) {
      return { success: false, error: "Bill is already settled" };
    }

    const totalAllocated = allocations.reduce((sum, a) => sum + a.amount, 0);
    if (Math.abs(totalAllocated - bill.amount) > 0.01) {
      return { success: false, error: "Total allocation must equal bill amount" };
    }

    await prisma.$transaction(async (tx) => {
      // 1. Mark bill as settled
      await tx.billFriend.update({
        where: { id: billId },
        data: {
          isSettled: true,
          settledAt: new Date(),
        },
      });

      // 2. Adjust each account and create transaction history entries
      for (const alloc of allocations) {
        if (alloc.amount <= 0) continue;

        const account = await tx.account.findUnique({ where: { id: alloc.accountId } });
        if (!account || account.userId !== session.user.id) {
          throw new Error("Account not found");
        }

        if (account.currency !== bill.currency) {
          throw new Error("Currency mismatch");
        }

        // direction: "i_owe" => I paid them => expense (negative delta)
        // direction: "they_owe" => they paid me => income (positive delta)
        const isExpense = bill.direction === "i_owe";
        const type = isExpense ? "expense" : "income";
        const balanceDelta = isExpense ? -alloc.amount : alloc.amount;

        // Create Transaction
        await tx.transaction.create({
          data: {
            userId: session.user.id,
            accountId: alloc.accountId,
            type,
            amount: alloc.amount,
            currency: bill.currency,
            category: "adjustment",
            description: `Settled Bill with ${bill.personName}: ${bill.description || (isExpense ? "I owe them" : "They owe me")}`,
            date: new Date(),
          },
        });

        // Update Account Balance
        await tx.account.update({
          where: { id: alloc.accountId },
          data: {
            balance: { increment: balanceDelta },
          },
        });
      }
    });

    revalidatePath("/");
    revalidatePath("/transactions");
    revalidatePath("/bill-friends");

    return { success: true };
  } catch (err) {
    console.error("settleBillWithAllocationsAction error:", err);
    return { success: false, error: (err as Error).message || "Failed to settle bill" };
  }
}

export async function createMultipleBillsAction(bills: CreateBillInput[]) {
  const session = await auth();
  if (!session?.user?.id) return { success: false, error: "Unauthorized" };

  try {
    await prisma.$transaction(
      bills.map((bill) =>
        prisma.billFriend.create({
          data: {
            userId: session.user.id,
            personName: bill.personName.trim(),
            amount: bill.amount,
            currency: bill.currency,
            direction: bill.direction,
            description: bill.description?.trim() || null,
          },
        })
      )
    );

    revalidatePath("/bill-friends");
    return { success: true };
  } catch (err) {
    console.error("createMultipleBillsAction error:", err);
    return { success: false, error: "Failed to create bills" };
  }
}

