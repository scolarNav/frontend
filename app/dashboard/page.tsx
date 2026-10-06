"use client";

import { Suspense, useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { Bookmark, CalendarDays, Compass, Globe, Map, MessageSquare, Mic, Trophy } from "lucide-react";
import { api, ApiError } from "@/lib/api";
import { useAuth } from "@/lib/auth-context";
import { Opportunity, SavedOpportunity, ReadinessScore } from "@/lib/types";
import { opportunityPath } from "@/lib/paths";
import ReadinessScoreCard from "@/components/ReadinessScoreCard";
import ReferralCard from "@/components/ReferralCard";
import { PageHeader } from "@/components/ui/PageHeader";
import { Alert, EmptyState } from "@/components/ui/States";
import { Skeleton, SkeletonHeader, SkeletonList } from "@/components/ui/Skeleton";

const STATUS_LABELS: Record<string, string> = {
  interested: "Interested",
  in_progress: "In progress",
  submitted: "Submitted",
  awarded: "Awarded",
  rejected: "Rejected",
  withdrawn: "Withdrawn",
};

const FEATURE_CARDS = [
  { href: "/mentor", Icon: MessageSquare, label: "Mentor", desc: "Ask anything, get a specific answer", pro: false },
  { href: "/roadmap", Icon: Map, label: "My roadmap", desc: "Your week-by-week scholarship plan", pro: true },
  { href: "/interview", Icon: Mic, label: "Mock interview", desc: "Practice with detailed feedback", pro: true },
  { href: "/deadlines", Icon: CalendarDays, label: "Deadlines", desc: "All your upcoming submission dates", pro: false },
  { href: "/countries", Icon: Globe, label: "Country guides", desc: "Sweden, UK, Germany and more", pro: false },
];

// Pipeline stages and the token classes that colour them.
const PIPELINE = [
  { key: "interested", label: "Saved", bar: "bg-control" },
  { key: "in_progress", label: "In progress", bar: "bg-info" },
  { key: "submitted", label: "Submitted", bar: "bg-forest" },
  { key: "awarded", label: "Won", bar: "bg-ok" },
];

function DashboardSkeleton() {
  return (
    <div className="page" role="status" aria-label="Loading your dashboard">
      <SkeletonHeader withAction />
      <div className="mb-8 grid grid-cols-3 gap-3">
        {[0, 1, 2].map((i) => (
          <div key={i} aria-hidden="true" className="card card-pad space-y-3">
            <Skeleton className="h-9 w-12" />
            <Skeleton className="h-3 w-20" />
          </div>
        ))}
      </div>
      <SkeletonList rows={3} />
    </div>
  );
}

function DashboardContent() {
  const { user, loading: authLoading, refreshUser } = useAuth();
  const router = useRouter();
  const searchParams = useSearchParams();
  const coachingPaid = searchParams.get("coaching_paid") === "1";

  const [details, setDetails] = useState<Record<string, Opportunity>>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [readiness, setReadiness] = useState<ReadinessScore | null>(user?.readinessCache ?? null);
  const [readinessLoading, setReadinessLoading] = useState(false);
  const [readinessError, setReadinessError] = useState<string | null>(null);

  useEffect(() => {
    if (!authLoading && !user) router.push("/login");
  }, [authLoading, user, router]);

  useEffect(() => {
    if (!user) return;
    if (user.readinessCache) setReadiness(user.readinessCache);

    async function loadDetails() {
      try {
        const ids = user!.savedOpportunities.map((s) => s.opportunity).join(",");
        const { opportunities } = await api.get<{ opportunities: Opportunity[] }>(
          `/opportunities/batch?ids=${ids}`
        );
        const map: Record<string, Opportunity> = {};
        opportunities.forEach((o) => { map[o._id] = o; });
        setDetails(map);
      } catch (err) {
        setError(err instanceof ApiError ? err.message : "Couldn't load your saved opportunities.");
      } finally {
        setLoading(false);
      }
    }

    if (user.savedOpportunities.length > 0) {
      loadDetails();
    } else {
      setLoading(false);
    }
  }, [user]);

  async function loadReadiness() {
    setReadinessLoading(true);
    setReadinessError(null);
    try {
      const { readiness: r } = await api.get<{ readiness: ReadinessScore }>("/profile/readiness");
      setReadiness(r);
    } catch (err) {
      setReadinessError(err instanceof ApiError ? err.message : "Couldn't load readiness score.");
    } finally {
      setReadinessLoading(false);
    }
  }

  async function refreshReadiness() {
    setReadinessLoading(true);
    setReadinessError(null);
    try {
      const { readiness: r } = await api.post<{ readiness: ReadinessScore }>("/profile/readiness/refresh");
      setReadiness(r);
    } catch (err) {
      setReadinessError(err instanceof ApiError ? err.message : "Couldn't refresh score.");
    } finally {
      setReadinessLoading(false);
    }
  }

  async function updateStatus(opportunityId: string, status: string) {
    try {
      await api.patch(`/opportunities/${opportunityId}/save`, { status });
      await refreshUser();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Couldn't update that status.");
    }
  }

  async function removeSaved(opportunityId: string) {
    try {
      await api.delete(`/opportunities/${opportunityId}/save`);
      await refreshUser();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Couldn't remove that opportunity.");
    }
  }

  if (authLoading || loading) return <DashboardSkeleton />;

  if (!user) return null;

  const isPro = user.subscription?.plan === "pro" &&
    (user.subscription?.status === "active" || user.subscription?.status === "trialing");

  const isTrialing = user.subscription?.status === "trialing";
  const trialDaysLeft = (() => {
    if (!isTrialing || !user.subscription?.currentPeriodEnd) return null;
    const ms = new Date(user.subscription.currentPeriodEnd).getTime() - Date.now();
    return Math.max(0, Math.ceil(ms / (1000 * 60 * 60 * 24)));
  })();

  const activeApps = user.savedOpportunities.filter(
    (s) => s.status === "interested" || s.status === "in_progress"
  ).length;
  const submitted = user.savedOpportunities.filter((s) => s.status === "submitted").length;
  const won = user.savedOpportunities.filter((s) => s.status === "awarded").length;

  const awardedOpps = user.savedOpportunities.filter((s) => s.status === "awarded");

  const statusCounts: Record<string, number> = {};
  for (const s of user.savedOpportunities) statusCounts[s.status] = (statusCounts[s.status] ?? 0) + 1;
  const total = user.savedOpportunities.length;
  const pipeline = PIPELINE.filter(({ key }) => statusCounts[key]);

  const urgentDeadlines = user.savedOpportunities
    .map((s) => {
      const opp = details[s.opportunity];
      if (!opp?.deadline) return null;
      const days = Math.ceil((new Date(opp.deadline).getTime() - Date.now()) / 86400000);
      if (days < 0 || days > 60) return null;
      return { s, opp, days };
    })
    .filter(Boolean)
    .sort((a: any, b: any) => a.days - b.days)
    .slice(0, 3) as { s: SavedOpportunity; opp: Opportunity; days: number }[];

  const gaps: { label: string; href: string; cta: string }[] = [];
  if (!user.cvData) gaps.push({ label: "Upload your CV to unlock personalised matching, readiness scoring and tailored coaching.", href: "/cv", cta: "Upload CV" });
  if (!user.profile?.targetCountries?.length) gaps.push({ label: "Add target countries so we can show scholarships from where you want to study first.", href: "/profile", cta: "Set countries" });
  if (!user.profile?.targetFields?.length) gaps.push({ label: "Add your fields of study so recommendations match what you want to pursue.", href: "/profile", cta: "Add fields" });

  return (
    <div className="page">
      <PageHeader
        eyebrow="Dashboard"
        title={`Welcome back, ${user.fullName.split(" ")[0]}`}
        actions={
          <Link href="/" className="btn-primary">
            <Compass size={18} aria-hidden="true" />
            Find opportunities
          </Link>
        }
      />

      <div className="space-y-6">
        {isTrialing && trialDaysLeft !== null && (
          <Alert variant="warn">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <p className="font-semibold">
                  {trialDaysLeft === 0
                    ? "Your free trial ends today"
                    : trialDaysLeft === 1
                      ? "1 day left on your free trial"
                      : `${trialDaysLeft} days left on your free trial`}
                </p>
                <p className="mt-0.5">
                  After the trial you will be charged {user.subscription.gateway === "paystack" ? "through Paystack" : "$7 a month or $55 a year"}. You can cancel any time before it ends.
                </p>
              </div>
              <Link href="/pricing" className="btn-secondary btn-sm shrink-0">
                Manage subscription
              </Link>
            </div>
          </Alert>
        )}

        {coachingPaid && (
          <Alert variant="ok">
            <p className="font-semibold">Payment confirmed. Your coaching session is booked.</p>
            <p className="mt-0.5">Your coach will review your request and accept shortly. You will get an email once it is confirmed.</p>
          </Alert>
        )}

        {gaps.length > 0 && (
          <section aria-labelledby="setup-heading" className="card card-pad">
            <h2 id="setup-heading" className="h3">Finish setting up</h2>
            <ul className="mt-3 divide-y divide-rule">
              {gaps.map((g) => (
                <li key={g.label} className="flex flex-col gap-3 py-3 sm:flex-row sm:items-center sm:justify-between">
                  <p className="text-sm leading-snug text-ink-soft">{g.label}</p>
                  <Link href={g.href} className="btn-secondary btn-sm shrink-0 self-start sm:self-auto">{g.cta}</Link>
                </li>
              ))}
            </ul>
          </section>
        )}

        {/* Headline numbers */}
        <section aria-label="Your applications at a glance" className="grid grid-cols-3 gap-3 sm:gap-4">
          {[
            { label: "Active", value: activeApps },
            { label: "Submitted", value: submitted },
            { label: "Won", value: won },
          ].map(({ label, value }) => (
            <div key={label} className="card card-pad">
              <p className="font-display text-3xl text-ink sm:text-4xl">{value}</p>
              <p className="mt-1 text-sm text-slate">{label}</p>
            </div>
          ))}
        </section>

        {/* Pipeline and deadlines */}
        {total > 0 && (
          <section className="grid grid-cols-1 gap-4 md:grid-cols-2">
            <div className="card card-pad">
              <h2 className="h3">Application pipeline</h2>
              <div className="mt-4 flex h-3 overflow-hidden rounded-full bg-surface-2" role="img" aria-label="Share of saved opportunities by stage">
                {pipeline.map(({ key, bar }) => (
                  <div key={key} className={bar} style={{ width: `${((statusCounts[key] ?? 0) / total) * 100}%` }} />
                ))}
              </div>
              <ul className="mt-4 flex flex-wrap gap-x-5 gap-y-2">
                {pipeline.map(({ key, label, bar }) => (
                  <li key={key} className="flex items-center gap-2 text-sm text-ink-soft">
                    <span className={`h-2.5 w-2.5 rounded-full ${bar}`} aria-hidden="true" />
                    {label}
                    <span className="font-semibold text-ink">{statusCounts[key]}</span>
                  </li>
                ))}
              </ul>
            </div>

            <div className="card card-pad">
              <h2 className="h3">Upcoming deadlines</h2>
              {urgentDeadlines.length === 0 ? (
                <p className="mt-4 text-sm text-slate">No deadlines in the next 60 days.</p>
              ) : (
                <ul className="mt-4 space-y-3">
                  {urgentDeadlines.map(({ s, opp, days }) => (
                    <li key={s.opportunity} className="flex items-center justify-between gap-3">
                      <Link href={opportunityPath(opp)} className="min-w-0 truncate text-sm font-medium text-ink hover:text-forest">{opp.title}</Link>
                      <span className={`badge shrink-0 ${days <= 7 ? "badge-danger" : days <= 14 ? "badge-warn" : ""}`}>
                        {days === 0 ? "Today" : days === 1 ? "Tomorrow" : `${days} days`}
                      </span>
                    </li>
                  ))}
                </ul>
              )}
              <Link href="/deadlines" className="mt-4 inline-block text-sm font-semibold text-forest hover:underline">View all deadlines</Link>
            </div>
          </section>
        )}

        {/* Readiness */}
        <section aria-label="Scholarship readiness">
          {!user.cvData ? (
            <div className="card card-pad">
              <p className="eyebrow">Scholarship readiness</p>
              <h2 className="mt-2 h3">Upload your CV to unlock your readiness score</h2>
              <p className="mt-2 text-sm text-slate">Your score shows where you stand and what to fix before you apply.</p>
              <Link href="/cv" className="btn-primary mt-4">Upload CV</Link>
            </div>
          ) : readiness ? (
            <ReadinessScoreCard readiness={readiness} onRefresh={refreshReadiness} refreshing={readinessLoading} />
          ) : (
            <div className="card card-pad">
              <p className="eyebrow">Scholarship readiness</p>
              <p className="mb-4 mt-2 text-sm text-ink-soft">Generate your personalised readiness score to see where you stand and what to improve.</p>
              {readinessError && <Alert variant="danger" className="mb-3">{readinessError}</Alert>}
              <button type="button" onClick={loadReadiness} disabled={readinessLoading} aria-busy={readinessLoading} className="btn-primary">
                {readinessLoading ? "Calculating" : "Calculate my score"}
              </button>
            </div>
          )}
        </section>

        {/* Win banner */}
        {awardedOpps.length > 0 && (
          <section className="rounded-xl bg-navy p-6 text-white">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-center">
              <div className="flex-1">
                <Trophy size={28} className="mb-2 text-brass" aria-hidden="true" />
                <h2 className="font-display text-xl">
                  You marked {awardedOpps.length === 1 ? "a scholarship" : `${awardedOpps.length} scholarships`} as won
                </h2>
                <p className="mt-1 text-sm leading-relaxed text-white/80">
                  Share your story on the wins wall. Other students preparing their applications will see it.
                </p>
              </div>
              <Link href="/wins/share" className="inline-flex min-h-touch shrink-0 items-center justify-center rounded-md bg-white px-5 text-sm font-semibold text-navy transition-colors hover:bg-surface-2">
                Share my win
              </Link>
            </div>
          </section>
        )}

        {/* Saved opportunities */}
        <section aria-labelledby="saved-heading">
          <div className="mb-4 flex flex-wrap items-center justify-between gap-x-4 gap-y-1">
            <h2 id="saved-heading" className="h2">Saved opportunities</h2>
            <Link href="/deadlines" className="text-sm font-semibold text-forest hover:underline">View deadlines</Link>
          </div>

          {error && <Alert variant="danger" className="mb-4">{error}</Alert>}

          {user.savedOpportunities.length === 0 ? (
            <EmptyState
              icon={Bookmark}
              title="Nothing saved yet"
              description="Save opportunities you like and they will appear here with their deadlines and status."
              action={<Link href="/" className="btn-primary">Browse opportunities</Link>}
            />
          ) : (
            <ul className="space-y-3">
              {user.savedOpportunities.map((s: SavedOpportunity) => {
                const opp = details[s.opportunity];
                const days = opp?.deadline ? Math.ceil((new Date(opp.deadline).getTime() - Date.now()) / 86400000) : null;
                const urgent = days !== null && days >= 0 && days <= 14;
                return (
                  <li key={s.opportunity} className="card card-pad flex flex-col gap-4 sm:flex-row sm:items-center">
                    <div className="min-w-0 flex-1">
                      {opp ? (
                        <Link href={opportunityPath(opp)} className="font-display text-lg text-ink transition-colors hover:text-forest">
                          {opp.title}
                        </Link>
                      ) : (
                        <Skeleton className="h-6 w-56 max-w-full" />
                      )}
                      {opp?.provider && <p className="mt-0.5 text-sm text-slate">{opp.provider}</p>}
                      {opp?.deadline && days !== null && (
                        <p className={`mt-1 text-sm ${urgent ? "font-semibold text-warn" : "text-slate"}`}>
                          {urgent && days <= 3
                            ? days === 0 ? "Closes today" : `${days} days left`
                            : `Due ${new Date(opp.deadline).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" })}`}
                        </p>
                      )}
                    </div>

                    <div className="flex flex-wrap items-center gap-2">
                      <label className="sr-only" htmlFor={`status-${s.opportunity}`}>Status</label>
                      <select
                        id={`status-${s.opportunity}`}
                        value={s.status}
                        onChange={(e) => updateStatus(s.opportunity, e.target.value)}
                        className="input w-auto"
                      >
                        {Object.entries(STATUS_LABELS).map(([value, label]) => (
                          <option key={value} value={value}>{label}</option>
                        ))}
                      </select>
                      <Link href={`/applications/${s.opportunity}`} className="btn-secondary btn-sm">Open coaching</Link>
                      <Link href={`/interview?opportunity=${s.opportunity}`} className="btn-ghost btn-sm">Practice interview</Link>
                      <button type="button" onClick={() => removeSaved(s.opportunity)} className="btn-ghost btn-sm text-danger hover:text-danger">
                        Remove
                      </button>
                    </div>
                  </li>
                );
              })}
            </ul>
          )}
        </section>

        {/* Tools */}
        <section aria-labelledby="tools-heading">
          <h2 id="tools-heading" className="h2 mb-4">Your tools</h2>
          <ul className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {FEATURE_CARDS.map(({ href, Icon, label, desc, pro }) => (
              <li key={href}>
                <Link href={href} className="card-interactive flex h-full flex-col gap-3 p-5">
                  <div className="flex items-start justify-between">
                    <Icon size={24} className="text-forest" aria-hidden="true" />
                    {pro && !isPro && <span className="badge badge-brand">Pro</span>}
                  </div>
                  <div>
                    <p className="font-display text-lg text-ink">{label}</p>
                    <p className="mt-1 text-sm text-slate">{desc}</p>
                  </div>
                </Link>
              </li>
            ))}
          </ul>
        </section>

        <ReferralCard />
      </div>
    </div>
  );
}

export default function DashboardPage() {
  return (
    <Suspense fallback={<DashboardSkeleton />}>
      <DashboardContent />
    </Suspense>
  );
}
