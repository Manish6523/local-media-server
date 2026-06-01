import type { Metadata } from "next";
import { Inter, Geist } from "next/font/google";
import "./globals.css";
import AppShell from "@/components/layout/AppShell";
import { cn } from "@/lib/utils";

const geist = Geist({subsets:['latin'],variable:'--font-sans'});

export const metadata: Metadata = {
  title: "VidLock — Your Personal Media Library",
  description: "A fully local, offline Netflix-style media browser and player. No cloud, no accounts, no internet required.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className={cn("h-full", "antialiased", "font-sans", geist.variable, "dark")}>
      <body className="min-h-full flex flex-col">
        <AppShell>
          {children}
        </AppShell>
      </body>
    </html>
  );
}
