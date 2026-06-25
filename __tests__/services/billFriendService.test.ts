/**
 * Tests for billFriendService
 *
 * Focus:
 *  - Ownership: only the owner can settle or delete their bills
 *  - Amount validation: total allocations must match bill amount
 *  - Currency validation: allocation accounts must match bill currency
 */
import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("@/repositories/billFriendRepository", () => ({
  billFriendRepository: {
    findById: vi.fn(),
    findMany: vi.fn(),
    create: vi.fn(),
    createMany: vi.fn(),
    update: vi.fn(),
    delete: vi.fn(),
    settleBillWithAllocations: vi.fn(),
    createBillWithAdjustment: vi.fn(),
  },
}));

vi.mock("@/repositories/accountRepository", () => ({
  accountRepository: {
    findById: vi.fn(),
    findManyActive: vi.fn(),
  },
}));

vi.mock("@/repositories/transactionRepository", () => ({
  transactionRepository: {
    findManyReceipts: vi.fn(),
  },
}));

import { billFriendService } from "@/services/billFriendService";
import { billFriendRepository } from "@/repositories/billFriendRepository";
import { accountRepository } from "@/repositories/accountRepository";

const mockBillRepo = billFriendRepository as Record<string, ReturnType<typeof vi.fn>>;
const mockAccRepo = accountRepository as Record<string, ReturnType<typeof vi.fn>>;

beforeEach(() => vi.clearAllMocks());

const makeBill = (overrides = {}) => ({
  id: "bill-1",
  userId: "user-1",
  personName: "Alice",
  amount: 5000,
  currency: "JPY",
  direction: "i_owe",
  description: "Dinner",
  category: "pocket_money",
  subCategory: "food",
  isSettled: false,
  settledAt: null,
  createdAt: new Date(),
  ...overrides,
});

const makeAccount = (overrides = {}) => ({
  id: "acc-1",
  userId: "user-1",
  currency: "JPY",
  isActive: true,
  balance: 20000,
  ...overrides,
});

// ---------------------------------------------------------------------------
// createBill — validation
// ---------------------------------------------------------------------------
describe("billFriendService.createBill", () => {
  it("creates a bill for the authenticated user", async () => {
    mockBillRepo.create.mockResolvedValue(makeBill());

    const result = await billFriendService.createBill(
      { personName: "Alice", amount: 5000, currency: "JPY", direction: "i_owe" },
      "user-1"
    );

    expect(mockBillRepo.create).toHaveBeenCalledWith(
      expect.objectContaining({ userId: "user-1", personName: "Alice" })
    );
    expect(result).toBeDefined();
  });

  it("throws if person name is empty", async () => {
    await expect(
      billFriendService.createBill({ personName: "  ", amount: 5000, currency: "JPY", direction: "i_owe" }, "user-1")
    ).rejects.toThrow("Person name is required");
  });

  it("throws if amount is zero or negative", async () => {
    await expect(
      billFriendService.createBill({ personName: "Alice", amount: 0, currency: "JPY", direction: "i_owe" }, "user-1")
    ).rejects.toThrow("Amount must be greater than 0");
  });

  it("throws on invalid currency", async () => {
    await expect(
      billFriendService.createBill({ personName: "Alice", amount: 100, currency: "USD" as "JPY", direction: "i_owe" }, "user-1")
    ).rejects.toThrow("Invalid currency");
  });

  it("throws on invalid direction", async () => {
    await expect(
      billFriendService.createBill({ personName: "Alice", amount: 100, currency: "JPY", direction: "unknown" as "i_owe" }, "user-1")
    ).rejects.toThrow("Invalid direction");
  });
});

// ---------------------------------------------------------------------------
// settleBill — ownership check
// ---------------------------------------------------------------------------
describe("billFriendService.settleBill", () => {
  it("throws when bill belongs to a different user", async () => {
    mockBillRepo.findById.mockResolvedValue(makeBill({ userId: "user-2" }));

    await expect(
      billFriendService.settleBill("bill-1", "user-1")
    ).rejects.toThrow("Bill not found");
  });

  it("throws when bill does not exist", async () => {
    mockBillRepo.findById.mockResolvedValue(null);

    await expect(
      billFriendService.settleBill("bill-nonexistent", "user-1")
    ).rejects.toThrow("Bill not found");
  });

  it("settles bill for the owner", async () => {
    mockBillRepo.findById.mockResolvedValue(makeBill({ userId: "user-1" }));
    mockBillRepo.update.mockResolvedValue(makeBill({ isSettled: true }));

    await expect(
      billFriendService.settleBill("bill-1", "user-1")
    ).resolves.not.toThrow();

    expect(mockBillRepo.update).toHaveBeenCalledWith("bill-1", expect.objectContaining({ isSettled: true }));
  });
});

// ---------------------------------------------------------------------------
// deleteBill — ownership check
// ---------------------------------------------------------------------------
describe("billFriendService.deleteBill", () => {
  it("throws when bill belongs to a different user", async () => {
    mockBillRepo.findById.mockResolvedValue(makeBill({ userId: "user-2" }));

    await expect(
      billFriendService.deleteBill("bill-1", "user-1")
    ).rejects.toThrow("Bill not found");
  });

  it("deletes bill for the owner", async () => {
    mockBillRepo.findById.mockResolvedValue(makeBill({ userId: "user-1" }));
    mockBillRepo.delete.mockResolvedValue(undefined);

    await billFriendService.deleteBill("bill-1", "user-1");

    expect(mockBillRepo.delete).toHaveBeenCalledWith("bill-1");
  });
});

