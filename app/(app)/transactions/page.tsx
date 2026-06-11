import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { redirect } from "next/navigation";
import TransactionsList from "@/components/transactions/TransactionsList";

export default async function TransactionsPage() {
  const session = await auth();

  if (!session || !session.user) {
    redirect("/login");
  }

  const userId = session.user.id;

  // 1. Fetch all transactions for the user, ordered by date descending
  const transactions = await prisma.transaction.findMany({
    where: { userId },
    orderBy: { date: "desc" },
    include: {
      account: {
        select: {
          id: true,
          name: true,
        },
      },
    },
  });

  // 2. Fetch all accounts for filters
  const accounts = await prisma.account.findMany({
    where: { userId },
    select: {
      id: true,
      name: true,
    },
  });

  return (
    <div className="flex flex-col flex-1">
      <TransactionsList transactions={transactions} accounts={accounts} />
    </div>
  );
}
