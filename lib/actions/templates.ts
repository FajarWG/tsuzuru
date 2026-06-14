"use server";

import { auth } from "@/auth";
import { revalidatePath } from "next/cache";
import { templateService } from "@/services/templateService";
import { CreateTemplateInput, UpdateTemplateInput } from "@/types/template";

export async function markTemplatePaidAction(
  templateId: string,
  sourceAccountId?: string,
  customAmount?: number
) {
  try {
    const session = await auth();
    if (!session?.user?.id) return { success: false, error: "Unauthorized" };

    await templateService.markTemplatePaid(templateId, session.user.id, sourceAccountId, customAmount);

    revalidatePath("/");
    revalidatePath("/transactions");
    revalidatePath("/settings");
    return { success: true };
  } catch (err) {
    console.error("markTemplatePaidAction error:", err);
    return { success: false, error: (err as Error).message || "Failed to process payment" };
  }
}

export async function updateTemplateAction(
  templateId: string,
  data: UpdateTemplateInput
) {
  try {
    const session = await auth();
    if (!session?.user?.id) return { success: false, error: "Unauthorized" };

    await templateService.updateTemplate(templateId, data, session.user.id);

    revalidatePath("/settings");
    revalidatePath("/");
    return { success: true };
  } catch (err) {
    console.error("updateTemplateAction error:", err);
    return { success: false, error: (err as Error).message || "Failed to update bill" };
  }
}

export async function createTemplateAction(data: CreateTemplateInput) {
  try {
    const session = await auth();
    if (!session?.user?.id) return { success: false, error: "Unauthorized" };

    const newTemplate = await templateService.createTemplate(data, session.user.id);

    revalidatePath("/settings");
    revalidatePath("/");
    return { success: true, template: newTemplate };
  } catch (err) {
    console.error("createTemplateAction error:", err);
    return { success: false, error: (err as Error).message || "Failed to create bill" };
  }
}

export async function deleteTemplateAction(templateId: string) {
  try {
    const session = await auth();
    if (!session?.user?.id) return { success: false, error: "Unauthorized" };

    await templateService.deleteTemplate(templateId, session.user.id);

    revalidatePath("/settings");
    revalidatePath("/");
    return { success: true };
  } catch (err) {
    console.error("deleteTemplateAction error:", err);
    return { success: false, error: "Failed to delete bill" };
  }
}
