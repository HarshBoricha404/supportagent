import type { Metadata } from "next";
import { Geist } from "next/font/google";
import Link from "next/link";
import "./globals.css";
import { StoreProvider } from "@/components/store";
import { Toaster } from "@/components/ui/sonner";

const geist = Geist({ subsets: ["latin"], variable: "--font-sans" });

export const metadata: Metadata = {
  title: "SupportPilot — AI ticket triage",
  description: "Triage, reply and route support tickets with Claude",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={geist.variable}>
      <body className="min-h-screen bg-muted/30 font-sans antialiased">
        <StoreProvider>
          <header className="border-b bg-background">
            <div className="mx-auto flex h-14 max-w-6xl items-center gap-6 px-4">
              <Link href="/" className="font-semibold">SupportPilot</Link>
              <nav className="flex gap-4 text-sm text-muted-foreground">
                <Link href="/setup" className="hover:text-foreground">Setup</Link>
                <Link href="/inbox" className="hover:text-foreground">Inbox</Link>
                <Link href="/dashboard" className="hover:text-foreground">ROI dashboard</Link>
              </nav>
            </div>
          </header>
          <main className="mx-auto max-w-6xl p-4">{children}</main>
          <Toaster />
        </StoreProvider>
      </body>
    </html>
  );
}
