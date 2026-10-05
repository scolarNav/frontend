"use client";

import { usePathname } from "next/navigation";
import NavBar from "./NavBar";
import Image from "next/image";

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
          <Image
            src="/logo/logo.png"
            alt="ScolarNav"
            width={120}
            height={32}
            style={{ width: "auto", height: "32px" }}
          />
          <span>case files for the applications that matter.</span>
          <div className="flex items-center gap-4 font-mono text-xs">
            <a href="/terms" className="hover:text-ink transition-colors">Terms</a>
            <a href="/privacy" className="hover:text-ink transition-colors">Privacy</a>
            <span>BUILT FOR THE JOURNEY ABROAD</span>
          </div>
        </div>
      </footer>
    </>
  );
}
