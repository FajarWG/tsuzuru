import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("@/repositories/accountRepository", () => ({
  accountRepository: {
    findById: vi.fn(),
  },
}));

vi.mock("@/lib/prisma", () => ({
  prisma: {
    transaction: {
      create: vi.fn(),
      findMany: vi.fn(),
      deleteMany: vi.fn(),
    },
    account: {
      update: vi.fn(),
    },
    $transaction: vi.fn((callback) => callback(prisma)),
  },
}));

import { accountRepository } from "@/repositories/accountRepository";
import { prisma } from "@/lib/prisma";
import { transferService } from "@/services/transferService";

const mockAccountRepo = accountRepository as unknown as Record<string, ReturnType<typeof vi.fn>>;
const mockPrisma = prisma as unknown as {
  transaction: {
    create: ReturnType<typeof vi.fn>;
    findMany: ReturnType<typeof vi.fn>;
    deleteMany: ReturnType<typeof vi.fn>;
  };
  account: {
    update: ReturnType<typeof vi.fn>;
  };
  $transaction: ReturnType<typeof vi.fn>;
};

beforeEach(() => {
  vi.clearAllMocks();
  // Set default $transaction implementation
  mockPrisma.$transaction.mockImplementation((callback) => callback(mockPrisma));
});

const makeAccount = (overrides = {}) => ({
  id: "acc-1",
  userId: "user-1",
  name: "Account 1",
  currency: "JPY",
  balance: 50000,
  type: "bank",
  isActive: true,
  ...overrides,
});

describe("transferService.createTransfer", () => {
  it("successfully creates a transfer and updates balances", async () => {
    const fromAcc = makeAccount({ id: "from-1", name: "Jago JPY" });
    const toAcc = makeAccount({ id: "to-1", name: "Yucho JPY" });

    mockAccountRepo.findById.mockImplementation((id) => {
      if (id === "from-1") return Promise.resolve(fromAcc);
      if (id === "to-1") return Promise.resolve(toAcc);
      return Promise.resolve(null);
    });

    mockPrisma.transaction.create.mockResolvedValue({ id: "tx-1" });
    mockPrisma.account.update.mockResolvedValue({});

    const result = await transferService.createTransfer(
      {
        fromAccountId: "from-1",
        toAccountId: "to-1",
        amount: 10000,
        description: "Monthly savings",
      },
      "user-1"
    );

    // Verify account checks
    expect(mockAccountRepo.findById).toHaveBeenCalledWith("from-1", "user-1");
    expect(mockAccountRepo.findById).toHaveBeenCalledWith("to-1", "user-1");

    // Verify transaction creation (expense & income)
    expect(mockPrisma.transaction.create).toHaveBeenCalledTimes(2);
    expect(mockPrisma.transaction.create).toHaveBeenNthCalledWith(
      1,
      expect.objectContaining({
        data: expect.objectContaining({
          accountId: "from-1",
          type: "expense",
          amount: 10000,
          category: "transfer",
          description: "Monthly savings (Transfer to Yucho JPY)",
        }),
      })
    );
    expect(mockPrisma.transaction.create).toHaveBeenNthCalledWith(
      2,
      expect.objectContaining({
        data: expect.objectContaining({
          accountId: "to-1",
          type: "income",
          amount: 10000,
          category: "transfer",
          description: "Monthly savings (Transfer from Jago JPY)",
        }),
      })
    );

    // Verify balance updates
    expect(mockPrisma.account.update).toHaveBeenCalledTimes(2);
    expect(mockPrisma.account.update).toHaveBeenNthCalledWith(
      1,
      expect.objectContaining({
        where: { id: "from-1", userId: "user-1" },
        data: { balance: { decrement: 10000 } },
      })
    );
    expect(mockPrisma.account.update).toHaveBeenNthCalledWith(
      2,
      expect.objectContaining({
        where: { id: "to-1", userId: "user-1" },
        data: { balance: { increment: 10000 } },
      })
    );

    expect(result).toBeDefined();
  });

  it("throws error if fromAccountId and toAccountId are same", async () => {
    await expect(
      transferService.createTransfer(
        {
          fromAccountId: "from-1",
          toAccountId: "from-1",
          amount: 5000,
        },
        "user-1"
      )
    ).rejects.toThrow("must be different");
  });

  it("throws error if one of accounts is inactive", async () => {
    const fromAcc = makeAccount({ id: "from-1", isActive: false });
    const toAcc = makeAccount({ id: "to-1" });

    mockAccountRepo.findById.mockImplementation((id) => {
      if (id === "from-1") return Promise.resolve(fromAcc);
      if (id === "to-1") return Promise.resolve(toAcc);
      return Promise.resolve(null);
    });

    await expect(
      transferService.createTransfer(
        {
          fromAccountId: "from-1",
          toAccountId: "to-1",
          amount: 5000,
        },
        "user-1"
      )
    ).rejects.toThrow("must be active");
  });

  it("throws error if currencies do not match", async () => {
    const fromAcc = makeAccount({ id: "from-1", currency: "JPY" });
    const toAcc = makeAccount({ id: "to-1", currency: "IDR" });

    mockAccountRepo.findById.mockImplementation((id) => {
      if (id === "from-1") return Promise.resolve(fromAcc);
      if (id === "to-1") return Promise.resolve(toAcc);
      return Promise.resolve(null);
    });

    await expect(
      transferService.createTransfer(
        {
          fromAccountId: "from-1",
          toAccountId: "to-1",
          amount: 5000,
        },
        "user-1"
      )
    ).rejects.toThrow("same currency");
  });
});

describe("transferService.deleteTransfer", () => {
  it("successfully deletes transfer pair and reverts balances", async () => {
    const transferGroupId = "group-1";
    const txs = [
      {
        id: "tx-src",
        userId: "user-1",
        accountId: "from-1",
        type: "expense",
        amount: 10000,
        currency: "JPY",
        transferGroupId,
      },
      {
        id: "tx-dest",
        userId: "user-1",
        accountId: "to-1",
        type: "income",
        amount: 10000,
        currency: "JPY",
        transferGroupId,
      },
    ];

    mockPrisma.transaction.findMany.mockResolvedValue(txs);
    mockPrisma.account.update.mockResolvedValue({});
    mockPrisma.transaction.deleteMany.mockResolvedValue({ count: 2 });

    const result = await transferService.deleteTransfer(transferGroupId, "user-1");

    expect(mockPrisma.transaction.findMany).toHaveBeenCalledWith({
      where: { transferGroupId, userId: "user-1" },
    });

    // Revert source balance (expense -> increment)
    expect(mockPrisma.account.update).toHaveBeenNthCalledWith(
      1,
      expect.objectContaining({
        where: { id: "from-1", userId: "user-1" },
        data: { balance: { increment: 10000 } },
      })
    );

    // Revert dest balance (income -> decrement)
    expect(mockPrisma.account.update).toHaveBeenNthCalledWith(
      2,
      expect.objectContaining({
        where: { id: "to-1", userId: "user-1" },
        data: { balance: { decrement: 10000 } },
      })
    );

    // Delete matching txs
    expect(mockPrisma.transaction.deleteMany).toHaveBeenCalledWith({
      where: { transferGroupId, userId: "user-1" },
    });

    expect(result).toBe(true);
  });
});
