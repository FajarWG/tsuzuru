"use client";

import type { ReactNode } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  IconHome,
  IconReceipt,
  IconUsersGroup,
  IconSettings,
} from "@tabler/icons-react";
import { cn } from "@/lib/utils";

interface BottomNavProps {
  fab?: ReactNode;
}

export default function BottomNav({ fab }: BottomNavProps) {
  const pathname = usePathname();

  const links = [
    { href: "/", icon: IconHome, label: "Home" },
    { href: "/transactions", icon: IconReceipt, label: "History" },
    { href: "add-dialog", label: "Add", isFab: true },
    { href: "/bill-friends", icon: IconUsersGroup, label: "Friends" },
    { href: "/settings", icon: IconSettings, label: "Settings" },
  ];

  return (
    <>
      <div
        className="fixed bottom-0 left-0 right-0 z-50 flex justify-center pointer-events-none"
        style={{ paddingBottom: "calc(1.1rem + env(safe-area-inset-bottom, 0px))" }}
      >
        {/* iPhone-style floating pill — truly transparent blur */}
        <nav
          className="w-full max-w-[380px] pointer-events-auto flex items-center justify-around px-2.5 h-[60px] rounded-[26px] bg-white/20 dark:bg-zinc-950/20 backdrop-blur-2xl border border-border/25 shadow-lg"
        >
          {links.map((link) => {
            const Icon = link.icon;
            const isActive =
              pathname === link.href ||
              (link.href !== "/" && pathname.startsWith(link.href));

            if (link.isFab) {
              return <div key={link.href} className="mx-1">{fab}</div>;
            }

            if (!Icon) return null;

            return (
              <Link
                key={link.href}
                href={link.href}
                aria-label={link.label}
                className={cn(
                  "flex items-center justify-center w-11 h-11 rounded-[15px] transition-all duration-200",
                  isActive
                    ? "bg-primary/12 text-primary"
                    : "text-zinc-400/80 hover:text-zinc-600 hover:bg-black/5"
                )}
              >
                <Icon
                  className={cn(
                    "transition-all duration-200",
                    isActive ? "size-[22px] stroke-[2]" : "size-[21px] stroke-[1.6]"
                  )}
                />
              </Link>
            );
          })}
        </nav>
      </div>
      {/* Spacer */}
      <div className="h-24" />
    </>
  );
}
