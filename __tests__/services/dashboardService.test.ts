/**
 * Tests for dashboardService — per-item category budget calculation
 *
 * Focus:
 *  - Receipt transactions with mixed categories are attributed correctly per item
 *  - Non-receipt transactions use tx.category as before (no regression)
 *  - Tax is distributed proportionally across categories
 *  - Items without category override fall back to tx.category
 */
import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("@/repositories/dashboardRepository", () => ({
  dashboardRepository: {
    getRawDashboardData: vi.fn(),
  },
}));

vi.mock("@/repositories/settingsRepository", () => ({
  settingsRepository: {
    findUserSettings: vi.fn(),
    createUserSettings: vi.fn(),
  },
}));

vi.mock("@/lib/seedBudgetLimits", () => ({
  seedBudgetLimitsIfEmpty: vi.fn(),
}));

import { dashboardService } from "@/services/dashboardService";
import { dashboardRepository } from "@/repositories/dashboardRepository";
import { settingsRepository } from "@/repositories/settingsRepository";
import { seedBudgetLimitsIfEmpty } from "@/lib/seedBudgetLimits";

const mockDashRepo = dashboardRepository as Record<string, ReturnType<typeof vi.fn>>;
const mockSettingsRepo = settingsRepository as Record<string, ReturnType<typeof vi.fn>>;
const mockSeed = seedBudgetLimitsIfEmpty as ReturnType<typeof vi.fn>;

const baseUserSettings = {
  id: "us-1",
  userId: "user-1",
  monthlyBudget: 100000,
  pocketMoneyLimit: 50000,
  shoppingLimit: 30000,
  budgetCurrency: "JPY",
  isOnboarded: true,
  aiLimitUntil: null,
};

const makeBudgetLimits = () => [
  { id: "b-monthly", name: "monthly", label: "Monthly", limit: 100000, userId: "user-1", createdAt: new Date() },
  { id: "b-pocket", name: "pocket_money", label: "Pocket Money", limit: 50000, userId: "user-1", createdAt: new Date() },
  { id: "b-shopping", name: "shopping", label: "Shopping", limit: 30000, userId: "user-1", createdAt: new Date() },
];

const makeRawData = (expenses: object[], previousExpenses: object[] = []) => ({
  userSettings: baseUserSettings,
  accounts: [],
  budgetLimits: makeBudgetLimits(),
  monthlyExpensesRaw: expenses,
  previousMonthlyExpensesRaw: previousExpenses,
  monthlyIncomeRaw: [],
  previousMonthlyIncomeRaw: [],
});

beforeEach(() => {
  vi.clearAllMocks();
  mockSettingsRepo.findUserSettings.mockResolvedValue(baseUserSettings);
  mockSeed.mockResolvedValue(makeBudgetLimits());
});

// ---------------------------------------------------------------------------
// Non-receipt transactions — backward compat
// ---------------------------------------------------------------------------
describe("dashboardService — non-receipt transactions (regression)", () => {
  it("attributes a non-receipt pocket_money tx to pocket_money budget", async () => {
    mockDashRepo.getRawDashboardData.mockResolvedValue(
      makeRawData([
        {
          id: "tx-1",
          amount: 1000,
          category: "pocket_money",
          currency: "JPY",
          type: "expense",
          date: new Date(),
          isReceipt: false,
          receiptItems: null,
        },
      ])
    );

    const result = await dashboardService.getDashboardData("user-1", { name: "Test", image: null });

    const pocket = result.budgetLimits.find((b) => b.name === "pocket_money");
    const shopping = result.budgetLimits.find((b) => b.name === "shopping");
    const monthly = result.budgetLimits.find((b) => b.name === "monthly");

    expect(pocket?.spent).toBe(1000);
    expect(shopping?.spent).toBe(0);
    expect(monthly?.spent).toBe(1000);
  });

  it("attributes a non-receipt shopping tx only to shopping budget", async () => {
    mockDashRepo.getRawDashboardData.mockResolvedValue(
      makeRawData([
        {
          id: "tx-2",
          amount: 5000,
          category: "shopping",
          currency: "JPY",
          type: "expense",
          date: new Date(),
          isReceipt: false,
          receiptItems: null,
        },
      ])
    );

    const result = await dashboardService.getDashboardData("user-1", { name: "Test", image: null });

    const pocket = result.budgetLimits.find((b) => b.name === "pocket_money");
    const shopping = result.budgetLimits.find((b) => b.name === "shopping");

    expect(pocket?.spent).toBe(0);
    expect(shopping?.spent).toBe(5000);
  });
});

