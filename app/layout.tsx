import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { PwaInstaller } from "@/components/pwa-installer";
import { SiteFooter, SiteHeader } from "@/components/site-header";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  applicationName: "ShopSpace",
  title: {
    default: "ShopSpace — Show your stuff to the world",
    template: "%s · ShopSpace",
  },
  description:
    "An online marketplace where people advertise shops and products. Post a listing with a photo, price and contact email — no account needed.",
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: "ShopSpace",
  },
  icons: {
    icon: [
      { url: "/icon.svg", type: "image/svg+xml" },
      { url: "/icons/icon-192.png", sizes: "192x192", type: "image/png" },
    ],
    apple: [{ url: "/icons/apple-touch-icon.png", sizes: "180x180" }],
  },
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="flex min-h-full flex-col bg-slate-50">
        <SiteHeader />
        <div className="flex-1">{children}</div>
        <SiteFooter />
        <PwaInstaller />
      </body>
    </html>
  );
}
