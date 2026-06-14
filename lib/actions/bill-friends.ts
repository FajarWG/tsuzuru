"use server";

import { auth } from "@/auth";
import { revalidatePath } from "next/cache";
import { billFriendService } from "@/services/billFriendService";
import { CreateBillInput, SettleAllocationInput } from "@/types/billFriend";

export async function createBillAction(data: CreateBillInput) {
  try {
    const session = await auth();
    if (!session?.user?.id) return { success: false, error: "Unauthorized" };

    await billFriendService.createBill(data, session.user.id);

    revalidatePath("/bill-friends");
    return { success: true };
  } catch (err) {
    console.error("createBillAction error:", err);
    return { success: false, error: (err as Error).message || "Failed to create bill" };
  }
}

export async function settleBillAction(billId: string) {
  try {
    const session = await auth();
    if (!session?.user?.id) return { success: false, error: "Unauthorized" };

    await billFriendService.settleBill(billId, session.user.id);

    revalidatePath("/bill-friends");
    return { success: true };
  } catch (err) {
    console.error("settleBillAction error:", err);
    return { success: false, error: (err as Error).message || "Failed to settle bill" };
  }
}

export async function deleteBillAction(billId: string) {
  try {
    const session = await auth();
    if (!session?.user?.id) return { success: false, error: "Unauthorized" };

    await billFriendService.deleteBill(billId, session.user.id);

    revalidatePath("/bill-friends");
    return { success: true };
  } catch (err) {
    console.error("deleteBillAction error:", err);
    return { success: false, error: (err as Error).message || "Failed to delete bill" };
  }
}

export async function getBillFriendsDataAction() {
  try {
    const session = await auth();
    if (!session?.user?.id) return { success: false, error: "Unauthorized" };

    const data = await billFriendService.getBillFriendsData(session.user.id);

    return {
      success: true,
      data,
    };
  } catch (err) {
    console.error("getBillFriendsDataAction error:", err);
    return { success: false, error: "Failed to fetch bill friends data" };
  }
}

export async function settleBillWithAllocationsAction(
  billId: string,
  allocations: SettleAllocationInput[]
) {
  try {
    const session = await auth();
    if (!session?.user?.id) return { success: false, error: "Unauthorized" };

    await billFriendService.settleBillWithAllocations(billId, allocations, session.user.id);

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
  try {
    const session = await auth();
    if (!session?.user?.id) return { success: false, error: "Unauthorized" };

    await billFriendService.createMultipleBills(bills, session.user.id);

    revalidatePath("/bill-friends");
    return { success: true };
  } catch (err) {
    console.error("createMultipleBillsAction error:", err);
    return { success: false, error: (err as Error).message || "Failed to create bills" };
  }
}
