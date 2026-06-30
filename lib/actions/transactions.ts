"use server";

import { auth } from "@/auth";
import { revalidatePath } from "next/cache";
import { transactionService } from "@/services/transactionService";
import { CreateTransactionInput, UpdateTransactionInput } from "@/types/transaction";
import { prisma } from "@/lib/prisma";

function triggerRevalidation() {
  revalidatePath("/");
  revalidatePath("/transactions");
  revalidatePath("/charts");
  revalidatePath("/settings");
  revalidatePath("/bill-friends");
}

export async function createTransactionAction(data: CreateTransactionInput) {
  try {
    const session = await auth();
    if (!session || !session.user || !session.user.id) {
      return { success: false, error: "Unauthorized" };
    }

    const newTx = await transactionService.createTransaction(data, session.user.id);

    triggerRevalidation();

    return { success: true, transaction: newTx };
  } catch (error) {
    console.error("Failed to create transaction:", error);
    return { success: false, error: (error as Error).message };
  }
}

export async function updateTransactionAction(data: UpdateTransactionInput) {
  try {
    const session = await auth();
    if (!session || !session.user || !session.user.id) {
      return { success: false, error: "Unauthorized" };
    }

    // Ensure the input matches the authorized user
    await transactionService.updateTransaction({
      ...data,
      userId: session.user.id,
    }, session.user.id);

    triggerRevalidation();

    return { success: true };
  } catch (error) {
    console.error("Failed to update transaction:", error);
    return { success: false, error: (error as Error).message };
  }
}

export async function deleteTransactionAction(transactionId: string) {
  try {
    const session = await auth();
    if (!session || !session.user || !session.user.id) {
      return { success: false, error: "Unauthorized" };
    }

    await transactionService.deleteTransaction(transactionId, session.user.id);

    triggerRevalidation();

    return { success: true };
  } catch (error) {
    console.error("Failed to delete transaction:", error);
    return { success: false, error: (error as Error).message };
  }
}

export async function getTransactionsDataAction() {
  try {
    const session = await auth();
    if (!session || !session.user || !session.user.id) {
      return { success: false, error: "Unauthorized" };
    }

    const data = await transactionService.getTransactionsData(session.user.id);

    return {
      success: true,
      data,
    };
  } catch (error) {
    console.error("Failed to fetch transactions data:", error);
    return { success: false, error: "Failed to fetch transactions data" };
  }
}

