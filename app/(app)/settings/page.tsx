import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { redirect } from "next/navigation";
import SettingsForm from "@/components/settings/SettingsForm";

export default async function SettingsPage() {
  const session = await auth();

  if (!session || !session.user) {
    redirect("/login");
  }

  const userId = session.user.id;

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

  return (
    <div className="flex flex-col flex-1">
      <SettingsForm
        userId={userId}
        userSettings={userSettings}
        accounts={accounts}
        profile={{
          name: session.user.name,
          email: session.user.email,
          image: session.user.image,
        }}
      />
    </div>
  );
}
