import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/repositories/templateRepository", () => ({
  templateRepository: {
    findById: vi.fn(),
    create: vi.fn(),
    update: vi.fn(),
    delete: vi.fn(),
    markCreditCardTemplatePaidWithBalanceUpdate: vi.fn(),
  },
}));

vi.mock("@/repositories/accountRepository", () => ({
  accountRepository: {
    findById: vi.fn(),
  },
}));

vi.mock("@/lib/prisma", () => ({
  prisma: {
    transaction: {
      create: vi.fn(),
    },
    account: {
      update: vi.fn(),
    },
    $transaction: vi.fn(),
  },
}));

import { templateRepository } from "@/repositories/templateRepository";
import { accountRepository } from "@/repositories/accountRepository";
import { prisma } from "@/lib/prisma";
import { templateService } from "@/services/templateService";

const mockTemplateRepo = templateRepository as Record<string, ReturnType<typeof vi.fn>>;
const mockAccountRepo = accountRepository as Record<string, ReturnType<typeof vi.fn>>;
const mockPrisma = prisma as unknown as {
  transaction: { create: ReturnType<typeof vi.fn> };
  account: { update: ReturnType<typeof vi.fn> };
  $transaction: ReturnType<typeof vi.fn>;
};

const makeAccount = (overrides = {}) => ({
  id: "acc-1",
  userId: "user-1",
  name: "Main Wallet",
  currency: "JPY",
  balance: 100000,
  type: "bank",
  isActive: true,
  ...overrides,
});

const makeTemplate = (overrides = {}) => ({
  id: "tpl-1",
  userId: "user-1",
  name: "Shared Rent",
  amount: 50000,
  currency: "JPY",
  accountId: "acc-1",
  isActive: true,
  intervalMonths: 1,
  paymentMode: "split_with_friends",
  splitConfig: {
    friends: [
      { personName: "Aki", percentage: 30 },
      { personName: "Rina", percentage: 20 },
    ],
  },
  ...overrides,
});

beforeEach(() => {
  vi.clearAllMocks();
});

describe("templateService.createTemplate", () => {
  it("stores normalized split defaults for recurring bills", async () => {
    mockAccountRepo.findById.mockResolvedValue(makeAccount());
    mockTemplateRepo.create.mockResolvedValue(makeTemplate());

    await templateService.createTemplate(
      {
        name: "Shared Rent",
        amount: 50000,
        accountId: "acc-1",
        intervalMonths: 1,
        paymentMode: "split_with_friends",
        splitConfig: {
          friends: [
            { personName: " Aki ", percentage: 30 },
            { personName: "Rina", percentage: 20 },
          ],
        },
      },
      "user-1",
    );

    expect(mockTemplateRepo.create).toHaveBeenCalledWith(
      expect.objectContaining({
        paymentMode: "split_with_friends",
        splitConfig: {
          friends: [
            { personName: "Aki", percentage: 30 },
            { personName: "Rina", percentage: 20 },
          ],
        },
      }),
    );
  });

  it("rejects split defaults when friend percentages reach 100%", async () => {
    mockAccountRepo.findById.mockResolvedValue(makeAccount());

    await expect(
      templateService.createTemplate(
        {
          name: "Shared Rent",
          amount: 50000,
          accountId: "acc-1",
          intervalMonths: 1,
          paymentMode: "split_with_friends",
          splitConfig: {
            friends: [
              { personName: "Aki", percentage: 50 },
              { personName: "Rina", percentage: 50 },
            ],
          },
        },
        "user-1",
      ),
    ).rejects.toThrow("below 100%");
  });
});

describe("templateService.markTemplatePaid", () => {
  it("creates Bill Friends entries from saved split defaults", async () => {
    mockTemplateRepo.findById.mockResolvedValue(makeTemplate());
    mockAccountRepo.findById.mockResolvedValue(makeAccount());

    const tx = {
      transaction: { create: vi.fn().mockResolvedValue(undefined) },
      account: { update: vi.fn().mockResolvedValue(undefined) },
      billFriend: { create: vi.fn().mockResolvedValue(undefined) },
    };

    mockPrisma.$transaction.mockImplementation(async (callback: (client: typeof tx) => Promise<void>) => callback(tx));

    await templateService.markTemplatePaid("tpl-1", "user-1");

    expect(tx.transaction.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          description: "Shared Rent",
          amount: 50000,
          isTemplate: true,
        }),
      }),
    );
    expect(tx.account.update).toHaveBeenCalledWith(
      expect.objectContaining({
        data: { balance: 50000 },
      }),
    );
    expect(tx.billFriend.create).toHaveBeenCalledTimes(2);
    expect(tx.billFriend.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          personName: "Aki",
          amount: 15000,
          direction: "they_owe",
        }),
      }),
    );
  });

  it("does not create Bill Friends entries for self-paid recurring bills", async () => {
    mockTemplateRepo.findById.mockResolvedValue(
      makeTemplate({ paymentMode: "self_paid", splitConfig: null }),
    );
    mockAccountRepo.findById.mockResolvedValue(makeAccount());

    const tx = {
      transaction: { create: vi.fn().mockResolvedValue(undefined) },
      account: { update: vi.fn().mockResolvedValue(undefined) },
      billFriend: { create: vi.fn().mockResolvedValue(undefined) },
    };

    mockPrisma.$transaction.mockImplementation(async (callback: (client: typeof tx) => Promise<void>) => callback(tx));

    await templateService.markTemplatePaid("tpl-1", "user-1");

    expect(tx.billFriend.create).not.toHaveBeenCalled();
  });
});
