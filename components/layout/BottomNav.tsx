"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  IconHome,
  IconReceipt,
  IconPlus,
  IconCalendarEvent,
  IconSettings,
} from "@tabler/icons-react";
import { cn } from "@/lib/utils";

export default function BottomNav() {
  const pathname = usePathname();

  const links = [
    { href: "/", label: "Home", icon: IconHome },
    { href: "/transactions", label: "History", icon: IconReceipt },
    { href: "/add", label: "Add", icon: IconPlus, isFab: true },
    { href: "/monthly-templates", label: "Templates", icon: IconCalendarEvent },
    { href: "/settings", label: "Settings", icon: IconSettings },
  ];

  return (
    <div className="fixed bottom-0 left-0 right-0 z-50 flex justify-center px-4 pb-4 pointer-events-none">
      <nav className="w-full max-w-[430px] h-16 bg-white/80 dark:bg-zinc-900/80 backdrop-blur-md border border-border/60 shadow-lg rounded-2xl flex items-center justify-around px-2 pointer-events-auto">
        {links.map((link) => {
          const Icon = link.icon;
          const isActive = pathname === link.href;

          if (link.isFab) {
            return (
              <Link
                key={link.href}
                href={link.href}
                className="flex items-center justify-center -translate-y-4 w-12 h-12 rounded-full bg-primary text-primary-foreground shadow-md hover:scale-105 active:scale-95 transition-all duration-200"
                aria-label={link.label}
              >
                <Icon className="size-6 stroke-[2.5]" />
              </Link>
            );
          }

          return (
            <Link
              key={link.href}
              href={link.href}
              className={cn(
                "flex flex-col items-center justify-center flex-1 h-full rounded-xl gap-0.5 text-muted-foreground hover:text-primary transition-colors",
                isActive && "text-primary dark:text-primary-foreground font-medium"
              )}
            >
              <Icon className="size-5 stroke-[1.8]" />
              <span className="text-[10px] tracking-wide">{link.label}</span>
            </Link>
          );
        })}
      </nav>
    </div>
  );
}
