"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import AppShell from "./AppShell";
import NavBar from "./NavBar";
import Wordmark from "./Wordmark";
import { SHOW_GRANTS } from "@/lib/site";

// Short, focused flows with no site navigation.
const FOCUS_ROUTES = ["/login", "/register", "/onboarding"];

// Signed-in working screens: sidebar layout.
const APP_ROUTES = [
  "/dashboard",
  "/profile",
  "/cv",
  "/roadmap",
  "/mentor",
  "/interview",
  "/deadlines",
  "/bookings",
  "/applications",
  "/submit-scholarship",
  "/wins/share",
];

const matches = (pathname: string | null, routes: string[]) =>
  !!pathname && routes.some((r) => pathname === r || pathname.startsWith(`${r}/`));

function SkipLink() {
  return (
    <a
      href="#main"
      className="sr-only rounded-md bg-white px-4 py-2 text-sm font-semibold text-ink focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-50"
    >
      Skip to content
    </a>
  );
}

function SiteFooter() {
  const year = new Date().getFullYear();
  const link = "inline-flex min-h-touch items-center text-sm text-white/80 transition-colors hover:text-white";
  return (
    <footer className="mt-24 bg-navy text-white">
      <div className="mx-auto grid max-w-6xl gap-10 px-4 py-12 sm:px-6 md:grid-cols-footer">
        <div>
          <Link href="/" aria-label="ScolarNav home">
            <Wordmark onDark />
          </Link>
          <p className="mt-4 max-w-xs text-sm leading-relaxed text-white/80">
            Find scholarships and programs abroad, then prepare an application that fits you.
          </p>
        </div>
        <nav aria-label="Explore">
          <p className="text-xs font-semibold uppercase tracking-widest text-white/60">Explore</p>
          <ul className="mt-3">
            <li><Link href="/" className={link}>Discover</Link></li>
            <li><Link href="/countries" className={link}>Country guides</Link></li>
            {SHOW_GRANTS && <li><Link href="/grants" className={link}>Grants</Link></li>}
            <li><Link href="/wins" className={link}>Wins</Link></li>
            <li><Link href="/pricing" className={link}>Pricing</Link></li>
          </ul>
        </nav>
        <nav aria-label="Company">
          <p className="text-xs font-semibold uppercase tracking-widest text-white/60">Company</p>
          <ul className="mt-3">
            <li><Link href="/coaches" className={link}>Become a coach</Link></li>
            <li><Link href="/terms" className={link}>Terms</Link></li>
            <li><Link href="/privacy" className={link}>Privacy</Link></li>
          </ul>
        </nav>
      </div>
      <div className="border-t border-white/10">
        <p className="mx-auto max-w-6xl px-4 py-5 text-sm text-white/70 sm:px-6">
          © {year} ScolarNav. Always check details with the official source before you apply.
        </p>
      </div>
    </footer>
  );
}

export default function ConditionalShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();

  // The admin area owns its own layout.
  if (pathname?.startsWith("/admin")) return <>{children}</>;

  if (matches(pathname, FOCUS_ROUTES)) {
    return (
      <div className="flex min-h-screen flex-col">
        <SkipLink />
        <header className="bg-navy">
          <div className="mx-auto flex h-14 max-w-6xl items-center justify-between px-4 sm:px-6">
            <Link href="/" aria-label="ScolarNav home">
              <Wordmark onDark />
            </Link>
            <Link href="/" className="inline-flex min-h-touch items-center text-sm font-medium text-white/80 transition-colors hover:text-white">
              Back to site
            </Link>
          </div>
        </header>
        <main id="main" className="page-enter flex-1">
          {children}
        </main>
      </div>
    );
  }

  if (matches(pathname, ["/coaches/dashboard"])) {
    return (
      <>
        <SkipLink />
        <AppShell variant="coach">{children}</AppShell>
      </>
    );
  }

  if (matches(pathname, APP_ROUTES)) {
    return (
      <>
        <SkipLink />
        <AppShell>{children}</AppShell>
      </>
    );
  }

  return (
    <>
      <SkipLink />
      <NavBar />
      <main id="main" className="page-enter min-h-screen">
        {children}
      </main>
      <SiteFooter />
    </>
  );
}
