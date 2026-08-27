import type { Metadata } from "next";
import { ClerkProvider, SignedIn, UserButton } from "@clerk/nextjs";
import Link from "next/link";
import "./globals.css";

export const metadata: Metadata = {
  title: "Hauspire Quotation Studio",
  description: "Auto-build and manage interior-design quotations.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <ClerkProvider>
      <html lang="en">
        <body>
          <header className="no-print flex items-center gap-5 bg-brand px-5 py-3 text-white">
            <Link href="/" className="text-[17px] font-bold">
              Hauspire · Quotation Studio
            </Link>
            <nav className="flex gap-4 text-sm opacity-90">
              <Link href="/first-quote">First Quote</Link>
              <Link href="/builder">Full Builder</Link>
            </nav>
            <div className="ml-auto">
              <SignedIn>
                <UserButton afterSignOutUrl="/sign-in" />
              </SignedIn>
            </div>
          </header>
          <main>{children}</main>
        </body>
      </html>
    </ClerkProvider>
  );
}
