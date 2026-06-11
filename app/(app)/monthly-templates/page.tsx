import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { redirect } from "next/navigation";
import TemplatesConfigList from "@/components/templates/TemplatesConfigList";

export default async function MonthlyTemplatesPage() {
  const session = await auth();

  if (!session || !session.user) {
    redirect("/login");
  }

  const userId = session.user.id;

  // 1. Fetch all templates for the user (both active and inactive)
  const templates = await prisma.monthlyTemplate.findMany({
    where: { userId },
    orderBy: { name: "asc" },
  });

  // 2. Fetch all accounts for user configuration dropdowns
  const accounts = await prisma.account.findMany({
    where: { userId },
    select: {
      id: true,
      name: true,
      currency: true,
    },
  });

  return (
    <div className="flex flex-col flex-1">
      <TemplatesConfigList templates={templates} accounts={accounts} />
    </div>
  );
}
