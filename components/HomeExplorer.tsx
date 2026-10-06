"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import { api } from "@/lib/api";
import { Opportunity, RecommendationMatch } from "@/lib/types";
import OpportunityCard from "@/components/OpportunityCard";
import { useAuth } from "@/lib/auth-context";
import Link from "next/link";
import { PAGE_SIZE, type Pagination } from "@/lib/opportunities";
import PagerLink from "@/components/PagerLink";
import { RefreshCw, Search, SearchX, UserRound } from "lucide-react";
import { SHOW_GRANTS } from "@/lib/site";
import { opportunityPath } from "@/lib/paths";
import { knownProvider } from "@/lib/opportunities";
import { EmptyState, ErrorState } from "@/components/ui/States";
import { Skeleton, SkeletonGrid } from "@/components/ui/Skeleton";
import { ProgressBar } from "@/components/ui/Spinner";

const TYPES = [
  { value: "", label: "All types" },
  { value: "scholarship", label: "Scholarships" },
  { value: "fellowship", label: "Fellowships" },
  { value: "study_program", label: "Study programs" },
  { value: "immigration_pathway", label: "Immigration pathways" },
];

const DEGREE_LEVELS = [
  { value: "", label: "Any level" },
  { value: "undergraduate", label: "Undergraduate" },
  { value: "masters", label: "Master's" },
  { value: "phd", label: "PhD" },
  { value: "postdoc", label: "Postdoc" },
  { value: "professional", label: "Professional" },
  { value: "none", label: "No degree required" },
];

// Countries as stored by the scraper: these are the values that appear in the DB
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

