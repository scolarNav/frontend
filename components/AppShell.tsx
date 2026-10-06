"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  CalendarDays,
  Compass,
  CreditCard,
  FileText,
  GraduationCap,
  Globe,
  LayoutDashboard,
  LogOut,
  Map as MapIcon,
  Menu,
  MessageSquare,
  Mic,
  PlusCircle,
  ShieldCheck,
  UserRound,
  Video,
  X,
  type LucideIcon,
} from "lucide-react";
import { useAuth } from "@/lib/auth-context";
import Wordmark from "./Wordmark";

interface NavItem {
  href: string;
  label: string;
  Icon: LucideIcon;
  pro?: boolean;
}

/** Signed-in navigation, grouped by what the person is trying to do. */
function buildNav(isCoach: boolean, isAdmin: boolean): { title: string; items: NavItem[] }[] {
  return [
    { title: "Overview", items: [{ href: "/dashboard", label: "Dashboard", Icon: LayoutDashboard }] },
    {
      title: "Find",
      items: [
        { href: "/", label: "Discover", Icon: Compass },
        { href: "/countries", label: "Country guides", Icon: Globe },
        { href: "/deadlines", label: "Deadlines", Icon: CalendarDays },
      ],
    },
    {
      title: "Prepare",
      items: [
        { href: "/roadmap", label: "My roadmap", Icon: MapIcon, pro: true },
        { href: "/interview", label: "Mock interview", Icon: Mic, pro: true },
        { href: "/mentor", label: "Mentor", Icon: MessageSquare },
        { href: "/cv", label: "My CV", Icon: FileText },
      ],
    },
    {
      title: "Support",
      items: [
        { href: "/bookings", label: "My sessions", Icon: Video },
        ...(isCoach ? [{ href: "/coaches/dashboard", label: "Coach portal", Icon: GraduationCap }] : []),
        { href: "/submit-scholarship", label: "Submit a scholarship", Icon: PlusCircle },
      ],
    },
    {
      title: "Account",
      items: [
        { href: "/profile", label: "Profile", Icon: UserRound },
        { href: "/pricing", label: "Plan and billing", Icon: CreditCard },
        ...(isAdmin ? [{ href: "/admin", label: "Admin", Icon: ShieldCheck }] : []),
      ],
    },
  ];
}

function isActive(pathname: string | null, href: string) {
  if (!pathname) return false;
  if (href === "/") return pathname === "/";
  return pathname === href || pathname.startsWith(`${href}/`);
}

function NavList({ onNavigate }: { onNavigate?: () => void }) {
  const { user } = useAuth();
  const pathname = usePathname();
  const isPro =
    user?.subscription?.plan === "pro" &&
    (user?.subscription?.status === "active" || user?.subscription?.status === "trialing");
  const groups = buildNav(!!user?.isCoach, !!user?.isAdmin);

  return (
    <nav aria-label="Main" className="space-y-6">
      {groups.map((g) => (
        <div key={g.title}>
          <p className="px-3 text-xs font-semibold uppercase tracking-widest text-white/60">{g.title}</p>
          <ul className="mt-2 space-y-0.5">
            {g.items.map(({ href, label, Icon, pro }) => {
              const active = isActive(pathname, href);
              return (
                <li key={href}>
                  <Link
                    href={href}
                    onClick={onNavigate}
                    aria-current={active ? "page" : undefined}
                    className={`flex min-h-touch items-center gap-3 rounded-md px-3 text-sm font-medium transition-colors ${
                      active ? "bg-white/15 text-white" : "text-white/80 hover:bg-white/10 hover:text-white"
                    }`}
                  >
                    <Icon size={18} aria-hidden="true" className="shrink-0" />
                    <span className="flex-1">{label}</span>
                    {pro && !isPro && (
                      <span className="rounded-full bg-brass px-2 py-0.5 text-xs font-semibold text-navy">Pro</span>
                    )}
                  </Link>
                </li>
              );
            })}
          </ul>
        </div>
      ))}
    </nav>
  );
}

