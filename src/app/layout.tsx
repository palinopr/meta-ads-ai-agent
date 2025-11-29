import type { Metadata } from "next";
import { Inter } from "next/font/google";
import { Toaster } from "@/components/ui/sonner";
import "./globals.css";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
});

export const metadata: Metadata = {
  title: "Meta Ads AI Agent - Your Virtual Media Buyer",
  description:
    "Manage your Meta Ads campaigns with natural conversation. Connect your account and let AI handle the complexity.",
  keywords: ["meta ads", "facebook ads", "instagram ads", "ai agent", "advertising"],
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="dark">
      <body className={`${inter.variable} antialiased min-h-screen`}>
        {children}
        <Toaster position="top-right" />
      </body>
    </html>
  );
}

