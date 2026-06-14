"use server";

import { auth } from "@/auth";
import { dashboardService } from "@/services/dashboardService";

export async function getDashboardDataAction() {
  try {
    const session = await auth();
    if (!session || !session.user || !session.user.id) {
      return { success: false, error: "Unauthorized" };
    }

    const data = await dashboardService.getDashboardData(session.user.id, {
      name: session.user.name || null,
      image: session.user.image || null,
    });

    return {
      success: true,
      data,
    };
  } catch (error) {
    console.error("Failed to fetch dashboard data:", error);
    return { success: false, error: "Failed to fetch dashboard data" };
  }
}
