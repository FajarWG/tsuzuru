import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { redirect } from "next/navigation";
import TransactionForm from "@/components/transactions/TransactionForm";

export default async function AddTransactionPage() {
  const session = await auth();

  if (!session || !session.user) {
    redirect("/login");
  }

  const userId = session.user.id;

  // Fetch only active accounts to populate the transaction form
  const accounts = await prisma.account.findMany({
    where: { userId, isActive: true },
    select: {
      id: true,
      name: true,
      currency: true,
    },
  });

  return (
    <div className="flex flex-col flex-1">
      <TransactionForm userId={userId} accounts={accounts} />
    </div>
  );
}
