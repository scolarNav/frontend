"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { ChevronDown, LogOut, Menu, X } from "lucide-react";
import { useAuth } from "@/lib/auth-context";
import Wordmark from "./Wordmark";
import { SHOW_GRANTS } from "@/lib/site";

const PUBLIC_LINKS = [
  { href: "/", label: "Discover" },
  ...(SHOW_GRANTS ? [{ href: "/grants", label: "Grants" }] : []),
  { href: "/countries", label: "Country guides" },
  { href: "/wins", label: "Wins" },
];

/** Top bar for public pages. Signed-in working screens use AppShell instead. */
export default function NavBar() {
  const { user, logout, loading } = useAuth();
  const pathname = usePathname();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [userOpen, setUserOpen] = useState(false);
  const userRef = useRef<HTMLDivElement>(null);

  const isPro =
    user?.subscription?.plan === "pro" &&
    (user?.subscription?.status === "active" || user?.subscription?.status === "trialing");

  useEffect(() => {
    setMobileOpen(false);
    setUserOpen(false);
  }, [pathname]);

  useEffect(() => {
    function onClick(e: MouseEvent) {
      if (userRef.current && !userRef.current.contains(e.target as Node)) setUserOpen(false);
    }
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") {
        setUserOpen(false);
        setMobileOpen(false);
      }
    }
    document.addEventListener("mousedown", onClick);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onClick);
      document.removeEventListener("keydown", onKey);
    };
  }, []);

  const isCurrent = (href: string) => (href === "/" ? pathname === "/" : pathname === href || !!pathname?.startsWith(`${href}/`));
  const desktopLink = (href: string) =>
    `inline-flex min-h-touch items-center rounded-md px-3 text-sm font-medium transition-colors ${
      isCurrent(href) ? "bg-white/15 text-white" : "text-white/80 hover:bg-white/10 hover:text-white"
    }`;
  const menuItem = "flex min-h-touch w-full items-center px-4 text-left text-sm text-ink-soft transition-colors hover:bg-surface hover:text-ink";

  return (
    <header className="sticky top-0 z-30 bg-navy">
      <div className="mx-auto flex h-16 max-w-6xl items-center justify-between gap-6 px-4 sm:px-6">
        <Link href="/" className="shrink-0" aria-label="ScolarNav home">
          <Wordmark onDark />
        </Link>

        {/* Desktop navigation */}
        <nav aria-label="Main" className="hidden flex-1 items-center gap-1 lg:flex">
          {PUBLIC_LINKS.map(({ href, label }) => (
            <Link key={href} href={href} aria-current={isCurrent(href) ? "page" : undefined} className={desktopLink(href)}>
              {label}
            </Link>
          ))}
          {!loading && !user && (
            <Link href="/pricing" aria-current={isCurrent("/pricing") ? "page" : undefined} className={desktopLink("/pricing")}>
              Pricing
            </Link>
          )}
        </nav>

        {/* Desktop actions */}
        <div className="hidden items-center gap-2 lg:flex">
          {loading && <div aria-hidden="true" className="h-9 w-24 animate-soft-pulse rounded-md bg-white/15" />}

          {!loading && !user && (
            <>
              <Link href="/login" className="inline-flex min-h-touch items-center px-3 text-sm font-medium text-white/80 transition-colors hover:text-white">
                Sign in
              </Link>
              <Link href="/register" className="btn-primary">
                Get started
              </Link>
            </>
          )}

          {!loading && user && (
            <>
              <Link href="/dashboard" className="btn-primary">
                Dashboard
              </Link>
              <div className="relative" ref={userRef}>
                <button
                  type="button"
                  onClick={() => setUserOpen((o) => !o)}
                  aria-expanded={userOpen}
                  aria-haspopup="menu"
                  aria-label="Account menu"
                  className="flex min-h-touch items-center gap-2 rounded-md px-2 text-white transition-colors hover:bg-white/10"
                >
                  <span className="flex h-8 w-8 items-center justify-center rounded-full bg-brass text-sm font-semibold text-navy">
                    {user.fullName.charAt(0).toUpperCase()}
                  </span>
                  <ChevronDown size={16} aria-hidden="true" className={`transition-transform duration-150 ${userOpen ? "rotate-180" : ""}`} />
                </button>
                {userOpen && (
                  <div role="menu" className="absolute right-0 top-full z-50 mt-2 w-56 animate-fade-in rounded-xl bg-white py-1.5 shadow-raised">
                    <div className="mb-1 border-b border-rule px-4 py-2.5">
                      <p className="truncate text-sm font-semibold text-ink">{user.fullName}</p>
                      <p className="mt-0.5 text-xs text-slate">{isPro ? "Pro plan" : "Free plan"}</p>
                    </div>
                    <Link role="menuitem" href="/profile" className={menuItem}>Profile</Link>
                    <Link role="menuitem" href="/bookings" className={menuItem}>My sessions</Link>
                    {user.isCoach && <Link role="menuitem" href="/coaches/dashboard" className={menuItem}>Coach portal</Link>}
                    <Link role="menuitem" href="/pricing" className={`${menuItem} ${isPro ? "" : "font-semibold !text-forest"}`}>
                      {isPro ? "Plan and billing" : "Upgrade to Pro"}
                    </Link>
                    {user.isAdmin && <Link role="menuitem" href="/admin" className={menuItem}>Admin</Link>}
                    <div className="mt-1 border-t border-rule pt-1">
                      <button type="button" role="menuitem" onClick={logout} className={`${menuItem} gap-2 !text-danger`}>
                        <LogOut size={16} aria-hidden="true" />
                        Sign out
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </>
          )}
        </div>

        {/* Mobile actions */}
        <div className="flex items-center gap-2 lg:hidden">
          {!loading && !user && (
            <Link href="/register" className="btn-primary btn-sm">
              Get started
            </Link>
          )}
          <button
            type="button"
            onClick={() => setMobileOpen((o) => !o)}
            aria-label={mobileOpen ? "Close menu" : "Open menu"}
            aria-expanded={mobileOpen}
            className="flex h-11 w-11 items-center justify-center rounded-md text-white transition-colors hover:bg-white/10"
          >
            {mobileOpen ? <X size={22} aria-hidden="true" /> : <Menu size={22} aria-hidden="true" />}
          </button>
        </div>
      </div>

      {/* Mobile menu */}
      {mobileOpen && (
        <div className="animate-fade-in border-t border-white/10 bg-white shadow-raised lg:hidden">
          <nav aria-label="Mobile" className="mx-auto max-w-6xl py-2">
            {PUBLIC_LINKS.map(({ href, label }) => (
              <Link
                key={href}
                href={href}
                aria-current={isCurrent(href) ? "page" : undefined}
                className={`${menuItem} px-5 ${isCurrent(href) ? "font-semibold !text-forest" : ""}`}
              >
                {label}
              </Link>
            ))}
            {!loading && !user && (
              <>
                <Link href="/pricing" className={`${menuItem} px-5`}>Pricing</Link>
                <Link href="/login" className={`${menuItem} px-5`}>Sign in</Link>
              </>
            )}
            {!loading && user && (
              <div className="mt-1 border-t border-rule pt-1">
                <Link href="/dashboard" className={`${menuItem} px-5 font-semibold !text-forest`}>Dashboard</Link>
                <Link href="/profile" className={`${menuItem} px-5`}>Profile</Link>
                <Link href="/bookings" className={`${menuItem} px-5`}>My sessions</Link>
                {user.isCoach && <Link href="/coaches/dashboard" className={`${menuItem} px-5`}>Coach portal</Link>}
                {user.isAdmin && <Link href="/admin" className={`${menuItem} px-5`}>Admin</Link>}
                <button type="button" onClick={() => { logout(); setMobileOpen(false); }} className={`${menuItem} gap-2 px-5 !text-danger`}>
                  <LogOut size={16} aria-hidden="true" />
                  Sign out
                </button>
              </div>
            )}
          </nav>
        </div>
      )}
    </header>
  );
}
