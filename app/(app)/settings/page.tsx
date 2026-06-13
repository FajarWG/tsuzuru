import { auth } from "@/auth";
import { redirect } from "next/navigation";
import SettingsClient from "@/components/settings/SettingsClient";

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

  return <SettingsClient userId={userId} defaultTab={activeTab} />;
}

