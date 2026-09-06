import type { Metadata, Viewport } from "next";
import Script from "next/script";
import { Geist } from "next/font/google";
import "./globals.css";
import NavBar from "@/components/layout/NavBar";
import { BackgroundProvider } from "@/components/BackgroundContext";
import { ToastProvider } from "@/components/Toast";
import { ScanProvider } from "@/components/ScanProvider";
import { cn } from "@/lib/utils";

const geist = Geist({subsets:['latin'],variable:'--font-sans'});

export const viewport: Viewport = {
  themeColor: "#0a0a0a",
};

export const metadata: Metadata = {
  title: "VidLock — Your Personal Media Library",
  description: "A fully local, offline Netflix-style media browser and player. No cloud, no accounts, no internet required.",
  manifest: "/manifest.json",
  appleWebApp: {
    capable: true,
    statusBarStyle: "black-translucent",
    title: "VidLock",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className={cn("h-full", "antialiased", "font-sans", geist.variable, "dark")}>
      <body className="min-h-full relative" suppressHydrationWarning={false}>
        <Script
          id="pwa-and-cast-init"
          strategy="beforeInteractive"
          dangerouslySetInnerHTML={{
            __html: `
              if ('serviceWorker' in navigator) {
                window.addEventListener('load', function() {
                  navigator.serviceWorker.register('/sw.js').then(
                    function(registration) {
                      console.log('ServiceWorker registration successful');
                    },
                    function(err) {
                      console.log('ServiceWorker registration failed: ', err);
                    }
                  );
                });
              }

              window.__onGCastApiAvailable = function(isAvailable) {
                if (isAvailable && window.chrome && window.chrome.cast && window.chrome.cast.media) {
                  try {
                    cast.framework.CastContext.getInstance().setOptions({
                      receiverApplicationId: chrome.cast.media.DEFAULT_MEDIA_RECEIVER_APP_ID,
                      autoJoinPolicy: chrome.cast.AutoJoinPolicy.ORIGIN_SCOPED
                    });
                  } catch (e) { console.error("Cast SDK Init Error:", e); }
                }
              };
            `,
          }}
        />
        <Script 
          src="https://www.gstatic.com/cv/js/sender/v1/cast_sender.js?loadCastFramework=1"
          strategy="beforeInteractive"
        />
        {/* Aurora gradient background */}
        <div className="aurora-bg" />
        
        <ToastProvider>
        <ScanProvider>
        <BackgroundProvider>
          <NavBar />
          <main className="relative z-10 min-h-[100dvh] pb-24 lg:pb-0 flex flex-col">
            {children}
          </main>
        </BackgroundProvider>
        </ScanProvider>
        </ToastProvider>
      </body>
    </html>
  );
}