const TIER_CONFIG = {
  strong: { label: "Strong fit", badge: "badge-ok" },
  good: { label: "Good fit", badge: "badge-info" },
  moderate: { label: "Moderate fit", badge: "" },
  weak: { label: "Weak fit", badge: "badge-danger" },
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
      // teaser instead of a raw error. This can happen while the server restarts.
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
      // dismiss failed silently, so the user is not disrupted
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
      <div className="mt-8 max-w-xl">
        <EmptyState
          icon={UserRound}
          title="Sign in to see your matches"
          description="Create an account, upload your CV, and we will rank every opportunity by how well it fits your actual background."
          action={
            <div className="flex gap-3">
              <Link href="/login" className="btn-secondary">Sign in</Link>
              <Link href="/register" className="btn-primary">Create account</Link>
            </div>
          }
        />
      </div>
    );
  }

  if (!user.cvData) {
    return (
      <div className="mt-8 max-w-xl">
        <EmptyState
          title="Upload your CV to unlock matches"
          description="We read your actual education, experience and skills, then rank every opportunity against it. No generic suggestions."
          action={<Link href="/cv" className="btn-primary">Upload CV</Link>}
        />
      </div>
    );
  }

  if (loading) {
    return (
      <div className="mt-8" role="status" aria-label="Scoring opportunities against your CV">
        <ProgressBar label="Scoring opportunities against your CV" />
        <p className="mb-6 mt-2 text-sm text-slate">Scoring opportunities against your CV</p>
        <div className="space-y-3">
          {[0, 1, 2, 3].map((i) => (
            <div key={i} aria-hidden="true" className="card card-pad space-y-3">
              <Skeleton className="h-4 w-2/3" />
              <Skeleton className="h-3 w-1/3" />
              <Skeleton className="h-3 w-full" />
            </div>
          ))}
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="mt-8 max-w-xl">
        <ErrorState title="Could not load your matches" message={error} onRetry={() => fetchRecommendations()} />
      </div>
    );
  }

  if (fetched && matches.length === 0) {
    return (
      <div className="mt-8 max-w-xl">
        <EmptyState
          title="No strong matches yet"
          description={
            dismissedCount > 0
              ? `You dismissed ${dismissedCount} suggestion${dismissedCount !== 1 ? "s" : ""}. Refresh to see new ones, or add target countries and a degree level to your profile for better results.`
              : "We did not find opportunities that clearly match your profile. Adding target countries and a degree level is the fastest way to improve results."
          }
          action={
            <div className="flex flex-wrap justify-center gap-3">
              <button type="button" onClick={() => fetchRecommendations(true)} className="btn-primary">Refresh</button>
              <Link href="/profile" className="btn-secondary">Update profile</Link>
            </div>
          }
        />
      </div>
    );
  }

  const hasEligibilityGap = (standoutFactor: string | null) =>
    !!standoutFactor && standoutFactor.toLowerCase().startsWith("none");

  return (
    <div className="mt-8">
      <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
        <p className="text-sm text-slate">
          {matches.length} opportunit{matches.length !== 1 ? "ies" : "y"} ranked by profile fit
          {dismissedCount > 0 && <span> · {dismissedCount} dismissed</span>}
        </p>
        <button type="button" onClick={() => fetchRecommendations(true)} disabled={loading} className="btn-secondary btn-sm">
          <RefreshCw size={14} aria-hidden="true" />
          Refresh results
        </button>
      </div>

      <ul className="space-y-3">
        {matches.map((match) => {
          const tier = TIER_CONFIG[match.fitTier] ?? TIER_CONFIG.moderate;
          const opp = match.opportunity;
          if (!opp) return null;
          const isDismissing = dismissing === match.opportunityId;
          const gapOnly = hasEligibilityGap(match.standoutFactor || "");

          return (
            <li key={match.opportunityId} className="card card-pad">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <Link href={opportunityPath(opp)} className="group block min-w-0 flex-1">
                  <span className={`badge mb-2 ${tier.badge}`}>
                    {tier.label}
                    {match.fitScore != null ? ` · ${match.fitScore}/100` : ""}
                  </span>
                  <span className="block break-words font-display text-lg leading-snug text-ink transition-colors group-hover:text-forest">
                    {opp.title}
                  </span>
                  <span className="mt-0.5 block text-sm text-slate">{[knownProvider(opp.provider), opp.country].filter(Boolean).join(" · ")}</span>
                </Link>
                <button
                  type="button"
                  onClick={() => handleDismiss(match.opportunityId)}
                  disabled={isDismissing}
                  aria-busy={isDismissing}
                  className="btn-ghost btn-sm shrink-0"
                >
                  {isDismissing ? "Removing" : "Not for me"}
                </button>
              </div>

              {match.urgency && <p className="mt-2 text-sm font-semibold text-warn">{match.urgency}</p>}

              <p className="mt-3 text-sm leading-relaxed text-ink-soft">{match.reasoning}</p>

              {match.standoutFactor && (
                <p className="mt-2 text-sm text-slate">
                  <span className={`font-semibold ${gapOnly ? "text-danger" : "text-ink"}`}>{gapOnly ? "Gap: " : "Edge: "}</span>
                  {match.standoutFactor}
                </p>
              )}
            </li>
          );
        })}
      </ul>

      {isLimited && (
        <div className="mt-6 rounded-xl bg-forest-soft p-5">
          <p className="font-display text-lg text-ink">Showing 3 heuristic matches</p>
          <p className="mt-1 text-sm leading-relaxed text-ink-soft">
            Pro uses your full CV to score every opportunity from 0 to 100, ranks them by fit, and explains exactly why each one matches, or does not.
          </p>
          <Link href="/pricing" className="btn-primary mt-4">Unlock full matching</Link>
        </div>
      )}

      {!isLimited && (
        <p className="mt-8 text-sm leading-relaxed text-slate">
          Scores are based on your CV{user.cvData?.parsedAt ? ` (uploaded ${new Date(user.cvData.parsedAt).toLocaleDateString()})` : ""}
          {user.profile?.targetCountries?.length ? ` and target countries (${user.profile.targetCountries.slice(0, 2).join(", ")})` : ""}. Committees make the final call.{" "}
          <Link href="/cv" className="font-semibold text-forest underline">Update CV</Link>
          {" or "}
          <Link href="/profile" className="font-semibold text-forest underline">update profile</Link> to sharpen results.
        </p>
      )}
    </div>
  );
}

export interface HomeInitialData {
  opportunities: Opportunity[];
  pagination: Pagination;
}

