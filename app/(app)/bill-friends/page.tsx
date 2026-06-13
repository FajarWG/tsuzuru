import { auth } from "@/auth";
import { redirect } from "next/navigation";
import BillFriendsClient from "@/components/bill-friends/BillFriendsClient";

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

  return <BillFriendsClient userId={userId} />;
}
