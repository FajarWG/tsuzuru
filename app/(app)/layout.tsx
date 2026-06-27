import { auth } from "@/auth";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import BottomNav from "@/components/layout/BottomNav";
import AddTransactionFab from "@/components/transactions/AddTransactionFab";
import OfflineStatusIndicator from "@/components/layout/OfflineStatusIndicator";
import WelcomeDialog from "@/components/dashboard/WelcomeDialog";

export default async function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await auth();

  if (!session || !session.user) {
    redirect("/login");
  }

  const dbUser = await prisma.user.findUnique({
    where: { id: session.user.id },
    include: { settings: true },
  });

  if (!dbUser) {
    redirect("/api/auth/clear");
  }

  let userSettings = dbUser.settings;
  if (!userSettings) {
    userSettings = await prisma.userSettings.create({
      data: {
        userId: dbUser.id,
        monthlyBudget: 0,
        pocketMoneyLimit: 0,
        shoppingLimit: 0,
        budgetCurrency: "JPY",
        isOnboarded: false,
      },
    });
  }

  let isOnboarded = userSettings.isOnboarded;
  if (!isOnboarded) {
    const accountCount = await prisma.account.count({ where: { userId: dbUser.id } });
    if (accountCount > 0) {
      userSettings = await prisma.userSettings.update({
        where: { userId: dbUser.id },
        data: { isOnboarded: true },
      });
      isOnboarded = true;
    }
  }

  // Fetch accounts for the add transaction FAB dialog
  const accounts = await prisma.account.findMany({
    where: { userId: session.user.id, isActive: true },
    select: { id: true, name: true, currency: true },
    orderBy: { name: "asc" },
  });

  // Fetch active budget categories (excluding monthly) for transaction categories
  const dbBudgets = await prisma.budgetLimit.findMany({
    where: { userId: session.user.id, NOT: { name: "monthly" } },
    select: { name: true, label: true, subCategories: true },
    orderBy: { createdAt: "asc" },
  });

  return (
    <div className="flex-1 w-full max-w-[430px] mx-auto min-h-screen bg-background shadow-2xl border-x border-border/20 relative flex flex-col overflow-x-hidden">
      <OfflineStatusIndicator />
      <WelcomeDialog isOnboarded={isOnboarded} userId={session.user.id} />
      <main className="flex-1 flex flex-col p-5">
        {children}
      </main>
      <BottomNav
        fab={
          <AddTransactionFab
            userId={session.user.id}
            accounts={accounts}
            budgetCategories={dbBudgets}
          />
        }
      />
    </div>
  );
}
