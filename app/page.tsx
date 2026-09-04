"use client";

import { useEffect, useState, useCallback } from "react";
import { api } from "@/lib/api";
import { Opportunity, RecommendationMatch } from "@/lib/types";
import OpportunityCard, { CardVariant } from "@/components/OpportunityCard";
import UpgradePrompt from "@/components/UpgradePrompt";
import { useAuth } from "@/lib/auth-context";
import Link from "next/link";

const TYPES = [
  { value: "", label: "All types" },
  { value: "scholarship", label: "Scholarships" },
  { value: "fellowship", label: "Fellowships" },
  { value: "study_program", label: "Study Programs" },
  { value: "immigration_pathway", label: "Immigration Pathways" },
];

const DEGREE_LEVELS = [
  { value: "", label: "Any level" },
  { value: "undergraduate", label: "Undergraduate" },
  { value: "masters", label: "Master's" },
  { value: "phd", label: "PhD" },
  { value: "postdoc", label: "Postdoc" },
  { value: "professional", label: "Professional" },
  { value: "none", label: "No degree req." },
];

// Countries as stored by the scraper — these are the values that appear in the DB
const SCHOLARSHIP_COUNTRIES = [
  { value: "United Kingdom", label: "United Kingdom" },
  { value: "United States", label: "United States" },
  { value: "Germany", label: "Germany" },
  { value: "Canada", label: "Canada" },
  { value: "Australia", label: "Australia" },
  { value: "Netherlands", label: "Netherlands" },
  { value: "Sweden", label: "Sweden" },
  { value: "France", label: "France" },
  { value: "Japan", label: "Japan" },
  { value: "South Korea", label: "South Korea" },
  { value: "Norway", label: "Norway" },
  { value: "Denmark", label: "Denmark" },
  { value: "Switzerland", label: "Switzerland" },
  { value: "Belgium", label: "Belgium" },
  { value: "Ireland", label: "Ireland" },
  { value: "New Zealand", label: "New Zealand" },
  { value: "Finland", label: "Finland" },
  { value: "Austria", label: "Austria" },
  { value: "Italy", label: "Italy" },
  { value: "China", label: "China" },
  { value: "South Africa", label: "South Africa" },
  { value: "Nigeria", label: "Nigeria" },
  { value: "Kenya", label: "Kenya" },
  { value: "Ghana", label: "Ghana" },
  { value: "Egypt", label: "Egypt" },
  { value: "Rwanda", label: "Rwanda" },
  { value: "Morocco", label: "Morocco" },
  { value: "Ethiopia", label: "Ethiopia" },
  { value: "Multiple", label: "Multiple / International" },
];

const STUDY_FIELDS = [
  "Computer Science",
  "Engineering",
  "Business",
  "Economics",
  "Medicine",
  "Public Health",
  "Law",
  "Agriculture",
  "Education",
  "Social Sciences",
  "Environmental Science",
  "Architecture",
  "Arts",
  "Humanities",
  "International Relations",
  "Finance",
  "Development Studies",
  "Journalism",
  "Mathematics",
  "Public Policy",
];

const PAGE_SIZE = 20;

interface Pagination {
  page: number;
  limit: number;
  total: number;
  pages: number;
}

const TIER_CONFIG = {
  strong: { label: "Strong fit", color: "#6d8ec5" },
  good: { label: "Good fit", color: "#64748B" },
  moderate: { label: "Moderate fit", color: "#94a3b8" },
  weak: { label: "Weak fit", color: "#DC2626" },
};