function UserCard({ onNavigate }: { onNavigate?: () => void }) {
  const { user, loading, logout } = useAuth();
  const isPro =
    user?.subscription?.plan === "pro" &&
    (user?.subscription?.status === "active" || user?.subscription?.status === "trialing");

  if (loading || !user) {
    return (
      <div aria-hidden="true" className="flex items-center gap-3 px-3 py-3">
        <div className="h-9 w-9 animate-soft-pulse rounded-full bg-white/15" />
        <div className="flex-1 space-y-2">
          <div className="h-3 w-24 animate-soft-pulse rounded bg-white/15" />
          <div className="h-3 w-14 animate-soft-pulse rounded bg-white/15" />
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-1">
      <Link
        href="/profile"
        onClick={onNavigate}
        className="flex items-center gap-3 rounded-md px-3 py-2 transition-colors hover:bg-white/10"
      >
        <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-brass text-sm font-semibold text-navy">
          {user.fullName.charAt(0).toUpperCase()}
        </span>
        <span className="min-w-0">
          <span className="block truncate text-sm font-medium text-white">{user.fullName}</span>
          <span className="block text-xs text-white/70">{isPro ? "Pro plan" : "Free plan"}</span>
        </span>
      </Link>
      <button
        type="button"
        onClick={() => {
          onNavigate?.();
          logout();
        }}
        className="flex min-h-touch w-full items-center gap-3 rounded-md px-3 text-sm font-medium text-white/80 transition-colors hover:bg-white/10 hover:text-white"
      >
        <LogOut size={18} aria-hidden="true" />
        Sign out
      </button>
    </div>
  );
}

/** Layout for signed-in screens: a fixed sidebar on large screens, a top bar with a drawer on small ones. */
export default function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);

  useEffect(() => setOpen(false), [pathname]);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false);
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [open]);

  return (
    <div className="min-h-screen lg:pl-64">
      {/* Desktop sidebar */}
      <aside className="fixed inset-y-0 left-0 z-30 hidden w-64 flex-col bg-navy lg:flex">
        <div className="px-5 py-5">
          <Link href="/dashboard" aria-label="ScolarNav dashboard">
            <Wordmark onDark />
          </Link>
        </div>
        <div className="flex-1 overflow-y-auto px-3 pb-4">
          <NavList />
        </div>
        <div className="border-t border-white/10 p-3">
          <UserCard />
        </div>
      </aside>

      {/* Mobile top bar */}
      <header className="sticky top-0 z-30 flex h-14 items-center justify-between bg-navy px-4 lg:hidden">
        <Link href="/dashboard" aria-label="ScolarNav dashboard">
          <Wordmark onDark />
        </Link>
        <button
          type="button"
          onClick={() => setOpen(true)}
          aria-label="Open menu"
          aria-expanded={open}
          className="flex h-11 w-11 items-center justify-center rounded-md text-white transition-colors hover:bg-white/10"
        >
          <Menu size={22} aria-hidden="true" />
        </button>
      </header>

      {/* Mobile drawer */}
      {open && (
        <div className="fixed inset-0 z-50 lg:hidden" role="dialog" aria-modal="true" aria-label="Menu">
          <button
            type="button"
            aria-label="Close menu"
            onClick={() => setOpen(false)}
            className="absolute inset-0 animate-fade-in bg-ink/50"
          />
          <div className="absolute inset-y-0 left-0 flex w-72 max-w-full animate-fade-in flex-col bg-navy shadow-overlay">
            <div className="flex items-center justify-between px-5 py-4">
              <Wordmark onDark />
              <button
                type="button"
                onClick={() => setOpen(false)}
                aria-label="Close menu"
                className="flex h-11 w-11 items-center justify-center rounded-md text-white transition-colors hover:bg-white/10"
              >
                <X size={22} aria-hidden="true" />
              </button>
            </div>
            <div className="flex-1 overflow-y-auto px-3 pb-4">
              <NavList onNavigate={() => setOpen(false)} />
            </div>
            <div className="border-t border-white/10 p-3">
              <UserCard onNavigate={() => setOpen(false)} />
            </div>
          </div>
        </div>
      )}

      <main id="main" className="page-enter min-w-0">
        {children}
      </main>
    </div>
  );
}
