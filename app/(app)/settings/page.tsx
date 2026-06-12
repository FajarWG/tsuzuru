import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { redirect } from "next/navigation";
import SettingsForm from "@/components/settings/SettingsForm";

export const metadata = {
  title: "Settings — Tsuzuru",
};

interface SettingsPageProps {
  searchParams: Promise<{ tab?: string }>;
}

export default async function SettingsPage({ searchParams }: SettingsPageProps) {
  const session = await auth();

  if (!session || !session.user) {
    redirect("/login");
  }

  const userId = session.user.id;
  const params = await searchParams;
  const activeTab = params.tab || "templates";

  // 1. Fetch user settings (with fallback creation if not found)
  let userSettings = await prisma.userSettings.findUnique({
    where: { userId },
  });

  if (!userSettings) {
    userSettings = await prisma.userSettings.create({
      data: {
        userId,
        monthlyBudget: 150000,
        pocketMoneyLimit: 40000,
        shoppingLimit: 60000,
        budgetCurrency: "JPY",
      },
    });
  }

  // 2. Fetch all accounts for user edit list (active and inactive)
  const accounts = await prisma.account.findMany({
    where: { userId },
    orderBy: { name: "asc" },
  });

  // 3. Fetch monthly templates for the templates section
  const templates = await prisma.monthlyTemplate.findMany({
    where: { userId },
    orderBy: { name: "asc" },
  });

  return (
    <div className="flex flex-col flex-1">
      <SettingsForm
        userId={userId}
        userSettings={userSettings}
        accounts={accounts}
        templates={templates}
        profile={{
          name: session.user.name,
          email: session.user.email,
          image: session.user.image,
        }}
        defaultTab={activeTab}
      />
    </div>
  );
}

