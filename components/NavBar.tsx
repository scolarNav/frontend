"use client";

import { useState, useEffect, useRef } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useAuth } from "@/lib/auth-context";
import Image from "next/image";

const TOOLS = [
  { href: "/mentor", label: "Mentor", pro: false },
  { href: "/roadmap", label: "My Roadmap", pro: true },
  { href: "/interview", label: "Mock Interview", pro: true },
  { href: "/deadlines", label: "Deadlines", pro: false },
  { href: "/cv", label: "My CV", pro: false },
];

export default function NavBar() {
  const { user, logout, loading } = useAuth();
  const pathname = usePathname();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [toolsOpen, setToolsOpen] = useState(false);
  const [userOpen, setUserOpen] = useState(false);

  const toolsRef = useRef<HTMLDivElement>(null);
  const userRef = useRef<HTMLDivElement>(null);
  const mobileRef = useRef<HTMLDivElement>(null);

  const isPro = user?.subscription?.plan === "pro" &&
    (user?.subscription?.status === "active" || user?.subscription?.status === "trialing");

  useEffect(() => {
    setMobileOpen(false);
    setToolsOpen(false);
    setUserOpen(false);
  }, [pathname]);

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (toolsRef.current && !toolsRef.current.contains(e.target as Node)) setToolsOpen(false);
      if (userRef.current && !userRef.current.contains(e.target as Node)) setUserOpen(false);
      if (mobileRef.current && !mobileRef.current.contains(e.target as Node)) setMobileOpen(false);
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, []);

  const navLink = (href: string, label: string) => (
    <Link
      key={href}
      href={href}
      className={`transition-colors text-sm ${pathname === href ? "text-white" : "text-white/60 hover:text-white"}`}
    >
      {label}
    </Link>
  );

  return (
    <header className="sticky top-0 z-30" style={{ backgroundColor: "#6d8ec5" }}>
      <div className="max-w-6xl mx-auto px-4 sm:px-6 py-4 flex items-center justify-between gap-6">
        {/* Logo */}
        <Link href="/" className="shrink-0">
          <Image src="/logo/logo.png" alt="Scholarship Portal" width={120} height={32} />
        </Link>

        {/* Desktop nav */}
        <nav className="hidden lg:flex items-center gap-5 text-sm flex-1">
          {navLink("/", "Discover")}
          {navLink("/grants", "Grants")}
          {navLink("/countries", "Countries")}
          {navLink("/wins", "Wins")}

          {!loading && user && (
            <>
              {/* Tools dropdown */}
              <div className="relative" ref={toolsRef}>
                <button
                  onClick={() => setToolsOpen((o) => !o)}
                  className="text-white/60 hover:text-white transition-colors flex items-center gap-1"
                >
                  Tools
                  <svg width="10" height="6" viewBox="0 0 10 6" fill="none" className={`transition-transform ${toolsOpen ? "rotate-180" : ""}`}>
                    <path d="M1 1l4 4 4-4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                </button>

                {toolsOpen && (
                  <div className="absolute top-full left-0 mt-2 w-52 bg-white border border-rule rounded-xl py-1.5 z-50">
                    {TOOLS.map(({ href, label, pro }) => (
                      <Link
                        key={href}
                        href={href}
                        className="flex items-center justify-between px-4 py-2.5 text-sm text-ink-soft hover:text-ink hover:bg-surface transition-colors"
                      >
                        <span>{label}</span>
                        {pro && !isPro && (
                          <span className="font-mono text-xs text-slate border border-rule px-1.5 py-0.5">
                            Pro
                          </span>
                        )}
                      </Link>
                    ))}
                  </div>
                )}
              </div>

              {navLink("/dashboard", "Dashboard")}

              {user.isAdmin && (
                <Link href="/admin" className="text-brass hover:text-brass-light transition-colors font-mono text-xs uppercase tracking-wide">
                  Admin
                </Link>
              )}
            </>
          )}

          {!loading && !user && (
            navLink("/pricing", "Pricing")
          )}
        </nav>

        {/* Desktop right actions */}
        <div className="hidden lg:flex items-center gap-3">
          {!loading && !user && (
            <>
              <Link href="/login" className="text-white/60 hover:text-white text-sm transition-colors">Sign in</Link>
              <Link href="/register" className="stamp text-white border-white/50 hover:bg-white hover:text-navy transition-colors">
                Get started
              </Link>
            </>
          )}

          {!loading && user && (
            <div className="relative" ref={userRef}>
              <button
                onClick={() => setUserOpen((o) => !o)}
                className="w-8 h-8 rounded-full bg-forest text-white text-xs font-medium flex items-center justify-center hover:bg-forest-light transition-colors"
                aria-label="Account menu"
              >
                {user.fullName.charAt(0).toUpperCase()}
              </button>

              {userOpen && (
                <div className="absolute top-full right-0 mt-2 w-48 bg-white border border-rule rounded-xl py-1.5 z-50">
                  <div className="px-4 py-2 border-b border-rule mb-1">
                    <p className="text-xs font-medium text-ink truncate">{user.fullName}</p>
                    <p className="text-xs text-slate truncate">{isPro ? "Pro" : "Free plan"}</p>
                  </div>
                  <Link href="/profile" className="block px-4 py-2.5 text-sm text-ink-soft hover:text-ink hover:bg-surface transition-colors">
                    Profile
                  </Link>
                  <Link href="/bookings" className="block px-4 py-2.5 text-sm text-ink-soft hover:text-ink hover:bg-surface transition-colors">
                    My Sessions
                  </Link>
                  {!isPro && (
                    <Link href="/pricing" className="block px-4 py-2.5 text-sm text-forest hover:bg-surface transition-colors font-medium">
                      Upgrade to Pro
                    </Link>
                  )}
                  {isPro && (
                    <Link href="/pricing" className="block px-4 py-2.5 text-sm text-ink-soft hover:text-ink hover:bg-surface transition-colors">
                      Billing
                    </Link>
                  )}
                  <div className="border-t border-rule mt-1 pt-1">
                    <button
                      onClick={logout}
                      className="block w-full text-left px-4 py-2.5 text-sm text-alert hover:bg-red-50 transition-colors"
                    >
                      Sign out
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Mobile hamburger */}
        <div className="flex lg:hidden items-center gap-3" ref={mobileRef}>
          {!loading && !user && (
            <Link href="/register" className="stamp text-white border-white/50 text-xs">
              Get started
            </Link>
          )}
          {!loading && user && !isPro && (
            <Link href="/pricing" className="stamp text-forest border-forest text-xs">
              Upgrade
            </Link>
          )}
          <button
            onClick={() => setMobileOpen((o) => !o)}
            aria-label="Toggle menu"
            className="flex flex-col gap-1.5 p-1"
          >
            <span className={`block h-0.5 w-5 bg-white transition-transform origin-center ${mobileOpen ? "rotate-45 translate-y-2" : ""}`} />
            <span className={`block h-0.5 w-5 bg-white transition-opacity ${mobileOpen ? "opacity-0" : ""}`} />
            <span className={`block h-0.5 w-5 bg-white transition-transform origin-center ${mobileOpen ? "-rotate-45 -translate-y-2" : ""}`} />
          </button>

          {mobileOpen && (
            <div className="absolute top-full left-0 right-0 bg-white border-b border-rule z-40">
              <div className="py-2">
                <Link href="/" className="block px-5 py-3 text-sm text-ink-soft hover:text-ink hover:bg-surface">Discover</Link>
                <Link href="/grants" className="block px-5 py-3 text-sm text-ink-soft hover:text-ink hover:bg-surface">Grants</Link>
                <Link href="/countries" className="block px-5 py-3 text-sm text-ink-soft hover:text-ink hover:bg-surface">Country Guides</Link>
                <Link href="/wins" className="block px-5 py-3 text-sm text-ink-soft hover:text-ink hover:bg-surface">Wins</Link>

                {!loading && user && (
                  <>
                    <div className="border-t border-rule mt-1 pt-1">
                      <p className="px-5 py-1.5 text-xs font-mono text-slate uppercase tracking-widest">Tools</p>
                      {TOOLS.map(({ href, label, pro }) => (
                        <Link key={href} href={href} className="flex items-center justify-between px-5 py-3 text-sm text-ink-soft hover:text-ink hover:bg-surface">
                          <span>{label}</span>
                          {pro && !isPro && (
                            <span className="font-mono text-xs text-slate">Pro</span>
                          )}
                        </Link>
                      ))}
                    </div>
                    <div className="border-t border-rule mt-1 pt-1">
                      <Link href="/dashboard" className="block px-5 py-3 text-sm text-ink-soft hover:text-ink hover:bg-surface">Dashboard</Link>
                      <Link href="/profile" className="block px-5 py-3 text-sm text-ink-soft hover:text-ink hover:bg-surface">Profile</Link>
                      <Link href="/bookings" className="block px-5 py-3 text-sm text-ink-soft hover:text-ink hover:bg-surface">My Sessions</Link>
                      {user.isAdmin && (
                        <Link href="/admin" className="block px-5 py-3 text-sm text-slate font-mono uppercase tracking-wide">Admin</Link>
                      )}
                    </div>
                    <div className="border-t border-rule mt-1 pt-1">
                      <button
                        onClick={() => { logout(); setMobileOpen(false); }}
                        className="block w-full text-left px-5 py-3 text-sm text-alert hover:bg-red-50"
                      >
                        Sign out
                      </button>
                    </div>
                  </>
                )}

                {!loading && !user && (
                  <>
                    <Link href="/pricing" className="block px-5 py-3 text-sm text-ink-soft hover:text-ink hover:bg-surface">Pricing</Link>
                    <Link href="/login" className="block px-5 py-3 text-sm text-ink-soft hover:text-ink hover:bg-surface">Sign in</Link>
                  </>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}