/** Hero copy: rendered on the server so the h1 is in the HTML crawlers see. */
export default function HomeExplorer({ initial }: { initial: HomeInitialData | null }) {
  const { user, loading: authLoading } = useAuth();

  // Server HTML always contains the guest hero (+ h1). Returning visitors with a stored token
  // never see it: this flag flips right after hydration, before the profile finishes loading.
  const [hasStoredSession, setHasStoredSession] = useState(false);
  useEffect(() => {
    try { setHasStoredSession(!!localStorage.getItem("ScolarNav_token")); } catch { /* storage blocked */ }
  }, []);
  const showGuestHero = !hasStoredSession && (authLoading || !user);

  // Real data for the hero: open opportunities with the nearest deadlines on the first page.
  const closingSoon = (initial?.opportunities ?? [])
    .filter((o) => o.deadline && new Date(o.deadline).getTime() > Date.now())
    .sort((x, y) => new Date(x.deadline!).getTime() - new Date(y.deadline!).getTime())
    .slice(0, 4);

  const [opportunities, setOpportunities] = useState<Opportunity[]>(initial?.opportunities ?? []);
  const [pagination, setPagination] = useState<Pagination | null>(initial?.pagination ?? null);
  const [loading, setLoading] = useState(!initial);
  const [error, setError] = useState<string | null>(null);

  const [q, setQ] = useState("");
  const [type, setType] = useState("");
  const [degreeLevel, setDegreeLevel] = useState("");
  const [country, setCountry] = useState("");
  const [field, setField] = useState("");
  const [openOnly, setOpenOnly] = useState(false);
  const [page, setPage] = useState(initial?.pagination.page ?? 1);
  // The server already rendered the initial view; skip the first client fetch when nothing has changed.
  const skipInitialFetch = useRef(!!initial);
  const [activeTab, setActiveTab] = useState<"catalogue" | "for-you">("catalogue");

  const resetPage = useCallback(() => setPage(1), []);

  const fetchOpportunities = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams();
      if (q) params.set("q", q);
      if (type) params.set("type", type);
      // incubators/accelerators live on /grants: exclude when no specific type is selected
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
    if (skipInitialFetch.current) {
      skipInitialFetch.current = false;
      return;
    }
    const timeout = setTimeout(fetchOpportunities, 300);
    return () => clearTimeout(timeout);
  }, [fetchOpportunities]);

  function handleFilterChange(setter: (v: string) => void) {
    return (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
      setter(e.target.value);
      resetPage();
    };
  }

  const hasFilters = !!(q || type || degreeLevel || country || field || openOnly);
  function clearFilters() {
    setQ(""); setType(""); setDegreeLevel(""); setCountry(""); setField(""); setOpenOnly(false); setPage(1);
  }

  return (
    <div className="page">
      {/* Hero: shown only to visitors, hidden once signed in */}
      {showGuestHero && (
        <section className="mb-14 flex flex-col gap-12 lg:flex-row lg:items-center lg:gap-16">
          <div className="max-w-xl shrink-0">
            <h1 className="font-display text-5xl leading-[1.05] tracking-tight text-ink sm:text-6xl">
              Study abroad.<br />
              <span className="text-forest">Without the guesswork.</span>
            </h1>
            <p className="lead mt-5">
              Scholarships and programs matched to your profile. Coaching that closes the gaps before you apply. The committee decides, and we help you show up prepared.
            </p>
            <div className="mt-7 flex flex-wrap gap-3">
              <Link href="/register" className="btn-primary">Get started free</Link>
              <Link href="/cv" className="btn-secondary">Upload your CV</Link>
            </div>
            <p className="mt-4 text-sm text-slate">Free to start. No credit card required.</p>
          </div>

          {closingSoon.length > 0 && (
            <aside aria-label="Closing soon" className="hidden flex-1 rounded-xl bg-white p-6 lg:block">
              <h2 className="font-display text-xl text-ink">Closing soon</h2>
              <p className="mt-1 text-sm text-slate">Open now, nearest deadline first.</p>
              <ul className="mt-4 divide-y divide-rule">
                {closingSoon.map((o) => (
                  <li key={o._id}>
                    <Link href={opportunityPath(o)} className="group flex min-h-touch items-start justify-between gap-4 py-3">
                      <span className="min-w-0">
                        <span className="line-clamp-2 block font-medium text-ink transition-colors group-hover:text-forest">{o.title}</span>
                        <span className="line-clamp-1 block text-sm text-slate">
                          {[knownProvider(o.provider), o.country !== "Multiple" ? o.country : null].filter(Boolean).join(" · ")}
                        </span>
                      </span>
                      <span className="shrink-0 text-sm font-semibold text-ink">
                        {new Date(o.deadline!).toLocaleDateString("en-GB", { day: "numeric", month: "short", timeZone: "Africa/Lagos" })}
                      </span>
                    </Link>
                  </li>
                ))}
              </ul>
            </aside>
          )}
        </section>
      )}

      {/* Signed-in header */}
      {!authLoading && user && (
        <header className="mb-8 flex flex-wrap items-end justify-between gap-3">
          <div>
            <h1 className="h1">{user.cvData ? "Find your next opportunity" : `Welcome, ${user.fullName?.split(" ")[0] ?? "there"}`}</h1>
            {!user.cvData && (
              <p className="mt-2 text-ink-soft">
                <Link href="/cv" className="font-semibold text-forest underline">Upload your CV</Link> to unlock personalised matching and coaching.
              </p>
            )}
          </div>
          <Link href="/dashboard" className="btn-secondary">My dashboard</Link>
        </header>
      )}

      {/* Tabs */}
      <div role="tablist" aria-label="Catalogue view" className="inline-flex w-full gap-1 rounded-lg bg-surface-2 p-1 sm:w-auto">
        {([
          { key: "catalogue", label: "Catalogue" },
          { key: "for-you", label: "For you" },
        ] as const).map((t) => {
          const selected = activeTab === t.key;
          return (
            <button
              key={t.key}
              type="button"
              role="tab"
              aria-selected={selected}
              onClick={() => setActiveTab(t.key)}
              className={`min-h-touch flex-1 rounded-md px-6 text-sm font-semibold transition-colors sm:flex-none ${
                selected ? "bg-white text-forest" : "text-slate hover:text-ink"
              }`}
            >
              {t.label}
            </button>
          );
        })}
      </div>

      {activeTab === "for-you" ? (
        <ForYouPanel />
      ) : (
        <>
          {SHOW_GRANTS && (
            <p className="mt-5 text-sm text-slate">
              Looking for startup grants?{" "}
              <Link href="/grants" className="font-semibold text-forest underline">Browse the grants catalogue</Link>
            </p>
          )}

          {/* Filters */}
          <form role="search" onSubmit={(e) => e.preventDefault()} className="card card-pad mt-5 space-y-3">
            <div className="relative">
              <label htmlFor="f-q" className="sr-only">Search by title, provider or keyword</label>
              <Search size={18} className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-slate" aria-hidden="true" />
              <input
                id="f-q"
                type="search"
                value={q}
                onChange={handleFilterChange(setQ)}
                placeholder="Search by title, provider or keyword"
                className="input pl-11"
              />
            </div>

            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
              <div>
                <label htmlFor="f-type" className="sr-only">Type</label>
                <select id="f-type" value={type} onChange={handleFilterChange(setType)} className="input">
                  {TYPES.map((t) => <option key={t.value} value={t.value}>{t.label}</option>)}
                </select>
              </div>
              <div>
                <label htmlFor="f-level" className="sr-only">Degree level</label>
                <select id="f-level" value={degreeLevel} onChange={handleFilterChange(setDegreeLevel)} className="input">
                  {DEGREE_LEVELS.map((d) => <option key={d.value} value={d.value}>{d.label}</option>)}
                </select>
              </div>
              <div>
                <label htmlFor="f-field" className="sr-only">Field of study</label>
                <select id="f-field" value={field} onChange={handleFilterChange(setField)} className="input">
                  <option value="">All fields</option>
                  {STUDY_FIELDS.map((f) => <option key={f} value={f}>{f}</option>)}
                </select>
              </div>
              <div>
                <label htmlFor="f-country" className="sr-only">Country</label>
                <select id="f-country" value={country} onChange={handleFilterChange(setCountry)} className="input">
                  <option value="">All countries</option>
                  {SCHOLARSHIP_COUNTRIES.map((c) => <option key={c.value} value={c.value}>{c.label}</option>)}
                </select>
              </div>
            </div>

            <div className="flex flex-wrap items-center justify-between gap-3">
              <label className="flex min-h-touch cursor-pointer items-center gap-3 text-sm font-medium text-ink-soft">
                <input
                  type="checkbox"
                  checked={openOnly}
                  onChange={() => { setOpenOnly((v) => !v); setPage(1); }}
                  className="h-5 w-5 accent-forest"
                />
                Open for applications only
              </label>
              {hasFilters && (
                <button type="button" onClick={clearFilters} className="btn-ghost btn-sm">
                  Clear filters
                </button>
              )}
            </div>
          </form>

          {!openOnly && (
            <p className="mt-3 text-sm text-slate">
              Programmes marked &ldquo;Dates to be announced&rdquo; repeat every year. Their next dates are not published yet.
            </p>
          )}

          <div className="mt-6">
            <p className="mb-5 text-sm text-slate" aria-live="polite">
              {pagination && !loading && !error && (
                <>
                  {pagination.total} result{pagination.total !== 1 ? "s" : ""}
                  {pagination.pages > 1 && ` · page ${pagination.page} of ${pagination.pages}`}
                </>
              )}
              {loading && "Loading results"}
            </p>

            {loading && <SkeletonGrid count={6} />}

            {error && !loading && <ErrorState title="Could not load opportunities" message={error} onRetry={fetchOpportunities} />}

            {!loading && !error && opportunities.length === 0 && (
              <EmptyState
                icon={SearchX}
                title="No opportunities match those filters"
                description="Try widening your search or removing a filter."
                action={hasFilters ? <button type="button" onClick={clearFilters} className="btn-primary">Clear filters</button> : undefined}
              />
            )}

            {!loading && !error && opportunities.length > 0 && (
              <div className="card-grid">
                {opportunities.map((o) => (
                  <OpportunityCard key={o._id} opportunity={o} />
                ))}
              </div>
            )}

            {pagination && pagination.pages > 1 && !loading && (
              <nav aria-label="Pagination" className="mt-10 flex flex-wrap items-center justify-center gap-2">
                <PagerLink basePath="/opportunities" firstHref="/" target={page - 1} current={page} disabled={page === 1 || loading} onGo={setPage} className="btn-secondary btn-sm" rel="prev">
                  Previous
                </PagerLink>

                {Array.from({ length: pagination.pages }, (_, i) => i + 1)
                  .filter((p) => p === 1 || p === pagination.pages || Math.abs(p - page) <= 2)
                  .reduce<(number | "…")[]>((acc, p, idx, arr) => {
                    if (idx > 0 && p - (arr[idx - 1] as number) > 1) acc.push("…");
                    acc.push(p);
                    return acc;
                  }, [])
                  .map((p, i) =>
                    p === "…" ? (
                      <span key={`ellipsis-${i}`} className="px-1 text-sm text-slate" aria-hidden="true">…</span>
                    ) : (
                      <PagerLink
                        key={p}
                        basePath="/opportunities"
                        firstHref="/"
                        target={p as number}
                        current={page}
                        disabled={loading}
                        onGo={setPage}
                        label={`Page ${p}`}
                        className={`inline-flex h-11 w-11 items-center justify-center rounded-md text-sm font-semibold transition-colors ${
                          page === p ? "bg-forest text-white" : "bg-white text-ink-soft ring-1 ring-inset ring-control hover:bg-surface-2"
                        }`}
                      >
                        {p}
                      </PagerLink>
                    )
                  )}

                <PagerLink basePath="/opportunities" firstHref="/" target={page + 1} current={page} disabled={page === pagination.pages || loading} onGo={setPage} className="btn-secondary btn-sm" rel="next">
                  Next
                </PagerLink>
              </nav>
            )}
          </div>
        </>
      )}
    </div>
  );
}
