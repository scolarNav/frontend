"use client";

import { usePathname } from "next/navigation";
import NavBar from "./NavBar";
import Link from "next/link";
import Wordmark from "./Wordmark";

export default function ConditionalShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const isAdmin = pathname?.startsWith("/admin");

  if (isAdmin) {
    return <>{children}</>;
  }

  return (
    <>
      <NavBar />
      <main className="min-h-screen">{children}</main>
      <footer className="border-t border-rule mt-24">
        <div className="max-w-6xl mx-auto px-6 py-8 flex flex-col sm:flex-row justify-between gap-4 text-sm text-slate">
          <Link href="/" aria-label="ScolarNav home">
            <Wordmark />
          </Link>
          <span>Scholarships, matched to you.</span>
          <div className="flex items-center gap-4 font-mono text-xs">
            <Link href="/terms" className="hover:text-ink transition-colors">Terms</Link>
            <Link href="/privacy" className="hover:text-ink transition-colors">Privacy</Link>
            <span>Built for the journey abroad</span>
          </div>
        </div>
      </footer>
    </>
  );
}