// ---------------------------------------------------------------------------
// Receipt transactions — all same category (no item-level override)
// ---------------------------------------------------------------------------
describe("dashboardService — receipt, single category (no override)", () => {
  it("attributes the full receipt amount to the tx-level category when no item override", async () => {
    mockDashRepo.getRawDashboardData.mockResolvedValue(
      makeRawData([
        {
          id: "tx-3",
          amount: 3000,
          category: "pocket_money",
          currency: "JPY",
          type: "expense",
          date: new Date(),
          isReceipt: true,
          receiptItems: [
            { name: "Onigiri", price: 150, category: "pocket_money", subCategory: "food" },
            { name: "Bottle Tea", price: 120, category: "pocket_money", subCategory: "drinks" },
          ],
        },
      ])
    );

    const result = await dashboardService.getDashboardData("user-1", { name: "Test", image: null });

    const pocket = result.budgetLimits.find((b) => b.name === "pocket_money");
    const shopping = result.budgetLimits.find((b) => b.name === "shopping");

    // All items → pocket_money, tx.amount = 3000 (e.g. includes tax)
    expect(pocket?.spent).toBe(3000);
    expect(shopping?.spent).toBe(0);
  });
});

// ---------------------------------------------------------------------------
// Receipt transactions — MIXED categories (core feature)
// ---------------------------------------------------------------------------
describe("dashboardService — receipt, mixed categories (per-item attribution)", () => {
  it("splits budget attribution proportionally for mixed-category receipt", async () => {
    // Receipt: 2 pocket_money items (¥800 total) + 1 shopping item (¥200)
    // tx.amount = 1000 (no tax for simplicity — 800+200=1000)
    mockDashRepo.getRawDashboardData.mockResolvedValue(
      makeRawData([
        {
          id: "tx-4",
          amount: 1000,
          category: "pocket_money", // tx-level default
          currency: "JPY",
          type: "expense",
          date: new Date(),
          isReceipt: true,
          receiptItems: [
            { name: "Food A", price: 400, category: "pocket_money", subCategory: "food" },
            { name: "Drink B", price: 400, category: "pocket_money", subCategory: "drinks" },
            { name: "Shampoo", price: 200, category: "shopping", subCategory: "health" },
          ],
        },
      ])
    );

    const result = await dashboardService.getDashboardData("user-1", { name: "Test", image: null });

    const pocket = result.budgetLimits.find((b) => b.name === "pocket_money");
    const shopping = result.budgetLimits.find((b) => b.name === "shopping");

    // pocket_money: 800/1000 * 1000 = 800
    expect(pocket?.spent).toBe(800);
    // shopping: 200/1000 * 1000 = 200
    expect(shopping?.spent).toBe(200);
  });

  it("correctly distributes tax proportionally across categories", async () => {
    // Items: pocket_money ¥500 + shopping ¥500, tax 10% → tx.amount = 1100
    // pocket_money proportion: 500/1000 = 0.5 → 0.5 * 1100 = 550
    // shopping proportion:     500/1000 = 0.5 → 0.5 * 1100 = 550
    mockDashRepo.getRawDashboardData.mockResolvedValue(
      makeRawData([
        {
          id: "tx-5",
          amount: 1100,
          category: "pocket_money",
          currency: "JPY",
          type: "expense",
          date: new Date(),
          isReceipt: true,
          receiptItems: [
            { name: "Food", price: 500, category: "pocket_money", subCategory: "food" },
            { name: "Book", price: 500, category: "shopping", subCategory: "others" },
          ],
        },
      ])
    );

    const result = await dashboardService.getDashboardData("user-1", { name: "Test", image: null });

    const pocket = result.budgetLimits.find((b) => b.name === "pocket_money");
    const shopping = result.budgetLimits.find((b) => b.name === "shopping");

    expect(pocket?.spent).toBe(550);
    expect(shopping?.spent).toBe(550);
    // Monthly should sum both (full tx.amount)
    expect(result.budgetLimits.find((b) => b.name === "monthly")?.spent).toBe(1100);
  });

  it("falls back to tx.category for items without explicit category override", async () => {
    // Item 1: no category override → inherits tx.category = "pocket_money"
    // Item 2: explicit shopping override
    // Total items: ¥600 (no override) + ¥400 (shopping) = ¥1000 = tx.amount
    mockDashRepo.getRawDashboardData.mockResolvedValue(
      makeRawData([
        {
          id: "tx-6",
          amount: 1000,
          category: "pocket_money",
          currency: "JPY",
          type: "expense",
          date: new Date(),
          isReceipt: true,
          receiptItems: [
            { name: "Lunch", price: 600 }, // no category → fallback to tx.category = pocket_money
            { name: "Soap", price: 400, category: "shopping", subCategory: "health" },
          ],
        },
      ])
    );

    const result = await dashboardService.getDashboardData("user-1", { name: "Test", image: null });

    const pocket = result.budgetLimits.find((b) => b.name === "pocket_money");
    const shopping = result.budgetLimits.find((b) => b.name === "shopping");

    // pocket_money: 600/1000 * 1000 = 600
    expect(pocket?.spent).toBe(600);
    // shopping: 400/1000 * 1000 = 400
    expect(shopping?.spent).toBe(400);
  });
});
