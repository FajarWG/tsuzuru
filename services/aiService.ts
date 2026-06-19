import { prisma } from "@/lib/prisma";

/**
 * Gets the AI rate-limit status for a specific user from the database.
 * Per-user tracking replaces the old global filesystem-based approach.
 */
async function getAiStatus(userId: string): Promise<{ limitUntil: number }> {
  try {
    const settings = await prisma.userSettings.findUnique({
      where: { userId },
      select: { aiLimitUntil: true },
    });
    return { limitUntil: settings?.aiLimitUntil ? settings.aiLimitUntil.getTime() : 0 };
  } catch {
    return { limitUntil: 0 };
  }
}

/**
 * Sets the AI rate-limit expiry for a specific user in the database.
 */
async function setAiLimitUntil(userId: string, limitUntil: number) {
  try {
    await prisma.userSettings.upsert({
      where: { userId },
      update: { aiLimitUntil: new Date(limitUntil) },
      create: {
        userId,
        monthlyBudget: 0,
        pocketMoneyLimit: 0,
        shoppingLimit: 0,
        budgetCurrency: "JPY",
        isOnboarded: false,
        aiLimitUntil: new Date(limitUntil),
      },
    });
  } catch (err) {
    console.error("Failed to write AI limit status to DB:", err);
  }
}

export const aiService = {
  async checkAiLimit(userId: string) {
    const status = await getAiStatus(userId);
    const now = Date.now();
    if (status.limitUntil > now) {
      return { limited: true, secondsLeft: Math.ceil((status.limitUntil - now) / 1000) };
    }
    return { limited: false };
  },

  async parseReceiptText(text: string, userId: string) {
    const statusCheck = await this.checkAiLimit(userId);
    if (statusCheck.limited) {
      throw new Error(`AI is temporarily limited. Try again in ${statusCheck.secondsLeft} seconds.`);
    }

    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      throw new Error("GEMINI_API_KEY is not configured");
    }

    const model = "gemini-2.5-flash-lite";
    const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`;

    const systemPrompt = `You are a receipt parsing assistant. Extract items, quantities, and prices from the raw OCR receipt text.
Make sure the prices returned for each item are inclusive of tax. If tax/pajak, service charge, or any fee is listed in the receipt, calculate the overall tax/fee percentage and distribute it by adding it to each item's price proportionally.
Return the output strictly in JSON format matching this schema:
{
  "items": [
    { "name": "string (cleaned item name)", "price": number (price including tax) }
  ]
}
Do not include markdown tags, code blocks, or extra text. Return ONLY the raw JSON string.`;

    try {
      const response = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          contents: [{ role: "user", parts: [{ text: `${systemPrompt}\n\nOCR Text:\n${text}` }] }],
          generationConfig: { responseMimeType: "application/json" },
        }),
      });

      if (response.status === 429) {
        await setAiLimitUntil(userId, Date.now() + 5 * 60 * 1000);
        throw new Error("AI rate limit reached. Auto-parse disabled for 5 minutes.");
      }

      if (!response.ok) {
        const errText = await response.text();
        throw new Error(`Gemini API returned status ${response.status}: ${errText}`);
      }

      const resJson = await response.json();
      const replyText = resJson.candidates?.[0]?.content?.parts?.[0]?.text;
      if (!replyText) throw new Error("Empty response from Gemini API");

      return JSON.parse(replyText.trim());
    } catch (err) {
      const errMsg = (err as Error).message;
      if (errMsg.includes("429") || errMsg.toLowerCase().includes("quota") || errMsg.toLowerCase().includes("rate limit")) {
        await setAiLimitUntil(userId, Date.now() + 5 * 60 * 1000);
      }
      throw err;
    }
  },

  async parseReceiptTextCustom(text: string, model: string, systemPrompt: string, userId: string) {
    const statusCheck = await this.checkAiLimit(userId);
    if (statusCheck.limited) {
      throw new Error(`AI is temporarily limited. Try again in ${statusCheck.secondsLeft} seconds.`);
    }

    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) throw new Error("GEMINI_API_KEY is not configured");

    const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`;

    try {
      const response = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          contents: [{ role: "user", parts: [{ text: `${systemPrompt}\n\nOCR Text:\n${text}` }] }],
          generationConfig: { responseMimeType: "application/json" },
        }),
      });

      if (response.status === 429) {
        await setAiLimitUntil(userId, Date.now() + 5 * 60 * 1000);
        throw new Error("AI rate limit reached. Auto-parse disabled for 5 minutes.");
      }

      if (!response.ok) {
        const errText = await response.text();
        throw new Error(`Gemini API returned status ${response.status}: ${errText}`);
      }

      const resJson = await response.json();
      const replyText = resJson.candidates?.[0]?.content?.parts?.[0]?.text;
      if (!replyText) throw new Error("Empty response from Gemini API");

      return JSON.parse(replyText.trim());
    } catch (err) {
      const errMsg = (err as Error).message;
      if (errMsg.includes("429") || errMsg.toLowerCase().includes("quota") || errMsg.toLowerCase().includes("rate limit")) {
        await setAiLimitUntil(userId, Date.now() + 5 * 60 * 1000);
      }
      throw err;
    }
  },

  async parseReceiptImage(base64Image: string, mimeType: string, userId: string, language?: string) {
    const statusCheck = await this.checkAiLimit(userId);
    if (statusCheck.limited) {
      throw new Error(`AI is temporarily limited. Try again in ${statusCheck.secondsLeft} seconds.`);
    }

    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) throw new Error("GEMINI_API_KEY is not configured");

    const model = "gemini-2.5-flash";
    const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`;

    const translationInst =
      language === "id"
        ? " Translate the item names to Indonesian."
        : language === "en"
        ? " Translate the item names to English."
        : "";

    const systemPrompt = `You are a receipt parsing assistant. Extract items and their final prices from the receipt image.${translationInst}
