/**
 * Tests for lib/actions/settings.ts (Server Actions)
 *
 * Focus:
 *  - updateUserSettingsAction must reject unauthenticated callers (was missing auth check)
 *  - updateAccountsAction must use session userId — parameter removed from signature
 *  - completeOnboardingAction must reject unauthenticated callers (was missing auth check)
 *  - session.user.id always overrides any client-supplied userId
 */
import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("@/auth", () => ({
  auth: vi.fn(),
}));

vi.mock("@/services/settingsService", () => ({
  settingsService: {
    updateUserSettings: vi.fn(),
    updateAccounts: vi.fn(),
    resetUserSettingsAndData: vi.fn(),
    completeOnboarding: vi.fn(),
    getUserSettingsData: vi.fn(),
  },
}));

vi.mock("next/cache", () => ({
  revalidatePath: vi.fn(),
}));

import { auth } from "@/auth";
import {
  updateUserSettingsAction,
  updateAccountsAction,
  resetUserSettingsAndDataAction,
  completeOnboardingAction,
  getUserSettingsDataAction,
} from "@/lib/actions/settings";
import { settingsService } from "@/services/settingsService";

const mockAuth = auth as ReturnType<typeof vi.fn>;
const mockService = settingsService as Record<string, ReturnType<typeof vi.fn>>;

const SESSION_USER_1 = { user: { id: "user-1", email: "user1@test.com", name: "User 1", image: null } };

beforeEach(() => vi.clearAllMocks());

// ---------------------------------------------------------------------------
// Auth gate — previously missing for some actions
// ---------------------------------------------------------------------------
describe("auth enforcement (actions that previously had no auth check)", () => {
  beforeEach(() => mockAuth.mockResolvedValue(null));

  it("updateUserSettingsAction returns Unauthorized without session", async () => {
    const result = await updateUserSettingsAction({
      userId: "user-1", monthlyBudget: 100000, pocketMoneyLimit: 40000,
      shoppingLimit: 60000, budgetCurrency: "JPY"
    });
    expect(result).toMatchObject({ success: false, error: "Unauthorized" });
    expect(mockService.updateUserSettings).not.toHaveBeenCalled();
  });

  it("updateAccountsAction returns Unauthorized without session", async () => {
    const result = await updateAccountsAction([]);
    expect(result).toMatchObject({ success: false, error: "Unauthorized" });
    expect(mockService.updateAccounts).not.toHaveBeenCalled();
  });

  it("completeOnboardingAction returns Unauthorized without session", async () => {
    const result = await completeOnboardingAction({
      userId: "user-1", currency: "JPY", monthlyBudget: 150000,
      pocketMoneyLimit: 40000, shoppingLimit: 60000, accounts: [], templates: []
    });
    expect(result).toMatchObject({ success: false, error: "Unauthorized" });
    expect(mockService.completeOnboarding).not.toHaveBeenCalled();
  });

  it("resetUserSettingsAndDataAction returns Unauthorized without session", async () => {
    const result = await resetUserSettingsAndDataAction();
    expect(result).toMatchObject({ success: false, error: "Unauthorized" });
  });

  it("getUserSettingsDataAction returns Unauthorized without session", async () => {
    const result = await getUserSettingsDataAction();
    expect(result).toMatchObject({ success: false, error: "Unauthorized" });
  });
});

// ---------------------------------------------------------------------------
// updateUserSettingsAction — session userId overrides client-supplied userId
// ---------------------------------------------------------------------------
describe("updateUserSettingsAction", () => {
  it("always uses session userId, ignores client-supplied userId", async () => {
    mockAuth.mockResolvedValue(SESSION_USER_1);
    mockService.updateUserSettings.mockResolvedValue({});

    // Client supplies userId: "malicious-user" — must be overridden by session
    await updateUserSettingsAction({
      userId: "malicious-user",
      monthlyBudget: 100000, pocketMoneyLimit: 40000, shoppingLimit: 60000, budgetCurrency: "JPY"
    });

    expect(mockService.updateUserSettings).toHaveBeenCalledWith(
      expect.objectContaining({ userId: "user-1" }) // session user, not malicious-user
    );
  });
});

// ---------------------------------------------------------------------------
// updateAccountsAction — no userId param, uses session
// ---------------------------------------------------------------------------
describe("updateAccountsAction", () => {
  it("uses session userId to scope account updates", async () => {
    mockAuth.mockResolvedValue(SESSION_USER_1);
    mockService.updateAccounts.mockResolvedValue([]);

    const accounts = [{ id: "acc-1", name: "Jago", balance: 10000, isActive: true }];
    await updateAccountsAction(accounts);

    expect(mockService.updateAccounts).toHaveBeenCalledWith("user-1", accounts);
  });
});

// ---------------------------------------------------------------------------
// completeOnboardingAction — session userId overrides client-supplied userId
// ---------------------------------------------------------------------------
describe("completeOnboardingAction", () => {
  it("uses session userId, overrides client-supplied userId", async () => {
    mockAuth.mockResolvedValue(SESSION_USER_1);
    mockService.completeOnboarding.mockResolvedValue({});

    await completeOnboardingAction({
      userId: "attacker-user", // should be overridden
      currency: "JPY",
      monthlyBudget: 150000,
      pocketMoneyLimit: 40000,
      shoppingLimit: 60000,
      accounts: [],
      templates: [],
    });

    expect(mockService.completeOnboarding).toHaveBeenCalledWith(
      expect.objectContaining({ userId: "user-1" }) // session user wins
    );
  });
});

// ---------------------------------------------------------------------------
// getUserSettingsDataAction
// ---------------------------------------------------------------------------
describe("getUserSettingsDataAction", () => {
  it("returns data when authenticated", async () => {
    mockAuth.mockResolvedValue(SESSION_USER_1);
    mockService.getUserSettingsData.mockResolvedValue({ userSettings: {}, accounts: [], templates: [], budgetLimits: [] });

    const result = await getUserSettingsDataAction();

    expect(result).toMatchObject({ success: true });
    expect(mockService.getUserSettingsData).toHaveBeenCalledWith("user-1", expect.any(Object));
  });
});