export async function getPaginatedTransactionsAction(params: {
  page: number;
  limit: number;
  typeFilter?: string;
  accountId?: string;
  categoryFilter?: string;
  monthFilter?: string;
  startDateFilter?: string;
  endDateFilter?: string;
  search?: string;
}) {
  try {
    const session = await auth();
    if (!session || !session.user || !session.user.id) {
      return { success: false, error: "Unauthorized" };
    }
    const userId = session.user.id;

    const {
      page,
      limit,
      typeFilter = "all",
      accountId = "all",
      categoryFilter = "all",
      monthFilter = "all",
      startDateFilter = "",
      endDateFilter = "",
      search = "",
    } = params;

    // Build Prisma query condition
    const where: any = {
      userId,
      // Always exclude internal adjustment transactions that are split settlements
      NOT: [
        {
          category: "adjustment",
          description: { not: null, contains: "[tx_id:" },
        },
        {
          description: { not: null, startsWith: "Settled Bill with" },
          OR: [
            { description: { contains: "[tx_id:split_" } },
            { splitGroupId: { startsWith: "split_" } },
          ],
        },
      ],
    };

    if (typeFilter !== "all") {
      where.type = typeFilter;
    }
    if (accountId !== "all") {
      where.accountId = accountId;
    }
    if (categoryFilter !== "all") {
      // Backward compat: living_expenses also includes legacy pocket_money, personal_spending includes shopping
      if (categoryFilter === "living_expenses") {
        where.category = { in: ["living_expenses", "pocket_money"] };
      } else if (categoryFilter === "personal_spending") {
        where.category = { in: ["personal_spending", "shopping"] };
      } else {
        where.category = categoryFilter;
      }
    }

    // Date range
    let dateFilter: any = {};
    if (monthFilter !== "all") {
      const [year, month] = monthFilter.split("-").map(Number);
      dateFilter.gte = new Date(year, month - 1, 1);
      dateFilter.lte = new Date(year, month, 0, 23, 59, 59, 999);
    }
    if (startDateFilter) {
      const start = new Date(`${startDateFilter}T00:00:00`);
      if (!dateFilter.gte || start > dateFilter.gte) {
        dateFilter.gte = start;
      }
    }
    if (endDateFilter) {
      const end = new Date(`${endDateFilter}T23:59:59.999`);
      if (!dateFilter.lte || end < dateFilter.lte) {
        dateFilter.lte = end;
      }
    }
    if (dateFilter.gte || dateFilter.lte) {
      where.date = dateFilter;
    }

    // Search query
    if (search && search.trim() !== "") {
      const query = search.trim();
      where.OR = [
        { description: { contains: query, mode: "insensitive" } },
        { category: { contains: query, mode: "insensitive" } },
        { subCategory: { contains: query, mode: "insensitive" } },
        { account: { name: { contains: query, mode: "insensitive" } } },
      ];
    }

    // 1. Fetch matching transactions to compute totals & settlements (for split bill adjustments)
    const allMatching = await prisma.transaction.findMany({
      where,
      select: {
        id: true,
        amount: true,
        type: true,
        currency: true,
        category: true,
        description: true,
        splitGroupId: true,
      },
    });

    /**
     * Resolve the splitGroupId for a transaction.
     * New records use the dedicated splitGroupId field.
     * Legacy records (before this field was added) fall back to regex parsing.
     */
    function resolveSplitGroupId(tx: { splitGroupId?: string | null; description?: string | null }): string | null {
      const match = tx.description ? tx.description.match(/\[tx_id:([^\]]+)\]/) : null;
      if (match) return match[1];
      return tx.splitGroupId || null;
    }

    // Collect all unique splitGroupIds from the matching set
    const splitGroupIds: string[] = [];
    allMatching.forEach((tx) => {
      const id = resolveSplitGroupId(tx);
      if (id) splitGroupIds.push(id);
    });

    let adjustmentsMap: Record<string, number> = {};
    let billFriendsMap: Record<string, any[]> = {};
    if (splitGroupIds.length > 0) {
      // Fetch adjustment transactions linked by splitGroupId OR legacy description pattern
      const adjustments = await prisma.transaction.findMany({
        where: {
          userId,
          OR: [
            {
              category: "adjustment",
              OR: [
                { splitGroupId: { in: splitGroupIds } },
                ...splitGroupIds.map((id) => ({
                  description: { contains: `[tx_id:${id}]` },
                })),
              ],
            },
            {
              description: { startsWith: "Settled Bill with" },
              OR: [
                { splitGroupId: { in: splitGroupIds } },
                ...splitGroupIds.map((id) => ({
                  description: { contains: `[tx_id:${id}]` },
                })),
              ],
            },
          ],
        },
        select: {
          amount: true,
          description: true,
          splitGroupId: true,
        },
      });

      adjustments.forEach((tx) => {
        const id = resolveSplitGroupId(tx);
        if (id) {
          adjustmentsMap[id] = (adjustmentsMap[id] || 0) + tx.amount;
        }
      });

      // Fetch BillFriends to get current split status (ceklis or pending)
      const billFriends = await prisma.billFriend.findMany({
        where: {
          userId,
          OR: splitGroupIds.map((id) => ({
            description: { contains: `[tx_id:${id}]` },
          })),
        },
      });

      billFriends.forEach((bf) => {
        const match = bf.description ? bf.description.match(/\[tx_id:([^\]]+)\]/) : null;
        const id = match ? match[1] : null;
        if (id) {
          if (!billFriendsMap[id]) {
            billFriendsMap[id] = [];
          }
          billFriendsMap[id].push({
            id: bf.id,
            personName: bf.personName,
            amount: bf.amount,
            currency: bf.currency,
            direction: bf.direction,
            isSettled: bf.isSettled,
            settledAt: bf.settledAt ? bf.settledAt.toISOString() : null,
          });
        }
      });
    }

    // Calculate correct total summary
    const summary = {
      expense: { JPY: 0, IDR: 0 },
      income: { JPY: 0, IDR: 0 },
    };

    allMatching.forEach((tx) => {
      const splitGroupId = resolveSplitGroupId(tx);
      let finalAmount = tx.amount;
      if (splitGroupId && adjustmentsMap[splitGroupId]) {
        finalAmount = Math.max(0, tx.amount - adjustmentsMap[splitGroupId]);
      }

      const bucket = tx.currency === "IDR" ? "IDR" : "JPY";
      if (tx.type === "expense") {
        summary.expense[bucket] += finalAmount;
      } else if (tx.type === "income") {
        summary.income[bucket] += finalAmount;
      }
    });

    // 2. Fetch the paginated page of transactions
    const skip = (page - 1) * limit;
    const paginatedRaw = await prisma.transaction.findMany({
      where,
      orderBy: { date: "desc" },
      skip,
      take: limit,
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

    // Adjust paginated transactions using the same adjustments map
    const transactions = paginatedRaw.map((tx) => {
      const splitGroupId = resolveSplitGroupId(tx);
      let settledAmount = 0;
      let adjustedAmount = tx.amount;
      if (splitGroupId && adjustmentsMap[splitGroupId]) {
        settledAmount = adjustmentsMap[splitGroupId];
        adjustedAmount = Math.max(0, tx.amount - settledAmount);
      }

      return {
        ...tx,
        amount: adjustedAmount,
        originalAmount: tx.amount,
        settledAmount,
        date: tx.date.toISOString(),
        splitBills: splitGroupId ? (billFriendsMap[splitGroupId] || []) : [],
      };
    });

    const hasMore = skip + paginatedRaw.length < allMatching.length;

    return {
      success: true,
      transactions,
      hasMore,
      summary,
    };
  } catch (error) {
    console.error("Error in getPaginatedTransactionsAction:", error);
    return { success: false, error: "Failed to fetch transactions" };
  }
}