function ForYouPanel() {
  const { user } = useAuth();
  const [matches, setMatches] = useState<RecommendationMatch[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [fetched, setFetched] = useState(false);
  const [dismissing, setDismissing] = useState<string | null>(null);
  const [dismissedCount, setDismissedCount] = useState(0);
  const [isLimited, setIsLimited] = useState(false);

  const isPro =
    user?.subscription?.plan === "pro" &&
    (user?.subscription?.status === "active" || user?.subscription?.status === "trialing");

  const fetchRecommendations = useCallback(async (force = false) => {
    setLoading(true);
    setError(null);
    try {
      const url = force ? "/opportunities/recommended?force=true" : "/opportunities/recommended";
      const data = await api.get<{ recommendations: RecommendationMatch[]; limited?: boolean }>(url);
      setMatches(data.recommendations);
      setIsLimited(data.limited ?? false);
      if (force) setDismissedCount(0);
    } catch (err: any) {
      // If the server returns UPGRADE_REQUIRED for a free user, show the upgrade
      // teaser instead of a raw error — this can happen while the server restarts.
      if (err.message?.includes("UPGRADE_REQUIRED") && !isPro) {
        setMatches([]);
        setIsLimited(true);
      } else {
        setError(err.message || "Couldn't load recommendations.");
      }
    } finally {
      setLoading(false);
      setFetched(true);
    }
  }, [isPro]);

  const handleDismiss = useCallback(async (opportunityId: string) => {
    setDismissing(opportunityId);
    try {
      await api.post(`/opportunities/${opportunityId}/dismiss`);
      setMatches((prev) => prev.filter((m) => m.opportunityId !== opportunityId));
      setDismissedCount((n) => n + 1);
    } catch {
      // dismiss failed silently — don't disrupt the user
    } finally {
      setDismissing(null);
    }
  }, []);

  useEffect(() => {
    if (!user || !user.cvData) return;
    fetchRecommendations();
  }, [user, fetchRecommendations]);

  if (!user) {
    return (
      <div className="mt-10 case-card p-8 max-w-lg">
        <p className="font-display text-xl text-ink">Sign in to see your matches</p>
        <p className="text-ink-soft mt-2 text-sm leading-relaxed">
          Create an account, upload your CV, and we'll rank every opportunity by how well it fits your actual background.
        </p>
        <div className="mt-5 flex gap-3">
          <Link href="/login" className="btn-secondary text-sm px-4 py-2">Sign in</Link>
          <Link href="/register" className="btn-primary text-sm px-4 py-2">Create account</Link>
        </div>
      </div>
    );
  }

  if (!user.cvData) {
    return (
      <div className="mt-10 case-card p-8 max-w-lg">
        <p className="font-display text-xl text-ink">Upload your CV to unlock matches</p>
        <p className="text-ink-soft mt-2 text-sm leading-relaxed">
          We read your actual education, experience, and skills — then rank every opportunity against it. No generic suggestions.
        </p>
        <Link href="/cv" className="btn-primary inline-flex mt-5 text-sm">Upload CV →</Link>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="mt-10">
        <div className="flex items-center gap-2 mb-6">
          <span className="inline-block w-2 h-2 rounded-full bg-forest animate-pulse" />
          <p className="text-sm font-mono text-slate">Scoring opportunities against your CV…</p>
        </div>
        <div className="space-y-3">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="case-card p-5 animate-pulse">
              <div className="h-4 bg-rule rounded w-2/3 mb-3" />
              <div className="h-3 bg-rule rounded w-1/3 mb-2" />
              <div className="h-3 bg-rule rounded w-full" />
            </div>
          ))}
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="mt-10">
        <p className="text-alert text-sm">{error}</p>
        <button onClick={() => fetchRecommendations()} className="mt-3 text-sm text-forest underline">
          Try again
        </button>
      </div>
    );
  }

  if (fetched && matches.length === 0) {
    return (
      <div className="mt-10 case-card p-8 max-w-lg">
        <p className="font-display text-xl text-ink">No strong matches yet</p>
        <p className="text-ink-soft mt-2 text-sm leading-relaxed">
          {dismissedCount > 0
            ? `You dismissed ${dismissedCount} suggestion${dismissedCount !== 1 ? "s" : ""}. Try refreshing to see new ones, or add target countries and a degree level to your profile for better results.`
            : "We didn't find opportunities that clearly match your profile. Add target countries and a target degree level to your profile — that's the fastest way to improve results."}
        </p>
        <div className="mt-5 flex gap-3 flex-wrap">
          <button onClick={() => fetchRecommendations(true)} className="btn-primary text-sm">
            Refresh
          </button>
          <Link href="/profile" className="btn-secondary text-sm">
            Update profile →
          </Link>
        </div>
      </div>
    );
  }

  const hasEligibilityGap = (standoutFactor: string | null) =>
    !!standoutFactor && standoutFactor.toLowerCase().startsWith("none");

  return (
    <div className="mt-10">
      <div className="flex items-center justify-between mb-6 flex-wrap gap-3">
        <p className="text-xs font-mono text-slate">
          {matches.length} opportunit{matches.length !== 1 ? "ies" : "y"} ranked by profile fit
          {dismissedCount > 0 && (
            <span className="ml-2 text-slate/60">· {dismissedCount} dismissed</span>
          )}
        </p>
        <button
          onClick={() => fetchRecommendations(true)}
          disabled={loading}
          className="font-mono text-xs text-forest hover:underline disabled:opacity-40"
        >
          {loading ? "Refreshing…" : "↺ Refresh results"}
        </button>
      </div>

      <div className="space-y-3">
        {matches.map((match) => {
          const tier = TIER_CONFIG[match.fitTier] ?? TIER_CONFIG.moderate;
          const opp = match.opportunity;
          if (!opp) return null;
          const isDismissing = dismissing === match.opportunityId;
          const gapOnly = hasEligibilityGap(match.standoutFactor || "");

          return (
            <div key={match.opportunityId} className="case-card-interactive p-5 group relative">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <Link href={`/opportunities/${match.opportunityId}`} className="min-w-0 flex-1 block">
                  <p className="font-mono text-xs uppercase tracking-widest mb-1" style={{ color: tier.color }}>
                    {tier.label}{match.fitScore != null ? ` · ${match.fitScore}/100` : ""}
                  </p>
                  <p className="font-display text-lg text-ink group-hover:text-forest transition-colors leading-snug break-words">
                    {opp.title}
                  </p>
                  <p className="text-sm text-slate mt-0.5">{opp.provider} · {opp.country}</p>
                </Link>
                <button
                  onClick={() => handleDismiss(match.opportunityId)}
                  disabled={isDismissing}
                  title="Not for me"
                  className="shrink-0 font-mono text-[0.65rem] text-slate/40 hover:text-slate border border-transparent hover:border-rule px-2 py-1 rounded transition-all disabled:opacity-30"
                >
                  {isDismissing ? "…" : "Not for me"}
                </button>
              </div>

              {match.urgency && (
                <p className="mt-2 font-mono text-xs" style={{ color: "#d3622c" }}>{match.urgency}</p>
              )}

              <p className="mt-3 text-sm text-ink-soft leading-relaxed">{match.reasoning}</p>

              {match.standoutFactor && !gapOnly && (
                <p className="mt-2 text-xs text-slate">
                  <span className="font-medium text-ink">Edge: </span>
                  {match.standoutFactor}
                </p>
              )}
              {match.standoutFactor && gapOnly && (
                <p className="mt-2 text-xs text-slate">
                  <span className="font-medium text-alert">Gap: </span>
                  {match.standoutFactor}
                </p>
              )}
            </div>
          );
        })}
      </div>

      {isLimited && (
        <div className="mt-6 rounded-xl border border-rule p-5" style={{ background: "#f8f4ef" }}>
          <p className="font-display text-base text-ink">Showing 3 heuristic matches</p>
          <p className="text-sm text-ink-soft mt-1 leading-relaxed">
            Pro uses your full CV to score every opportunity 0–100, ranks them by fit tier, and explains exactly why each one matches — or doesn't.
          </p>
          <Link href="/pricing" className="btn-primary inline-flex mt-4 text-sm">
            Unlock full matching →
          </Link>
        </div>
      )}

      {!isLimited && (
        <p className="mt-8 text-xs text-slate font-mono leading-relaxed">
          Scores based on your CV{user.cvData?.parsedAt ? ` (uploaded ${new Date(user.cvData.parsedAt).toLocaleDateString()})` : ""}{user.profile?.targetCountries?.length ? ` and target countries (${user.profile.targetCountries.slice(0, 2).join(", ")})` : ""}.
          Committees make the final call.{" "}
          <Link href="/cv" className="text-forest underline">Update CV</Link>
          {" · "}
          <Link href="/profile" className="text-forest underline">Update profile</Link>
          {" "}to sharpen results.
        </p>
      )}
    </div>
  );
}

