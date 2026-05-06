import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { Sidebar, MobileNav } from "@/components/layout/sidebar";
import { Header } from "@/components/layout/header";

const inter = Inter({ subsets: ["latin"], variable: "--font-sans" });

export const metadata: Metadata = {
  title: "Perseus Equipment Analytics",
  description:
    "Analytics dashboard for Perseus Equipment dealership operations: sales, customers, parts, units, service, and payments.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className={`${inter.variable} font-sans`}>
        <div className="flex min-h-screen">
          <Sidebar />
          <div className="flex min-w-0 flex-1 flex-col">
            <Header />
            <MobileNav />
            <main className="flex-1 overflow-x-hidden bg-muted/20 p-4 lg:p-6">{children}</main>
          </div>
        </div>
      </body>
    </html>
  );
}
