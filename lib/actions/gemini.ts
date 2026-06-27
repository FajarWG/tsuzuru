"use server";

import { auth } from "@/auth";
import { aiService } from "@/services/aiService";

export async function checkAiLimitAction() {
  try {
    const session = await auth();
    if (!session?.user?.id) return { limited: false };

    return await aiService.checkAiLimit(session.user.id);
  } catch (error) {
    console.error("Failed to check AI limit:", error);
    return { limited: false };
  }
}

export async function parseReceiptTextAction(text: string) {
  try {
    const session = await auth();
    if (!session?.user?.id) return { success: false, error: "Unauthorized" };

    const data = await aiService.parseReceiptText(text, session.user.id);
    return { success: true, data };
  } catch (err) {
    console.error("parseReceiptTextAction error:", err);
    return { success: false, error: (err as Error).message };
  }
}

export async function parseReceiptTextCustomAction(text: string, model: string, systemPrompt: string) {
  try {
    const session = await auth();
    if (!session?.user?.id) return { success: false, error: "Unauthorized" };

    const data = await aiService.parseReceiptTextCustom(text, model, systemPrompt, session.user.id);
    return { success: true, data };
  } catch (err) {
    console.error("parseReceiptTextCustomAction error:", err);
    return { success: false, error: (err as Error).message };
  }
}

export async function parseReceiptImageAction(base64Data: string, mimeType: string, language?: string, excludeTax?: boolean) {
  try {
    const session = await auth();
    if (!session?.user?.id) return { success: false, error: "Unauthorized" };

    const data = await aiService.parseReceiptImage(base64Data, mimeType, session.user.id, language, excludeTax);
    return { success: true, data };
  } catch (err) {
    console.error("parseReceiptImageAction error:", err);
    return { success: false, error: (err as Error).message };
  }
}