Make sure the prices returned for each item are inclusive of tax. If tax/pajak, service charge, or any fee is listed in the receipt, calculate the overall tax/fee percentage and distribute it by adding it to each item's price proportionally.
Return the output strictly in JSON format matching this schema:
{
  "items": [
    { "name": "string (cleaned item name)", "price": number (price including tax) }
  ]
}
Do not include markdown tags, code blocks, or extra text. Return ONLY the raw JSON string.`;

    const requestBody = {
      contents: [
        {
          role: "user",
          parts: [
            { text: systemPrompt },
            { inlineData: { mimeType: mimeType, data: base64Image } },
          ],
        },
      ],
      generationConfig: { responseMimeType: "application/json" },
    };

    const delays = [2000, 4000];
    let attempt = 0;

    while (true) {
      try {
        const response = await fetch(url, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(requestBody),
        });

        if (response.status === 429) {
          await setAiLimitUntil(userId, Date.now() + 5 * 60 * 1000);
          throw new Error("AI rate limit reached. Auto-parse disabled for 5 minutes.");
        }

        if (response.status === 503) {
          if (attempt < delays.length) {
            const delay = delays[attempt];
            attempt++;
            console.warn(`Gemini API returned 503. Retrying attempt ${attempt} after ${delay}ms...`);
            await new Promise((resolve) => setTimeout(resolve, delay));
            continue;
          } else {
            await setAiLimitUntil(userId, Date.now() + 3 * 60 * 1000);
            throw new Error("The AI system is temporarily unavailable due to high demand. Please try again in 3 minutes or use the manual copy-paste mode instead.");
          }
        }

        if (!response.ok) {
          const errText = await response.text();
          throw new Error(`Gemini API returned status ${response.status}: ${errText}`);
        }

        const resJson = await response.json();
        const replyText = resJson.candidates?.[0]?.content?.parts?.[0]?.text;
        if (!replyText) throw new Error("Empty response from Gemini API");

        return JSON.parse(replyText.trim());
      } catch (err) {
        const errMsg = (err as Error).message;

        if (errMsg.includes("503") || errMsg.toLowerCase().includes("unavailable")) {
          if (attempt < delays.length) {
            const delay = delays[attempt];
            attempt++;
            await new Promise((resolve) => setTimeout(resolve, delay));
            continue;
          } else {
            await setAiLimitUntil(userId, Date.now() + 3 * 60 * 1000);
            throw new Error("The AI system is temporarily unavailable due to high demand. Please try again in 3 minutes or use the manual copy-paste mode instead.");
          }
        }

        if (errMsg.includes("429") || errMsg.toLowerCase().includes("quota") || errMsg.toLowerCase().includes("rate limit")) {
          await setAiLimitUntil(userId, Date.now() + 5 * 60 * 1000);
        }
        throw err;
      }
    }
  },
};
