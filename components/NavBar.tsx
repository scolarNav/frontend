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
  const [scrolled, setScrolled] = useState(false);

  const toolsRef = useRef<HTMLDivElement>(null);
  const userRef = useRef<HTMLDivElement>(null);
  const mobileRef = useRef<HTMLDivElement>(null);

  const isPro =
    user?.subscription?.plan === "pro" &&
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

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 8);
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  const linkClass = (href: string) =>
    `text-sm transition-colors px-3 py-1.5 rounded-[6px] ${
      pathname === href
        ? "bg-white/[0.09] text-white"
        : "text-white/50 hover:text-white/90"
    }`;

  return (
    <header
      className="sticky top-0 z-30 transition-shadow duration-200"
      style={{
        backgroundColor: "#1a2d45",
        boxShadow: scrolled
          ? "0 1px 0 rgba(255,255,255,0.05), 0 4px 20px rgba(0,0,0,0.3)"
          : "none",
      }}
    >
      <div className="max-w-6xl mx-auto px-4 sm:px-6 py-3.5 flex items-center justify-between gap-6">

        {/* Logo */}
        <Link href="/" className="shrink-0">
          <Image src="/logo/logo.png" alt="ScolarNav" width={112} height={30} />
        </Link>

        {/* Desktop nav */}
        <nav className="hidden lg:flex items-center gap-0.5 text-sm flex-1">
          <Link href="/" className={linkClass("/")}>Discover</Link>
          <Link href="/grants" className={linkClass("/grants")}>Grants</Link>
          <Link href="/countries" className={linkClass("/countries")}>Countries</Link>
          <Link href="/wins" className={linkClass("/wins")}>Wins</Link>

          {!loading && user && (
            <>
              {/* Tools dropdown */}
              <div className="relative" ref={toolsRef}>
                <button
                  onClick={() => setToolsOpen((o) => !o)}
                  className={`text-sm transition-colors px-3 py-1.5 rounded-[6px] flex items-center gap-1.5 ${
                    toolsOpen ? "bg-white/[0.09] text-white" : "text-white/50 hover:text-white/90"
                  }`}
                >
                  Tools
                  <svg
                    width="9" height="5" viewBox="0 0 9 5" fill="none"
                    className={`transition-transform duration-150 ${toolsOpen ? "rotate-180" : ""}`}
                  >
                    <path d="M0.5 0.5L4.5 4.5L8.5 0.5" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                </button>

                {toolsOpen && (
                  <div className="absolute top-full left-0 mt-2 w-52 bg-white border border-rule rounded-xl py-1.5 z-50 shadow-lg shadow-black/10">
                    {TOOLS.map(({ href, label, pro }) => (
                      <Link
                        key={href}
                        href={href}
                        className="flex items-center justify-between px-4 py-2.5 text-sm text-ink-soft hover:text-ink hover:bg-surface transition-colors"
                      >
                        <span>{label}</span>
                        {pro && !isPro && (
                          <span className="font-mono text-[0.58rem] tracking-wider px-1.5 py-0.5 rounded-[3px] border"
                            style={{ color: "#d3622c", borderColor: "rgba(211,98,44,0.3)" }}>
                            PRO
                          </span>
                        )}
                      </Link>
                    ))}
                  </div>
                )}
              </div>

              <Link href="/dashboard" className={linkClass("/dashboard")}>Dashboard</Link>

              {user.isAdmin && (
                <Link
                  href="/admin"
                  className="ml-1 font-mono text-[0.6rem] uppercase tracking-widest transition-colors px-2 py-1"
                  style={{ color: "rgba(240,200,69,0.6)" }}
                  onMouseEnter={e => (e.currentTarget.style.color = "#f0c845")}
                  onMouseLeave={e => (e.currentTarget.style.color = "rgba(240,200,69,0.6)")}
                >
                  Admin
                </Link>
              )}
            </>
          )}

          {!loading && !user && (
            <Link href="/pricing" className={linkClass("/pricing")}>Pricing</Link>
          )}
        </nav>

        {/* Desktop right actions */}
        <div className="hidden lg:flex items-center gap-3">
          {!loading && !user && (
            <>
              <Link href="/login" className="text-sm text-white/50 hover:text-white/90 transition-colors">
                Sign in
              </Link>
              <Link
                href="/register"
                className="text-sm font-medium text-white px-4 py-2 rounded-md transition-colors"
                style={{ backgroundColor: "#d3622c" }}
                onMouseEnter={e => (e.currentTarget.style.backgroundColor = "#c05520")}
                onMouseLeave={e => (e.currentTarget.style.backgroundColor = "#d3622c")}
              >
                Get started
              </Link>
            </>
          )}

          {!loading && user && (
            <div className="relative" ref={userRef}>
              <button
                onClick={() => setUserOpen((o) => !o)}
                className="w-8 h-8 rounded-[6px] text-xs font-semibold flex items-center justify-center hover:opacity-85 transition-opacity"
                style={{ backgroundColor: "#f0c845", color: "#1a2d45" }}
                aria-label="Account menu"
              >
                {user.fullName.charAt(0).toUpperCase()}
              </button>

              {userOpen && (
                <div className="absolute top-full right-0 mt-2 w-52 bg-white border border-rule rounded-xl py-1.5 z-50 shadow-lg shadow-black/10">
                  <div className="px-4 py-2.5 border-b border-rule mb-1">
                    <p className="text-xs font-semibold text-ink truncate">{user.fullName}</p>
                    <p className="text-xs text-slate truncate mt-0.5">
                      {isPro
                        ? <span style={{ color: "#d3622c" }} className="font-medium">Pro</span>
                        : "Free plan"
                      }
                    </p>
                  </div>
                  <Link href="/profile" className="block px-4 py-2.5 text-sm text-ink-soft hover:text-ink hover:bg-surface transition-colors">
                    Profile
                  </Link>
                  <Link href="/bookings" className="block px-4 py-2.5 text-sm text-ink-soft hover:text-ink hover:bg-surface transition-colors">
                    My Sessions
                  </Link>
                  {!isPro && (
                    <Link
                      href="/pricing"
                      className="block px-4 py-2.5 text-sm font-medium transition-colors hover:bg-[#fff7f4]"
                      style={{ color: "#d3622c" }}
                    >
                      Upgrade to Pro →
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

        {/* Mobile */}
        <div className="flex lg:hidden items-center gap-3" ref={mobileRef}>
          {!loading && !user && (
            <Link
              href="/register"
              className="text-xs font-medium text-white px-3.5 py-1.5 rounded-md transition-colors"
              style={{ backgroundColor: "#d3622c" }}
            >
              Get started
            </Link>
          )}
          {!loading && user && !isPro && (
            <Link
              href="/pricing"
              className="font-mono text-[0.58rem] tracking-wider px-2.5 py-1 rounded-[4px] uppercase transition-colors"
              style={{ color: "#d3622c", border: "1px solid rgba(211,98,44,0.35)" }}
            >
              Upgrade
            </Link>
          )}
          <button
            onClick={() => setMobileOpen((o) => !o)}
            aria-label="Toggle menu"
            className="flex flex-col gap-1.5 p-1.5 rounded-md hover:bg-white/10 transition-colors"
          >
            <span className={`block h-px w-5 bg-white transition-transform duration-200 origin-center ${mobileOpen ? "rotate-45 translate-y-[7px]" : ""}`} />
            <span className={`block h-px w-5 bg-white transition-opacity duration-200 ${mobileOpen ? "opacity-0" : ""}`} />
            <span className={`block h-px w-5 bg-white transition-transform duration-200 origin-center ${mobileOpen ? "-rotate-45 -translate-y-[7px]" : ""}`} />
          </button>

          {mobileOpen && (
            <div className="absolute top-full left-0 right-0 bg-white border-b border-rule z-40 shadow-md">
              <div className="py-2">
                {[
                  { href: "/", label: "Discover" },
                  { href: "/grants", label: "Grants" },
                  { href: "/countries", label: "Country Guides" },
                  { href: "/wins", label: "Wins" },
                ].map(({ href, label }) => (
                  <Link
                    key={href}
                    href={href}
                    className={`block px-5 py-3 text-sm transition-colors ${
                      pathname === href
                        ? "font-medium"
                        : "text-ink-soft hover:text-ink hover:bg-surface"
                    }`}
                    style={pathname === href ? { color: "#d3622c" } : undefined}
                  >
                    {label}
                  </Link>
                ))}

                {!loading && user && (
                  <>
                    <div className="border-t border-rule mt-1 pt-1">
                      <p className="px-5 py-2 text-[0.6rem] font-mono text-slate/50 uppercase tracking-widest">
                        Tools
                      </p>
                      {TOOLS.map(({ href, label, pro }) => (
                        <Link
                          key={href}
                          href={href}
                          className="flex items-center justify-between px-5 py-3 text-sm text-ink-soft hover:text-ink hover:bg-surface transition-colors"
                        >
                          <span>{label}</span>
                          {pro && !isPro && (
                            <span
                              className="font-mono text-[0.58rem] tracking-wider px-1.5 py-0.5 rounded-[3px] border"
                              style={{ color: "#d3622c", borderColor: "rgba(211,98,44,0.3)" }}
                            >
                              PRO
                            </span>
                          )}
                        </Link>
                      ))}
                    </div>
                    <div className="border-t border-rule mt-1 pt-1">
                      <Link href="/dashboard" className="block px-5 py-3 text-sm text-ink-soft hover:text-ink hover:bg-surface transition-colors">Dashboard</Link>
                      <Link href="/profile" className="block px-5 py-3 text-sm text-ink-soft hover:text-ink hover:bg-surface transition-colors">Profile</Link>
                      <Link href="/bookings" className="block px-5 py-3 text-sm text-ink-soft hover:text-ink hover:bg-surface transition-colors">My Sessions</Link>
                      {user.isAdmin && (
                        <Link href="/admin" className="block px-5 py-3 text-xs font-mono uppercase tracking-widest" style={{ color: "#f0c845" }}>
                          Admin
                        </Link>
                      )}
                    </div>
                    <div className="border-t border-rule mt-1 pt-1">
                      <button
                        onClick={() => { logout(); setMobileOpen(false); }}
                        className="block w-full text-left px-5 py-3 text-sm text-alert hover:bg-red-50 transition-colors"
                      >
                        Sign out
                      </button>
                    </div>
                  </>
                )}

                {!loading && !user && (
                  <>
                    <Link href="/pricing" className="block px-5 py-3 text-sm text-ink-soft hover:text-ink hover:bg-surface transition-colors">Pricing</Link>
                    <Link href="/login" className="block px-5 py-3 text-sm text-ink-soft hover:text-ink hover:bg-surface transition-colors">Sign in</Link>
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
