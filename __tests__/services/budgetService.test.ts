/**
 * Tests for budgetService
 *
 * Focus:
 *  - User isolation: budget limits are strictly scoped to their owner
 *  - Business rules: duplicate names rejected, "monthly" limit protected from deletion
 */
import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("@/lib/seedBudgetLimits", () => ({
  seedBudgetLimitsIfEmpty: vi.fn(),
}));

vi.mock("@/repositories/budgetRepository", () => ({
  budgetRepository: {
    findMany: vi.fn(),
    findFirstByName: vi.fn(),
    findFirstById: vi.fn(),
    create: vi.fn(),
    createMany: vi.fn(),
    update: vi.fn(),
    delete: vi.fn(),
  },
}));

vi.mock("@/repositories/settingsRepository", () => ({
  settingsRepository: {
    findUserSettings: vi.fn(),
    updateUserSettings: vi.fn(),
  },
}));

import { budgetService } from "@/services/budgetService";
import { budgetRepository } from "@/repositories/budgetRepository";
import { settingsRepository } from "@/repositories/settingsRepository";
import { seedBudgetLimitsIfEmpty } from "@/lib/seedBudgetLimits";

const mockBudgetRepo = budgetRepository as Record<string, ReturnType<typeof vi.fn>>;
const mockSettingsRepo = settingsRepository as Record<string, ReturnType<typeof vi.fn>>;
const mockSeed = seedBudgetLimitsIfEmpty as ReturnType<typeof vi.fn>;

beforeEach(() => vi.clearAllMocks());

const makeBudget = (overrides = {}) => ({
  id: "budget-1",
  userId: "user-1",
  name: "pocket_money",
  label: "Pocket Money",
  limit: 40000,
  createdAt: new Date(),
  ...overrides,
});

// ---------------------------------------------------------------------------
// getBudgetLimits — delegates to shared seed helper
// ---------------------------------------------------------------------------
describe("budgetService.getBudgetLimits", () => {
  it("delegates to seedBudgetLimitsIfEmpty", async () => {
    mockSeed.mockResolvedValue([makeBudget()]);

    const result = await budgetService.getBudgetLimits("user-1");

    expect(mockSeed).toHaveBeenCalledWith("user-1");
    expect(result).toHaveLength(1);
  });
});

// ---------------------------------------------------------------------------
// addBudgetLimit
// ---------------------------------------------------------------------------
describe("budgetService.addBudgetLimit", () => {
  it("creates a new budget limit with a slugified name", async () => {
    mockBudgetRepo.findFirstByName.mockResolvedValue(null); // no existing
    mockBudgetRepo.create.mockResolvedValue(makeBudget({ name: "food_delivery", label: "Food Delivery" }));

    const result = await budgetService.addBudgetLimit("Food Delivery", 20000, "user-1");

    expect(mockBudgetRepo.create).toHaveBeenCalledWith(
      expect.objectContaining({ userId: "user-1", name: "food_delivery", label: "Food Delivery", limit: 20000 })
    );
    expect(result).toBeDefined();
  });

  it("throws if a limit with the same slugified name already exists for this user", async () => {
    mockBudgetRepo.findFirstByName.mockResolvedValue(makeBudget());

    await expect(
      budgetService.addBudgetLimit("Pocket Money", 10000, "user-1")
    ).rejects.toThrow("already exists");
  });

  it("throws if label is empty", async () => {
    await expect(
      budgetService.addBudgetLimit("  ", 10000, "user-1")
    ).rejects.toThrow("Label is required");
  });

  it("throws for reserved system names (monthly)", async () => {
    await expect(
      budgetService.addBudgetLimit("monthly", 10000, "user-1")
    ).rejects.toThrow("Invalid category name");
  });

  it("user A cannot affect user B — userId is enforced by the repository query", async () => {
    // The uniqueness check uses findFirstByName scoped to userId
    mockBudgetRepo.findFirstByName.mockImplementation(async (userId: string) => {
      if (userId === "user-2") return makeBudget({ userId: "user-2" });
      return null;
    });
    mockBudgetRepo.create.mockResolvedValue(makeBudget({ userId: "user-1" }));

    // user-1 should be able to create "pocket_money" even if user-2 already has it
    await expect(
      budgetService.addBudgetLimit("Pocket Money", 40000, "user-1")
    ).resolves.toBeDefined();
  });
});

// ---------------------------------------------------------------------------
// updateBudgetLimit — ownership
// ---------------------------------------------------------------------------
describe("budgetService.updateBudgetLimit", () => {
  it("throws if budget not found (wrong owner or wrong id)", async () => {
    mockBudgetRepo.findFirstById.mockResolvedValue(null);

    await expect(
      budgetService.updateBudgetLimit("budget-other", "Shopping", 50000, "user-1")
    ).rejects.toThrow("not found");
  });

  it("updates successfully for the owner", async () => {
    mockBudgetRepo.findFirstById.mockResolvedValue(makeBudget({ name: "shopping", label: "Shopping" }));
    mockBudgetRepo.update.mockResolvedValue(makeBudget({ limit: 50000 }));
    mockSettingsRepo.updateUserSettings.mockResolvedValue({});

    await expect(
      budgetService.updateBudgetLimit("budget-1", "Shopping", 50000, "user-1")
    ).resolves.toBeDefined();
  });
});

// ---------------------------------------------------------------------------
// deleteBudgetLimit — system default protection
// ---------------------------------------------------------------------------
describe("budgetService.deleteBudgetLimit", () => {
  it("throws when trying to delete the protected 'monthly' budget", async () => {
    mockBudgetRepo.findFirstById.mockResolvedValue(makeBudget({ name: "monthly" }));

    await expect(
      budgetService.deleteBudgetLimit("budget-1", "user-1")
    ).rejects.toThrow("cannot be deleted");
  });

  it("throws if budget not found (wrong owner)", async () => {
    mockBudgetRepo.findFirstById.mockResolvedValue(null);

    await expect(
      budgetService.deleteBudgetLimit("budget-other", "user-1")
    ).rejects.toThrow("not found");
  });

  it("deletes a custom budget for the owner", async () => {
    mockBudgetRepo.findFirstById.mockResolvedValue(makeBudget({ name: "food_delivery" }));
    mockBudgetRepo.delete.mockResolvedValue(undefined);

    await expect(
      budgetService.deleteBudgetLimit("budget-1", "user-1")
    ).resolves.not.toThrow();

    expect(mockBudgetRepo.delete).toHaveBeenCalledWith("budget-1", "user-1");
  });
});
