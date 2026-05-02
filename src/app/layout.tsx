import type { Metadata } from "next";

import { config } from '@fortawesome/fontawesome-svg-core';
import '@fortawesome/fontawesome-svg-core/styles.css';
config.autoAddCss = false;

import { Inter } from "next/font/google";

const inter = Inter({ subsets: ["latin"] });

import "./globals.css";
import { AuthProvider } from "@/hooks/useAuth";
import { ToastProvider } from "@/components/ui/Toast";
import db from "@/lib/db";
import CinematicIntro from "@/components/ui/CinematicIntro";

export const metadata: Metadata = {
  title: "INSOPHINIA - POS System",
  description: "Point of Sale System for INSOPHINIA - Secure & Modern",
  icons: {
    icon: "/insophinia_logo.png",
    shortcut: "/insophinia_logo.png",
    apple: "/insophinia_logo.png",
  },
};

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <head>
        <link rel="manifest" href="/manifest.json" />
        <meta name="theme-color" content="#6366f1" />
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="black-translucent" />
        <meta name="apple-mobile-web-app-title" content="INSOPHINIA POS" />
        <meta name="mobile-web-app-capable" content="yes" />
        <meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=1, user-scalable=no, viewport-fit=cover" />
        <link rel="apple-touch-icon" href="/insophinia_logo.png" />
      </head>
      <body className={`antialiased ${inter.className}`}>
        <CinematicIntro />
        <AuthProvider>
          <ToastProvider>
            {children}
          </ToastProvider>
        </AuthProvider>
      </body>
    </html>
  );
}
