"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { api, ApiError } from "@/lib/api";
import { useAuth } from "@/lib/auth-context";
import { Opportunity, SavedOpportunity, ReadinessScore } from "@/lib/types";
import ReadinessScoreCard from "@/components/ReadinessScoreCard";

const STATUS_LABELS: Record<string, string> = {
  interested: "Interested",
  in_progress: "In progress",
  submitted: "Submitted",
  awarded: "Awarded",
  rejected: "Rejected",
  withdrawn: "Withdrawn",
};

const FEATURE_CARDS = [
  { href: "/mentor", icon: "💬", label: "Mentor", desc: "Ask anything, get a specific answer", pro: false },
  { href: "/roadmap", icon: "🗺️", label: "My Roadmap", desc: "Your week-by-week scholarship plan", pro: true },
  { href: "/deadlines", icon: "📅", label: "Deadlines", desc: "All your upcoming submission dates", pro: false },
  { href: "/countries", icon: "🌍", label: "Country Guides", desc: "Sweden, UK, Germany and more", pro: false },
  { href: "/interview", icon: "🎤", label: "Mock Interview", desc: "Practice with detailed feedback", pro: true },
];

export default function DashboardPage() {
  const { user, loading: authLoading, refreshUser } = useAuth();
  const router = useRouter();

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

  if (authLoading || loading) {
    return <p className="max-w-5xl mx-auto px-6 py-20 text-slate font-mono text-sm">Loading your dashboard…</p>;
  }

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

  return (
    <div className="max-w-5xl mx-auto px-6 py-14">
      {/* Trial countdown banner */}
      {isTrialing && trialDaysLeft !== null && (
        <div className="mb-6 flex flex-col sm:flex-row sm:items-center justify-between gap-3 px-5 py-4 border border-rule bg-white rounded-lg">
          <div>
            <p className="text-sm font-medium text-ink" style={{ color: trialDaysLeft <= 2 ? "#d3622c" : undefined }}>
              {trialDaysLeft === 0
                ? "Your free trial ends today"
                : trialDaysLeft === 1
                  ? "1 day left on your free trial"
                  : `${trialDaysLeft} days left on your free trial`}
            </p>
            <p className="text-xs text-slate mt-0.5">
              After the trial, you'll be charged {user.subscription.gateway === "paystack" ? "via Paystack" : "$7/month or $55/year"} — or you can cancel anytime before it ends.
            </p>
          </div>
          <a href="/pricing" className="shrink-0 text-xs font-mono text-ink-soft border border-rule px-4 py-2 hover:border-ink transition-colors whitespace-nowrap">
            Manage subscription →
          </a>
        </div>
      )}

      <div className="mb-10">
        <h1 className="font-display text-4xl text-ink">
          Welcome back, {user.fullName.split(" ")[0]}
        </h1>
      </div>

      {/* Profile completion nudges */}
      {(() => {
        const gaps: { label: string; href: string; cta: string }[] = [];
        if (!user.cvData) gaps.push({ label: "Upload your CV to unlock personalised matching, readiness scoring, and tailored coaching.", href: "/cv", cta: "Upload CV →" });
        if (!user.profile?.targetCountries?.length) gaps.push({ label: "Add target countries so we can prioritise scholarships from where you want to study.", href: "/profile", cta: "Set countries →" });
        if (!user.profile?.targetFields?.length) gaps.push({ label: "Add your fields of study so recommendations match what you actually want to pursue.", href: "/profile", cta: "Add fields →" });
        if (gaps.length === 0) return null;
        return (
          <div className="mb-8 space-y-2">
            {gaps.map((g) => (
              <div key={g.href} className="flex items-center justify-between gap-4 px-5 py-3 border border-rule rounded-lg bg-white">
                <p className="text-sm text-ink-soft leading-snug">{g.label}</p>
                <Link href={g.href} className="shrink-0 font-mono text-xs text-forest hover:underline whitespace-nowrap">{g.cta}</Link>
              </div>
            ))}
          </div>
        );
      })()}

      {/* Stats — minimal, no card border needed; numerals do the work */}
      <div className="grid grid-cols-3 divide-x divide-rule mb-12 border border-rule rounded-lg overflow-hidden">
        {[
          { label: "Active", value: activeApps },
          { label: "Submitted", value: submitted },
          { label: "Won", value: won },
        ].map(({ label, value }) => (
          <div key={label} className="px-6 py-5 bg-white">
            <p className="font-display text-4xl text-ink">{value}</p>
            <p className="text-xs text-slate font-mono mt-1.5 uppercase tracking-widest">{label}</p>
          </div>
        ))}
      </div>

      {/* Feature shortcuts — bento: [8][4] | [4][4][4] on 12-col */}
      <div className="grid grid-cols-12 gap-3 mb-12">
        {FEATURE_CARDS.map(({ href, icon, label, desc, pro }, i) => (
          <Link
            key={href}
            href={href}
            className={`case-card-interactive flex flex-col gap-3 ${i === 0 ? "col-span-12 sm:col-span-8 p-7" :
              i === 1 ? "col-span-12 sm:col-span-4 p-5" :
                "col-span-12 sm:col-span-4 p-5"
              }`}
          >
            <div className="flex items-start justify-between">
              <span className={i === 0 ? "text-3xl" : "text-2xl"}>{icon}</span>
              {pro && !isPro && (
                <span className="font-mono text-xs text-slate border border-rule px-1.5 py-0.5 rounded">Pro</span>
              )}
            </div>
            <div>
              <p className={`font-display text-ink ${i === 0 ? "text-xl" : "text-base"}`}>{label}</p>
              <p className="text-xs text-slate mt-1 leading-snug">{desc}</p>
            </div>
          </Link>
        ))}
      </div>

      {/* Readiness Score */}
      <div className="mb-10">
        {!user.cvData ? (
          <div className="case-card p-6">
            <p className="font-mono text-xs tracking-widest uppercase text-slate mb-2">Scholarship Readiness</p>
            <p className="text-ink font-display text-xl">Upload your CV to unlock your readiness score</p>
            <p className="text-ink-soft text-sm mt-2">
              Your score tells you exactly where you stand and what to fix before applying.
            </p>
            <Link href="/cv" className="btn-primary inline-flex mt-4">
              Upload CV →
            </Link>
          </div>
        ) : readiness ? (
          <ReadinessScoreCard readiness={readiness} onRefresh={refreshReadiness} refreshing={readinessLoading} />
        ) : (
          <div className="case-card p-6">
            <p className="font-mono text-xs tracking-widest uppercase text-slate mb-2">Scholarship Readiness</p>
            <p className="text-ink-soft text-sm mb-4">Generate your personalised readiness score to see exactly where you stand and what to improve.</p>
            {readinessError && <p className="text-alert text-sm mb-3">{readinessError}</p>}
            <button
              onClick={loadReadiness}
              disabled={readinessLoading}
              className="btn-primary"
            >
              {readinessLoading ? "Calculating…" : "Calculate my score"}
            </button>
          </div>
        )}
      </div>

      {/* Share your win */}
      {awardedOpps.length > 0 && (
        <div className="mb-10 case-card p-6" style={{ background: "#6d8ec5", border: "none" }}>
          <div className="flex flex-col sm:flex-row sm:items-center gap-4">
            <div className="flex-1">
              <p className="text-2xl mb-1">🏆</p>
              <p className="font-display text-xl text-white">
                You marked {awardedOpps.length === 1 ? "a scholarship" : `${awardedOpps.length} scholarships`} as won — celebrate it
              </p>
              <p className="text-white/60 text-sm mt-1 leading-relaxed">
                Share your story on the Apexli wins wall. Other students preparing their applications will see it — and it might be the thing that keeps someone going.
              </p>
            </div>
            <a
              href="/wins/share"
              className="shrink-0 inline-flex items-center gap-2 px-5 py-2.5 text-sm font-medium text-navy bg-white hover:bg-surface transition-colors"
            >
              Share my win →
            </a>
          </div>
        </div>
      )}

      {/* Case Files */}
      <div>
        <div className="flex items-center justify-between mb-4">
          <h2 className="font-display text-2xl text-ink">Case Files</h2>
          <Link href="/deadlines" className="text-sm text-forest font-mono hover:underline">
            View deadlines →
          </Link>
        </div>

        {error && <p className="text-alert text-sm mb-4">{error}</p>}

        {user.savedOpportunities.length === 0 ? (
          <div className="case-card p-8 text-center">
            <p className="text-ink-soft">You haven't saved any opportunities yet.</p>
            <Link href="/" className="inline-block mt-3 text-forest underline text-sm">
              Browse the catalogue →
            </Link>
          </div>
        ) : (
          <div className="space-y-3">
            {user.savedOpportunities.map((s: SavedOpportunity) => {
              const opp = details[s.opportunity];
              return (
                <div key={s.opportunity} className="case-card p-5 flex flex-col sm:flex-row sm:items-center gap-4">
                  <div className="flex-1">
                    <Link href={`/opportunities/${s.opportunity}`} className="font-display text-lg text-ink hover:text-forest transition-colors">
                      {opp?.title || "Loading…"}
                    </Link>
                    <p className="text-sm text-slate mt-0.5">{opp?.provider}</p>
                    {opp?.deadline && (() => {
                      const ms = new Date(opp.deadline).getTime() - Date.now();
                      const days = Math.ceil(ms / 86400000);
                      const urgent = days >= 0 && days <= 14;
                      return (
                        <p className="font-mono text-xs mt-1" style={{ color: urgent ? "#d3622c" : "#94a3b8" }}>
                          {urgent && days <= 3
                            ? days === 0 ? "Closes today" : `${days}d left`
                            : `Due ${new Date(opp.deadline).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" })}`}
                        </p>
                      );
                    })()}
                  </div>

                  <div className="flex items-center gap-3 flex-wrap">
                    <select
                      value={s.status}
                      onChange={(e) => updateStatus(s.opportunity, e.target.value)}
                      className="input w-auto text-sm py-1.5"
                    >
                      {Object.entries(STATUS_LABELS).map(([value, label]) => (
                        <option key={value} value={value}>{label}</option>
                      ))}
                    </select>
                    <Link href={`/applications/${s.opportunity}`} className="text-sm text-forest underline whitespace-nowrap">
                      Open coaching
                    </Link>
                    <Link href={`/interview?opportunity=${s.opportunity}`} className="text-sm text-slate hover:text-ink whitespace-nowrap">
                      Practice interview
                    </Link>
                    <button onClick={() => removeSaved(s.opportunity)} className="text-sm text-alert whitespace-nowrap">
                      Remove
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
