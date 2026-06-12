import type { Metadata } from "next";
import { Inter, Noto_Serif_JP } from "next/font/google";
import "./globals.css";
import { cn } from "@/lib/utils";
import { Toaster } from "@/components/ui/sonner";

import LoadingProvider from "@/components/layout/LoadingProvider";
import PwaRegister from "@/components/layout/PwaRegister";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-sans",
});

const notoSerifJp = Noto_Serif_JP({
  weight: ["400", "500", "700"],
  subsets: ["latin"],
  variable: "--font-serif",
});

export const metadata: Metadata = {
  title: "Tsuzuru (綴る)",
  description: "Weave your money story — お金の物語を綴ろう",
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: "Tsuzuru",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={cn("h-full", "antialiased", inter.variable, notoSerifJp.variable, "font-sans")}
    >
      <body className="min-h-full flex flex-col bg-background text-foreground animate-in fade-in duration-300">
        <LoadingProvider>{children}</LoadingProvider>
        <PwaRegister />
        <Toaster />
      </body>
    </html>
  );
}
