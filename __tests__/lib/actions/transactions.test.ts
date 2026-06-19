/**
 * Tests for lib/actions/transactions.ts (Server Actions)
 *
 * Focus: auth enforcement — every action must reject unauthenticated callers,
 * and deleteTransactionAction must no longer accept userId from the client.
 */
import { describe, it, expect, vi, beforeEach } from "vitest";

// --- Auth mock ---
vi.mock("@/auth", () => ({
  auth: vi.fn(),
}));

// --- Service mocks ---
vi.mock("@/services/transactionService", () => ({
  transactionService: {
    createTransaction: vi.fn(),
    updateTransaction: vi.fn(),
    deleteTransaction: vi.fn(),
    getTransactionsData: vi.fn(),
  },
}));

// --- next/cache mock (revalidatePath is a no-op in tests) ---
vi.mock("next/cache", () => ({
  revalidatePath: vi.fn(),
}));

// --- Prisma mock (for getPaginatedTransactionsAction) ---
vi.mock("@/lib/prisma", () => ({
  prisma: {
    transaction: {
      findMany: vi.fn().mockResolvedValue([]),
    },
  },
}));

import { auth } from "@/auth";
import {
  createTransactionAction,
  updateTransactionAction,
  deleteTransactionAction,
  getTransactionsDataAction,
} from "@/lib/actions/transactions";
import { transactionService } from "@/services/transactionService";

const mockAuth = auth as ReturnType<typeof vi.fn>;
const mockService = transactionService as Record<string, ReturnType<typeof vi.fn>>;

const SESSION_USER_1 = { user: { id: "user-1", email: "user1@test.com" } };

beforeEach(() => vi.clearAllMocks());

// ---------------------------------------------------------------------------
// Auth gate — all actions must return Unauthorized without a session
// ---------------------------------------------------------------------------
describe("auth enforcement", () => {
  beforeEach(() => mockAuth.mockResolvedValue(null));

  it("createTransactionAction returns Unauthorized", async () => {
    const result = await createTransactionAction({
      accountId: "acc-1", type: "expense", amount: 100, category: "pocket_money"
    });
    expect(result).toMatchObject({ success: false, error: "Unauthorized" });
  });

  it("updateTransactionAction returns Unauthorized", async () => {
    const result = await updateTransactionAction({
      id: "tx-1", userId: "user-1", accountId: "acc-1", type: "expense", amount: 100, category: "pocket_money"
    });
    expect(result).toMatchObject({ success: false, error: "Unauthorized" });
  });

  it("deleteTransactionAction returns Unauthorized", async () => {
    const result = await deleteTransactionAction("tx-1");
    expect(result).toMatchObject({ success: false, error: "Unauthorized" });
  });

  it("getTransactionsDataAction returns Unauthorized", async () => {
    const result = await getTransactionsDataAction();
    expect(result).toMatchObject({ success: false, error: "Unauthorized" });
  });
});

// ---------------------------------------------------------------------------
// deleteTransactionAction — no longer accepts userId from client
// ---------------------------------------------------------------------------
describe("deleteTransactionAction", () => {
  it("uses session userId — not a client-supplied userId", async () => {
    mockAuth.mockResolvedValue(SESSION_USER_1);
    mockService.deleteTransaction.mockResolvedValue(undefined);

    // deleteTransactionAction signature: (transactionId: string) — no userId param
    await deleteTransactionAction("tx-1");

    // Must pass the session's userId, not any external value
    expect(mockService.deleteTransaction).toHaveBeenCalledWith("tx-1", "user-1");
  });

  it("returns success when authenticated", async () => {
    mockAuth.mockResolvedValue(SESSION_USER_1);
    mockService.deleteTransaction.mockResolvedValue(undefined);

    const result = await deleteTransactionAction("tx-1");

    expect(result).toMatchObject({ success: true });
  });

  it("returns error if service throws (e.g., transaction belongs to another user)", async () => {
    mockAuth.mockResolvedValue(SESSION_USER_1);
    mockService.deleteTransaction.mockRejectedValue(new Error("Transaction not found"));

    const result = await deleteTransactionAction("tx-1");

    expect(result).toMatchObject({ success: false });
  });
});

// ---------------------------------------------------------------------------
// createTransactionAction
// ---------------------------------------------------------------------------
describe("createTransactionAction", () => {
  it("passes session userId to service", async () => {
    mockAuth.mockResolvedValue(SESSION_USER_1);
    mockService.createTransaction.mockResolvedValue({ id: "tx-new" });

    await createTransactionAction({
      accountId: "acc-1", type: "expense", amount: 500, category: "pocket_money"
    });

    expect(mockService.createTransaction).toHaveBeenCalledWith(
      expect.any(Object),
      "user-1" // session user id
    );
  });
});
