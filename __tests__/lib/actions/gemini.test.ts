/**
 * Tests for lib/actions/gemini.ts (AI Server Actions)
 *
 * Focus:
 *  - All AI actions must require authentication (previously none checked auth)
 *  - userId from session is passed to the service (rate limiting is now per-user)
 */
import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("@/auth", () => ({
  auth: vi.fn(),
}));

vi.mock("@/services/aiService", () => ({
  aiService: {
    checkAiLimit: vi.fn(),
    parseReceiptText: vi.fn(),
    parseReceiptTextCustom: vi.fn(),
    parseReceiptImage: vi.fn(),
  },
}));

import { auth } from "@/auth";
import {
  checkAiLimitAction,
  parseReceiptTextAction,
  parseReceiptTextCustomAction,
  parseReceiptImageAction,
} from "@/lib/actions/gemini";
import { aiService } from "@/services/aiService";

const mockAuth = auth as ReturnType<typeof vi.fn>;
const mockAiService = aiService as Record<string, ReturnType<typeof vi.fn>>;

const SESSION_USER_1 = { user: { id: "user-1", email: "user1@test.com" } };

beforeEach(() => vi.clearAllMocks());

// ---------------------------------------------------------------------------
// Auth gate — all AI actions now require authentication
// ---------------------------------------------------------------------------
describe("auth enforcement on AI actions", () => {
  beforeEach(() => mockAuth.mockResolvedValue(null));

  it("parseReceiptTextAction returns Unauthorized", async () => {
    const result = await parseReceiptTextAction("some text");
    expect(result).toMatchObject({ success: false, error: "Unauthorized" });
    expect(mockAiService.parseReceiptText).not.toHaveBeenCalled();
  });

  it("parseReceiptTextCustomAction returns Unauthorized", async () => {
    const result = await parseReceiptTextCustomAction("text", "model", "prompt");
    expect(result).toMatchObject({ success: false, error: "Unauthorized" });
    expect(mockAiService.parseReceiptTextCustom).not.toHaveBeenCalled();
  });

  it("parseReceiptImageAction returns Unauthorized", async () => {
    const result = await parseReceiptImageAction("base64data", "image/jpeg");
    expect(result).toMatchObject({ success: false, error: "Unauthorized" });
    expect(mockAiService.parseReceiptImage).not.toHaveBeenCalled();
  });

  it("checkAiLimitAction returns safe fallback (not limited) without session", async () => {
    // checkAiLimitAction has no auth guard by design (safe fallback)
    const result = await checkAiLimitAction();
    expect(result).toMatchObject({ limited: false });
  });
});

// ---------------------------------------------------------------------------
// Per-user rate limiting — userId from session passed to service
// ---------------------------------------------------------------------------
describe("per-user rate limit tracking", () => {
  it("passes session userId to aiService.checkAiLimit", async () => {
    mockAuth.mockResolvedValue(SESSION_USER_1);
    mockAiService.checkAiLimit.mockResolvedValue({ limited: false });

    await checkAiLimitAction();

    expect(mockAiService.checkAiLimit).toHaveBeenCalledWith("user-1");
  });

  it("passes session userId to aiService.parseReceiptText", async () => {
    mockAuth.mockResolvedValue(SESSION_USER_1);
    mockAiService.parseReceiptText.mockResolvedValue({ items: [] });

    await parseReceiptTextAction("receipt text");

    expect(mockAiService.parseReceiptText).toHaveBeenCalledWith("receipt text", "user-1");
  });

  it("passes session userId to aiService.parseReceiptImage", async () => {
    mockAuth.mockResolvedValue(SESSION_USER_1);
    mockAiService.parseReceiptImage.mockResolvedValue({ items: [] });

    await parseReceiptImageAction("base64", "image/jpeg", "id");

    expect(mockAiService.parseReceiptImage).toHaveBeenCalledWith("base64", "image/jpeg", "user-1", "id", undefined);
  });

  it("passes session userId to aiService.parseReceiptTextCustom", async () => {
    mockAuth.mockResolvedValue(SESSION_USER_1);
    mockAiService.parseReceiptTextCustom.mockResolvedValue({ items: [] });

    await parseReceiptTextCustomAction("text", "gemini-2.5-flash", "system prompt");

    expect(mockAiService.parseReceiptTextCustom).toHaveBeenCalledWith(
      "text", "gemini-2.5-flash", "system prompt", "user-1"
    );
  });
});

// ---------------------------------------------------------------------------
// Error handling
// ---------------------------------------------------------------------------
describe("error handling", () => {
  it("parseReceiptTextAction returns error message on service failure", async () => {
    mockAuth.mockResolvedValue(SESSION_USER_1);
    mockAiService.parseReceiptText.mockRejectedValue(new Error("AI rate limit reached"));

    const result = await parseReceiptTextAction("text");

    expect(result).toMatchObject({ success: false, error: "AI rate limit reached" });
  });
});
