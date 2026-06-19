import { billFriendRepository } from "@/repositories/billFriendRepository";
import { accountRepository } from "@/repositories/accountRepository";
import { transactionRepository } from "@/repositories/transactionRepository";
import { CreateBillInput, SettleAllocationInput } from "@/types/billFriend";

export const billFriendService = {
  async createBill(data: CreateBillInput, userId: string) {
    const { personName, amount, currency, direction, description, category, subCategory } = data;

    if (!personName.trim()) throw new Error("Person name is required");
    if (amount <= 0) throw new Error("Amount must be greater than 0");
    if (!["JPY", "IDR"].includes(currency)) throw new Error("Invalid currency");
    if (!["i_owe", "they_owe"].includes(direction)) throw new Error("Invalid direction");

    return billFriendRepository.create({
      userId,
      personName: personName.trim(),
      amount,
      currency,
      direction,
      description: description?.trim() || null,
      category: category || null,
      subCategory: subCategory || null,
    });
  },

  async settleBill(billId: string, userId: string) {
    const bill = await billFriendRepository.findById(billId);
    if (!bill || bill.userId !== userId) {
      throw new Error("Bill not found");
    }

    return billFriendRepository.update(billId, {
      isSettled: true,
      settledAt: new Date(),
    });
  },

  async deleteBill(billId: string, userId: string) {
    const bill = await billFriendRepository.findById(billId);
    if (!bill || bill.userId !== userId) {
      throw new Error("Bill not found");
    }

    return billFriendRepository.delete(billId);
  },

  async getBillFriendsData(userId: string) {
    const billsRaw = await billFriendRepository.findMany(userId);

    const bills = billsRaw.map((bill) => ({
      ...bill,
      settledAt: bill.settledAt ? bill.settledAt.toISOString() : null,
      createdAt: bill.createdAt.toISOString(),
    }));

    const accounts = await accountRepository.findManyActive(userId);
    const transactions = await transactionRepository.findManyReceipts(userId);

    return {
      bills,
      accounts,
      transactions,
    };
  },

  async settleBillWithAllocations(billId: string, allocations: SettleAllocationInput[], userId: string) {
    const bill = await billFriendRepository.findById(billId);
    if (!bill || bill.userId !== userId) {
      throw new Error("Bill not found");
    }

    if (bill.isSettled) {
      throw new Error("Bill is already settled");
    }

    const totalAllocated = allocations.reduce((sum, a) => sum + a.amount, 0);
    if (Math.abs(totalAllocated - bill.amount) > 0.01) {
      throw new Error("Total allocation must equal bill amount");
    }

    const formattedAllocations = [];
    for (const alloc of allocations) {
      if (alloc.amount <= 0) continue;

      const account = await accountRepository.findById(alloc.accountId);
      if (!account || account.userId !== userId) {
        throw new Error("Account not found");
      }

      if (account.currency !== bill.currency) {
        throw new Error("Currency mismatch");
      }

      const isExpense = bill.direction === "i_owe";
      const type = "expense" as "expense" | "income";
      const amount = isExpense ? alloc.amount : -alloc.amount;
      const balanceDelta = isExpense ? -alloc.amount : alloc.amount;

      formattedAllocations.push({
        accountId: alloc.accountId,
        amount,
        type,
        balanceDelta,
        currency: bill.currency,
        category: bill.category || "pocket_money",
        subCategory: bill.subCategory || "others",
        description: `Settled Bill with ${bill.personName}: ${bill.description || (isExpense ? "I owe them" : "They owe me")}`,
      });
    }

    await billFriendRepository.settleBillWithAllocations({
      billId,
      userId,
      settleDate: new Date(),
      allocations: formattedAllocations,
    });
  },

  async createMultipleBills(bills: CreateBillInput[], userId: string) {
    const billsData = bills.map((bill) => {
      if (!bill.personName.trim()) throw new Error("Person name is required");
      if (bill.amount <= 0) throw new Error("Amount must be greater than 0");
      if (!["JPY", "IDR"].includes(bill.currency)) throw new Error("Invalid currency");
      if (!["i_owe", "they_owe"].includes(bill.direction)) throw new Error("Invalid direction");

      return {
        userId,
        personName: bill.personName.trim(),
        amount: bill.amount,
        currency: bill.currency,
        direction: bill.direction,
        description: bill.description?.trim() || null,
        category: bill.category || null,
        subCategory: bill.subCategory || null,
      };
    });

    await billFriendRepository.createMany(billsData);
  },
};
