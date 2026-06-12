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
