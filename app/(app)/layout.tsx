import { auth } from "@/auth";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import BottomNav from "@/components/layout/BottomNav";
import AddTransactionFab from "@/components/transactions/AddTransactionFab";

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
  });

  if (!dbUser) {
    redirect("/api/auth/clear");
  }

  // Fetch accounts for the add transaction FAB dialog
  const accounts = await prisma.account.findMany({
    where: { userId: session.user.id, isActive: true },
    select: { id: true, name: true, currency: true },
    orderBy: { name: "asc" },
  });

  return (
    <div className="flex-1 w-full max-w-[430px] mx-auto min-h-screen bg-background shadow-2xl border-x border-border/20 relative flex flex-col">
      <main className="flex-1 flex flex-col p-5">
        {children}
      </main>
      <BottomNav
        fab={
          <AddTransactionFab
            userId={session.user.id}
            accounts={accounts}
          />
        }
      />
    </div>
  );
}
