import { auth } from "@/auth";
import { redirect } from "next/navigation";
import BottomNav from "@/components/layout/BottomNav";

export default async function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await auth();

  if (!session) {
    redirect("/login");
  }

  return (
    <div className="flex-1 w-full max-w-[430px] mx-auto min-h-screen bg-background shadow-2xl border-x border-border/20 relative flex flex-col pb-24">
      <main className="flex-1 flex flex-col p-5">
        {children}
      </main>
      <BottomNav />
    </div>
  );
}
