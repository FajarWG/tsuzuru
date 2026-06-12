import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { redirect } from "next/navigation";
import BillFriendsList from "@/components/bill-friends/BillFriendsList";

export const metadata = {
  title: "Bill Friends — Tsuzuru",
  description: "Track money owed between you and your friends",
};

export default async function BillFriendsPage() {
  const session = await auth();

  if (!session || !session.user) {
    redirect("/login");
  }

  const userId = session.user.id;

  const bills = await prisma.billFriend.findMany({
    where: { userId },
    orderBy: { createdAt: "desc" },
  });

  return (
    <div className="flex flex-col flex-1">
      <BillFriendsList bills={bills} />
    </div>
  );
}
