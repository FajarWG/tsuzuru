"use server";

import { aiService } from "@/services/aiService";

export async function checkAiLimitAction() {
  try {
    return await aiService.checkAiLimit();
  } catch (error) {
    console.error("Failed to check AI limit:", error);
    return { limited: false };
  }
}

export async function parseReceiptTextAction(text: string) {
  try {
    const data = await aiService.parseReceiptText(text);
    return { success: true, data };
  } catch (err) {
    console.error("parseReceiptTextAction error:", err);
    return { success: false, error: (err as Error).message };
  }
}

export async function parseReceiptTextCustomAction(text: string, model: string, systemPrompt: string) {
  try {
    const data = await aiService.parseReceiptTextCustom(text, model, systemPrompt);
    return { success: true, data };
  } catch (err) {
    console.error("parseReceiptTextCustomAction error:", err);
    return { success: false, error: (err as Error).message };
  }
}

export async function parseReceiptImageAction(base64Data: string, mimeType: string, language?: string) {
  try {
    const data = await aiService.parseReceiptImage(base64Data, mimeType, language);
    return { success: true, data };
  } catch (err) {
    console.error("parseReceiptImageAction error:", err);
    return { success: false, error: (err as Error).message };
  }
}