export default function HomePage() {
  const { user, loading: authLoading } = useAuth();

  const [opportunities, setOpportunities] = useState<Opportunity[]>([]);
  const [pagination, setPagination] = useState<Pagination | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [q, setQ] = useState("");
  const [type, setType] = useState("");
  const [degreeLevel, setDegreeLevel] = useState("");
  const [country, setCountry] = useState("");
  const [field, setField] = useState("");
  const [openOnly, setOpenOnly] = useState(false);
  const [page, setPage] = useState(1);
  const [activeTab, setActiveTab] = useState<"catalogue" | "for-you">("catalogue");

  const resetPage = useCallback(() => setPage(1), []);

  const fetchOpportunities = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams();
      if (q) params.set("q", q);
      if (type) params.set("type", type);
      // incubators/accelerators live on /grants — exclude when no specific type is selected
      else params.set("excludeType", "incubator");
      if (degreeLevel) params.set("degreeLevel", degreeLevel);
      if (country) params.set("country", country);
      if (field) params.set("field", field);
      if (openOnly) params.set("openOnly", "true");
      params.set("page", String(page));
      params.set("limit", String(PAGE_SIZE));

      const data = await api.get<{ opportunities: Opportunity[]; pagination: Pagination }>(
        `/opportunities?${params.toString()}`,
        { auth: false }
      );
      setOpportunities(data.opportunities);
      setPagination(data.pagination);
    } catch (err: any) {
      setError(err.message || "Couldn't load opportunities right now.");
    } finally {
      setLoading(false);
    }
  }, [q, type, degreeLevel, country, field, openOnly, page]);

  useEffect(() => {
    const timeout = setTimeout(fetchOpportunities, 300);
    return () => clearTimeout(timeout);
  }, [fetchOpportunities]);

  function handleFilterChange(setter: (v: string) => void) {
    return (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
      setter(e.target.value);
      resetPage();
    };
  }

  return (
    <div className="max-w-6xl mx-auto px-6 py-16">
      {/* Hero — shown only to visitors, hidden once logged in */}
      {!authLoading && !user && (
        <div className="flex flex-col lg:flex-row lg:items-center gap-14 lg:gap-16">
          <div className="max-w-xl flex-shrink-0">
            <h1 className="font-display text-5xl sm:text-6xl text-ink leading-[1.05] tracking-tight">
              Study abroad.<br />
              <span style={{ color: "#d3622c" }}>Without the guesswork.</span>
            </h1>
            <p className="text-ink-soft mt-5 text-lg leading-relaxed">
              Scholarships and programs matched to your profile. Coaching that closes the gaps before you apply. The committee decides — we help you show up prepared.
            </p>
            <div className="mt-7 flex gap-3">
              <Link href="/register" className="btn-primary">Get started free</Link>
              <Link href="/cv" className="btn-secondary">Upload your CV</Link>
            </div>
            <p className="mt-5 text-xs text-slate font-mono">Free to start · No credit card required</p>
          </div>

          {/* Hero visual */}
          <div className="hidden lg:flex flex-1 min-h-[400px] rounded-2xl overflow-hidden relative" style={{ background: "#6d8ec5" }}>
            <div className="absolute top-0 right-0 w-52 h-52 rounded-bl-3xl" style={{ background: "#f0c845" }} />
            <div className="absolute top-8 right-8 w-28 h-28 rounded-xl" style={{ background: "#d3622c" }} />
            <div className="absolute bottom-0 left-0 w-36 h-36 rounded-tr-3xl opacity-40" style={{ background: "#1a2d45" }} />
            <div className="relative flex flex-col justify-end p-10 w-full">
              <p className="font-mono text-xs tracking-widest uppercase mb-3" style={{ color: "#f0c845" }}>ScolarNav</p>
              <p className="font-display text-4xl text-white leading-tight">
                Your scholarship<br />story starts here.
              </p>
              <p className="mt-3 text-sm leading-relaxed" style={{ color: "rgba(255,255,255,0.65)" }}>
                Thousands of African scholars found their path through ScolarNav.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Logged-in header */}
      {!authLoading && user && (
        <div className="flex flex-wrap items-baseline justify-between gap-3">
          <div>
            <h1 className="font-display text-3xl sm:text-4xl text-ink">
              {user.cvData ? "Find your next opportunity" : "Welcome, " + (user.fullName?.split(" ")[0] ?? "there")}
            </h1>
            {!user.cvData && (
              <p className="text-ink-soft text-sm mt-1">
                <Link href="/cv" className="text-forest underline">Upload your CV</Link> to unlock personalised matching and coaching.
              </p>
            )}
          </div>
          <Link href="/dashboard" className="text-sm text-slate hover:text-forest transition-colors font-mono">
            My applications →
          </Link>
        </div>
      )}

      {/* Segment control tab switcher */}
      <div className={!authLoading && user ? "mt-8" : "mt-14"}>
        <div
          className="inline-flex rounded-lg p-1 gap-1"
          style={{ background: "#dce8f5" }}
        >
          <button
            onClick={() => setActiveTab("catalogue")}
            className="px-5 py-2 text-sm font-medium rounded-md transition-all"
            style={
              activeTab === "catalogue"
                ? { background: "#fff", color: "#d3622c" }
                : { background: "transparent", color: "#64748B" }
            }
          >
            Catalogue
          </button>
          <button
            onClick={() => setActiveTab("for-you")}
            className="px-5 py-2 text-sm font-medium rounded-md transition-all"
            style={
              activeTab === "for-you"
                ? { background: "#fff", color: "#d3622c" }
                : { background: "transparent", color: "#64748B" }
            }
          >
            For You
          </button>
        </div>
      </div>

      {activeTab === "for-you" ? (
        <ForYouPanel />
      ) : (
        <>
          {/* Grants callout — minimal */}
          <p className="mt-5 text-xs text-slate font-mono">
            Looking for startup grants?{" "}
            <Link href="/grants" className="text-forest underline">Browse the grants catalogue →</Link>
          </p>

          {/* Filter bar */}
          <div className="mt-4 flex flex-col md:flex-row gap-2.5">
            <input
              value={q}
              onChange={handleFilterChange(setQ)}
              placeholder="Search by title, provider, or keyword…"
              className="input flex-1"
            />
            <select
              value={type}
              onChange={handleFilterChange(setType)}
              className="input md:w-44"
            >
              {TYPES.map((t) => (
                <option key={t.value} value={t.value}>{t.label}</option>
              ))}
            </select>
            <select
              value={degreeLevel}
              onChange={handleFilterChange(setDegreeLevel)}
              className="input md:w-36"
            >
              {DEGREE_LEVELS.map((d) => (
                <option key={d.value} value={d.value}>{d.label}</option>
              ))}
            </select>
            <select
              value={field}
              onChange={handleFilterChange(setField)}
              className="input md:w-44"
            >
              <option value="">All fields</option>
              {STUDY_FIELDS.map((f) => (
                <option key={f} value={f}>{f}</option>
              ))}
            </select>
            <select
              value={country}
              onChange={handleFilterChange(setCountry)}
              className="input md:w-48"
            >
              <option value="">All countries</option>
              {SCHOLARSHIP_COUNTRIES.map((c) => (
                <option key={c.value} value={c.value}>{c.label}</option>
              ))}
            </select>
          </div>

          {/* Open-only toggle */}
          <div className="mt-3 flex items-center gap-2">
            <button
              onClick={() => { setOpenOnly((v) => !v); setPage(1); }}
              className="flex items-center gap-2 text-sm font-mono transition-colors"
              style={{ color: openOnly ? "#d3622c" : "#94a3b8" }}
            >
              <span
                className="inline-flex items-center justify-center w-4 h-4 rounded border transition-colors shrink-0"
                style={openOnly ? { background: "#d3622c", borderColor: "#d3622c" } : { borderColor: "#cbd5e1" }}
              >
                {openOnly && <span className="text-white text-[9px] font-bold leading-none">✓</span>}
              </span>
              Open for applications only
            </button>
          </div>

          <div className="mt-6">
            {loading && (
              <div className="bento-discovery">
                {[...Array(7)].map((_, i) => (
                  <div key={i} className="case-card p-5 animate-pulse min-h-[160px]">
                    <div className="h-2.5 bg-rule rounded w-1/4 mb-4" />
                    <div className="h-5 bg-rule rounded w-4/5 mb-2" />
                    <div className="h-3 bg-rule rounded w-1/2 mb-4" />
                    <div className="h-2.5 bg-rule rounded w-1/3 mt-auto" />
                  </div>
                ))}
              </div>
            )}
            {error && <p className="text-alert text-sm">{error}</p>}
            {!loading && !error && opportunities.length === 0 && (
              <p className="text-slate text-sm">No opportunities match those filters. Try widening your search.</p>
            )}

            {pagination && !loading && (
              <p className="text-xs text-slate font-mono mb-5">
                {pagination.total} result{pagination.total !== 1 ? "s" : ""}
                {pagination.pages > 1 && ` — page ${pagination.page} of ${pagination.pages}`}
              </p>
            )}

            {!loading && (
              <div className="bento-discovery">
                {opportunities.map((o, i) => {
                  const pos = i % 7;
                  const variant: CardVariant =
                    pos === 0 ? "featured" : pos >= 5 ? "default" : "compact";
                  return <OpportunityCard key={o._id} opportunity={o} variant={variant} />;
                })}
              </div>
            )}

            {pagination && pagination.pages > 1 && (
              <div className="mt-10 flex items-center justify-center gap-2">
                <button
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                  disabled={page === 1 || loading}
                  className="btn-secondary text-sm px-4 py-2 disabled:opacity-30"
                >
                  ← Prev
                </button>

                {Array.from({ length: pagination.pages }, (_, i) => i + 1)
                  .filter((p) => p === 1 || p === pagination.pages || Math.abs(p - page) <= 2)
                  .reduce<(number | "…")[]>((acc, p, idx, arr) => {
                    if (idx > 0 && p - (arr[idx - 1] as number) > 1) acc.push("…");
                    acc.push(p);
                    return acc;
                  }, [])
                  .map((p, i) =>
                    p === "…" ? (
                      <span key={`ellipsis-${i}`} className="text-slate font-mono text-sm px-1">…</span>
                    ) : (
                      <button
                        key={p}
                        onClick={() => setPage(p as number)}
                        disabled={loading}
                        className={`w-9 h-9 text-sm font-mono rounded-md transition-colors disabled:opacity-50 ${page === p
                          ? "bg-forest text-white"
                          : "border border-rule text-ink-soft hover:border-forest hover:text-forest"
                          }`}
                      >
                        {p}
                      </button>
                    )
                  )}

                <button
                  onClick={() => setPage((p) => Math.min(pagination.pages, p + 1))}
                  disabled={page === pagination.pages || loading}
                  className="btn-secondary text-sm px-4 py-2 disabled:opacity-30"
                >
                  Next →
                </button>
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
}
