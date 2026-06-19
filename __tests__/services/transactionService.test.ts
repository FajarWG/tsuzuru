/**
 * Tests for transactionService
 *
 * Focus: data isolation — no user can read or modify another user's transactions.
 * All external dependencies (repositories) are mocked so tests run without a real DB.
 */
import { describe, it, expect, vi, beforeEach } from "vitest";

// --- Mocks ---
vi.mock("@/repositories/transactionRepository", () => ({
  transactionRepository: {
    findById: vi.fn(),
    findMany: vi.fn(),
    create: vi.fn(),
    createWithBalanceUpdate: vi.fn(),
    updateWithBalanceUpdate: vi.fn(),
    deleteWithBalanceUpdate: vi.fn(),
  },
}));

vi.mock("@/repositories/accountRepository", () => ({
  accountRepository: {
    findById: vi.fn(),
    findMany: vi.fn(),
  },
}));

import { transactionService } from "@/services/transactionService";
import { transactionRepository } from "@/repositories/transactionRepository";
import { accountRepository } from "@/repositories/accountRepository";

const mockTxRepo = transactionRepository as Record<string, ReturnType<typeof vi.fn>>;
const mockAccRepo = accountRepository as Record<string, ReturnType<typeof vi.fn>>;

beforeEach(() => vi.clearAllMocks());

// Helpers
const makeAccount = (overrides = {}) => ({
  id: "acc-1",
  userId: "user-1",
  name: "Jago",
  currency: "JPY",
  balance: 10000,
  type: "bank",
  isActive: true,
  defaultPaymentAccountId: null,
  ...overrides,
});

const makeTx = (overrides = {}) => ({
  id: "tx-1",
  userId: "user-1",
  accountId: "acc-1",
  type: "expense",
  amount: 500,
  currency: "JPY",
  category: "pocket_money",
  subCategory: null,
  mealNumber: null,
  description: null,
  date: new Date(),
  isTemplate: false,
  isReceipt: false,
  receiptItems: null,
  splitGroupId: null,
  ...overrides,
});

// ---------------------------------------------------------------------------
// createTransaction
// ---------------------------------------------------------------------------
describe("transactionService.createTransaction", () => {
  it("creates a transaction and updates balance for expense", async () => {
    mockAccRepo.findById.mockResolvedValue(makeAccount());
    mockTxRepo.createWithBalanceUpdate.mockResolvedValue([makeTx(), makeAccount({ balance: 9500 })]);

    const result = await transactionService.createTransaction(
      { accountId: "acc-1", type: "expense", amount: 500, category: "pocket_money" },
      "user-1"
    );

    expect(mockTxRepo.createWithBalanceUpdate).toHaveBeenCalledWith(
      expect.objectContaining({ userId: "user-1", amount: 500, type: "expense" }),
      "acc-1",
      9500 // 10000 - 500
    );
    expect(result).toBeDefined();
  });

  it("credits the account balance for income", async () => {
    mockAccRepo.findById.mockResolvedValue(makeAccount());
    mockTxRepo.createWithBalanceUpdate.mockResolvedValue([makeTx({ type: "income" }), makeAccount()]);

    await transactionService.createTransaction(
      { accountId: "acc-1", type: "income", amount: 3000, category: "income" },
      "user-1"
    );

    expect(mockTxRepo.createWithBalanceUpdate).toHaveBeenCalledWith(
      expect.objectContaining({ type: "income", amount: 3000 }),
      "acc-1",
      13000 // 10000 + 3000
    );
  });

  it("throws if account not found", async () => {
    mockAccRepo.findById.mockResolvedValue(null);

    await expect(
      transactionService.createTransaction(
        { accountId: "nonexistent", type: "expense", amount: 100, category: "pocket_money" },
        "user-1"
      )
    ).rejects.toThrow("Account not found");
  });

  it("throws if account is inactive", async () => {
    mockAccRepo.findById.mockResolvedValue(makeAccount({ isActive: false }));

    await expect(
      transactionService.createTransaction(
        { accountId: "acc-1", type: "expense", amount: 100, category: "pocket_money" },
        "user-1"
      )
    ).rejects.toThrow("inactive");
  });
});

// ---------------------------------------------------------------------------
// updateTransaction — ownership enforcement
// ---------------------------------------------------------------------------
describe("transactionService.updateTransaction", () => {
  it("throws if transaction belongs to a different user", async () => {
    // findById with userId returns null → transaction not found for this user
    mockTxRepo.findById.mockResolvedValue(null);

    await expect(
      transactionService.updateTransaction(
        {
          id: "tx-other-user",
          userId: "user-2",
          accountId: "acc-1",
          type: "expense",
          amount: 100,
          category: "pocket_money",
        },
        "user-1" // authenticated user
      )
    ).rejects.toThrow("Transaction not found");
  });

  it("throws if amount is not positive", async () => {
    await expect(
      transactionService.updateTransaction(
        { id: "tx-1", userId: "user-1", accountId: "acc-1", type: "expense", amount: 0, category: "pocket_money" },
        "user-1"
      )
    ).rejects.toThrow("valid amount");
  });

  it("updates when user is the owner", async () => {
    mockTxRepo.findById.mockResolvedValue(makeTx());
    mockAccRepo.findById.mockResolvedValue(makeAccount());
    mockTxRepo.updateWithBalanceUpdate.mockResolvedValue(undefined);

    await expect(
      transactionService.updateTransaction(
        { id: "tx-1", userId: "user-1", accountId: "acc-1", type: "expense", amount: 200, category: "pocket_money" },
        "user-1"
      )
    ).resolves.not.toThrow();
  });
});

// ---------------------------------------------------------------------------
// deleteTransaction — ownership enforcement
// ---------------------------------------------------------------------------
describe("transactionService.deleteTransaction", () => {
  it("throws when transaction belongs to another user", async () => {
    mockTxRepo.findById.mockResolvedValue(null); // scoped query returns null for wrong user

    await expect(
      transactionService.deleteTransaction("tx-other-user", "user-1")
    ).rejects.toThrow("Transaction not found");
  });

  it("deletes and reverses balance when user is owner", async () => {
    mockTxRepo.findById.mockResolvedValue(makeTx({ amount: 500, type: "expense" }));
    mockTxRepo.deleteWithBalanceUpdate.mockResolvedValue(undefined);

    await transactionService.deleteTransaction("tx-1", "user-1");

    // Expense reversal → balance increment should be +500
    expect(mockTxRepo.deleteWithBalanceUpdate).toHaveBeenCalledWith("tx-1", "acc-1", 500);
  });

  it("deducts balance when reversing an income transaction", async () => {
    mockTxRepo.findById.mockResolvedValue(makeTx({ amount: 1000, type: "income" }));
    mockTxRepo.deleteWithBalanceUpdate.mockResolvedValue(undefined);

    await transactionService.deleteTransaction("tx-1", "user-1");

    // Income reversal → balance increment should be -1000
    expect(mockTxRepo.deleteWithBalanceUpdate).toHaveBeenCalledWith("tx-1", "acc-1", -1000);
  });
});