// ---------------------------------------------------------------------------
// settleBillWithAllocations — amount & ownership validation
// ---------------------------------------------------------------------------
describe("billFriendService.settleBillWithAllocations", () => {
  it("throws when bill belongs to a different user", async () => {
    mockBillRepo.findById.mockResolvedValue(makeBill({ userId: "user-2" }));

    await expect(
      billFriendService.settleBillWithAllocations("bill-1", [{ accountId: "acc-1", amount: 5000 }], "user-1")
    ).rejects.toThrow("Bill not found");
  });

  it("throws when bill is already settled", async () => {
    mockBillRepo.findById.mockResolvedValue(makeBill({ isSettled: true }));

    await expect(
      billFriendService.settleBillWithAllocations("bill-1", [{ accountId: "acc-1", amount: 5000 }], "user-1")
    ).rejects.toThrow("already settled");
  });

  it("throws when total allocation does not match bill amount", async () => {
    mockBillRepo.findById.mockResolvedValue(makeBill({ amount: 5000 }));

    await expect(
      billFriendService.settleBillWithAllocations(
        "bill-1",
        [{ accountId: "acc-1", amount: 4999 }], // 1 less
        "user-1"
      )
    ).rejects.toThrow("Total allocation must equal bill amount");
  });

  it("throws when allocation account belongs to a different user", async () => {
    mockBillRepo.findById.mockResolvedValue(makeBill({ amount: 5000 }));
    mockAccRepo.findById.mockResolvedValue(makeAccount({ userId: "user-2" })); // wrong owner

    await expect(
      billFriendService.settleBillWithAllocations(
        "bill-1",
        [{ accountId: "acc-1", amount: 5000 }],
        "user-1"
      )
    ).rejects.toThrow("Account not found");
  });

  it("throws on currency mismatch between account and bill", async () => {
    mockBillRepo.findById.mockResolvedValue(makeBill({ currency: "JPY", amount: 5000 }));
    mockAccRepo.findById.mockResolvedValue(makeAccount({ currency: "IDR" }));

    await expect(
      billFriendService.settleBillWithAllocations(
        "bill-1",
        [{ accountId: "acc-1", amount: 5000 }],
        "user-1"
      )
    ).rejects.toThrow("Currency mismatch");
  });

  it("settles successfully with correct ownership and amount", async () => {
    mockBillRepo.findById.mockResolvedValue(makeBill({ amount: 5000, direction: "i_owe" }));
    mockAccRepo.findById.mockResolvedValue(makeAccount({ userId: "user-1", currency: "JPY" }));
    mockBillRepo.settleBillWithAllocations.mockResolvedValue(undefined);

    await expect(
      billFriendService.settleBillWithAllocations(
        "bill-1",
        [{ accountId: "acc-1", amount: 5000 }],
        "user-1"
      )
    ).resolves.not.toThrow();

    // Verify splitGroupId is set on the allocation
    expect(mockBillRepo.settleBillWithAllocations).toHaveBeenCalledWith(
      expect.objectContaining({
        allocations: expect.arrayContaining([
          expect.objectContaining({ splitGroupId: "bill-1" }),
        ]),
      })
    );
  });
});

describe("billFriendService.createBill with balance adjustment", () => {
  it("throws when balance adjustment is requested on i_owe direction", async () => {
    await expect(
      billFriendService.createBill(
        { personName: "Alice", amount: 5000, currency: "JPY", direction: "i_owe", accountId: "acc-1" },
        "user-1"
      )
    ).rejects.toThrow("Balance adjustment is only supported when lending money (They owe me)");
  });

  it("throws when the account does not exist or belongs to another user", async () => {
    mockAccRepo.findById.mockResolvedValue(null);

    await expect(
      billFriendService.createBill(
        { personName: "Alice", amount: 5000, currency: "JPY", direction: "they_owe", accountId: "acc-1" },
        "user-1"
      )
    ).rejects.toThrow("Selected account not found");

    mockAccRepo.findById.mockResolvedValue(makeAccount({ userId: "user-2" }));

    await expect(
      billFriendService.createBill(
        { personName: "Alice", amount: 5000, currency: "JPY", direction: "they_owe", accountId: "acc-1" },
        "user-1"
      )
    ).rejects.toThrow("Selected account not found");
  });

  it("throws when the account is inactive", async () => {
    mockAccRepo.findById.mockResolvedValue(makeAccount({ userId: "user-1", isActive: false }));

    await expect(
      billFriendService.createBill(
        { personName: "Alice", amount: 5000, currency: "JPY", direction: "they_owe", accountId: "acc-1" },
        "user-1"
      )
    ).rejects.toThrow("Selected account is inactive");
  });

  it("throws when there is a currency mismatch", async () => {
    mockAccRepo.findById.mockResolvedValue(makeAccount({ userId: "user-1", currency: "IDR" }));

    await expect(
      billFriendService.createBill(
        { personName: "Alice", amount: 5000, currency: "JPY", direction: "they_owe", accountId: "acc-1" },
        "user-1"
      )
    ).rejects.toThrow("Account currency does not match bill currency");
  });

  it("creates bill and adjusts account balance when inputs are valid", async () => {
    mockAccRepo.findById.mockResolvedValue(makeAccount({ userId: "user-1", currency: "JPY" }));
    mockBillRepo.createBillWithAdjustment.mockResolvedValue(makeBill({ id: "bill-1" }));

    await expect(
      billFriendService.createBill(
        { personName: "Alice", amount: 5000, currency: "JPY", direction: "they_owe", accountId: "acc-1" },
        "user-1"
      )
    ).resolves.not.toThrow();

    expect(mockBillRepo.createBillWithAdjustment).toHaveBeenCalledWith({
      userId: "user-1",
      personName: "Alice",
      amount: 5000,
      currency: "JPY",
      direction: "they_owe",
      description: null,
      category: null,
      subCategory: null,
      accountId: "acc-1",
    });
  });
});

