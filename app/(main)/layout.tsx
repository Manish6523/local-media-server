import type { Metadata } from "next";
import { Geist } from "next/font/google";
import "./globals.css";
import NavBar from "@/components/layout/NavBar";
import { BackgroundProvider } from "@/components/BackgroundContext";
import { ToastProvider } from "@/components/Toast";
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
      <body className="min-h-full relative" suppressHydrationWarning={false}>
        {/* Aurora gradient background */}
        <div className="aurora-bg" />
        
        <ToastProvider>
        <BackgroundProvider>
          <NavBar />
          <main className="relative z-10 min-h-screen pb-28 md:pb-0">
            {children}
          </main>
        </BackgroundProvider>
        </ToastProvider>
      </body>
    </html>
  );
}
