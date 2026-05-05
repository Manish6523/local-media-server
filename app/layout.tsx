import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import Navbar from "@/components/Navbar";

const inter = Inter({
  variable: "--font-sans",
  subsets: ["latin"],
  display: "swap",
});

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
    <html lang="en" className={`${inter.variable} h-full antialiased`}>
      <body className="min-h-full flex flex-col bg-[#141414] text-[#e5e5e5]">
        <Navbar />
        <main className="flex-1">{children}</main>
      </body>
    </html>
  );
}
