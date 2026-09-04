"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { api, ApiError } from "@/lib/api";
import { useAuth } from "@/lib/auth-context";
import { Opportunity, SavedOpportunity } from "@/lib/types";

interface DeadlineEntry {
  saved: SavedOpportunity;
  opportunity: Opportunity;
  daysUntil: number | null;
}

const ALL_STATUSES: SavedOpportunity["status"][] = [
  "interested", "in_progress", "submitted", "awarded", "rejected", "withdrawn",
];

function urgencyClass(days: number | null): string {
  if (days === null) return "text-slate";
  if (days < 0) return "text-slate line-through";
  if (days <= 7) return "text-alert font-medium";
  if (days <= 30) return "text-brass font-medium";
  return "text-ink-soft";
}

function urgencyLabel(days: number | null): string {
  if (days === null) return "No deadline";
  if (days < 0) return "Closed";
  if (days === 0) return "Due today";
  if (days === 1) return "Due tomorrow";
  return `${days} days left`;
}

const STATUS_LABELS: Record<string, string> = {
  interested: "Interested",
  in_progress: "In progress",
  submitted: "Submitted",
  awarded: "Awarded",
  rejected: "Rejected",
  withdrawn: "Withdrawn",
};

export default function DeadlinesPage() {
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();
  const [entries, setEntries] = useState<DeadlineEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [updatingId, setUpdatingId] = useState<string | null>(null);

  useEffect(() => {
    if (!authLoading && !user) router.push("/login");
  }, [authLoading, user, router]);

  useEffect(() => {
    if (!user || user.savedOpportunities.length === 0) {
      setLoading(false);
      return;
    }

    async function load() {
      try {
        const ids = user!.savedOpportunities.map((s) => s.opportunity).join(",");
        const { opportunities } = await api.get<{ opportunities: Opportunity[] }>(
          `/opportunities/batch?ids=${ids}`
        );
        const oppMap = new Map(opportunities.map((o) => [o._id, o]));

        const results: DeadlineEntry[] = user!.savedOpportunities.map((s) => {
          const opportunity = oppMap.get(s.opportunity);
          if (!opportunity) return null;
          const deadline = opportunity.deadline;
          const daysUntil = deadline
            ? Math.ceil((new Date(deadline).getTime() - Date.now()) / (1000 * 60 * 60 * 24))
            : null;
          return { saved: s, opportunity, daysUntil };
        }).filter(Boolean) as DeadlineEntry[];

        const sorted = results.sort((a, b) => {
          if (a.daysUntil === null && b.daysUntil === null) return 0;
          if (a.daysUntil === null) return 1;
          if (b.daysUntil === null) return -1;
          return a.daysUntil - b.daysUntil;
        });

        setEntries(sorted);
      } catch (err) {
        setError(err instanceof ApiError ? err.message : "Couldn't load deadlines.");
      } finally {
        setLoading(false);
      }
    }

    load();
  }, [user]);

  async function updateStatus(opportunityId: string, status: SavedOpportunity["status"]) {
    setUpdatingId(opportunityId);
    try {
      await api.patch(`/opportunities/${opportunityId}/save`, { status });
      setEntries((prev) =>
        prev.map((e) =>
          e.saved.opportunity === opportunityId
            ? { ...e, saved: { ...e.saved, status } }
            : e
        )
      );
    } catch {
      // silently ignore — UI will revert on next load
    } finally {
      setUpdatingId(null);
    }
  }

  if (authLoading || loading) {
    return <p className="max-w-3xl mx-auto px-6 py-20 text-slate font-mono text-sm">Loading deadlines…</p>;
  }

  if (!user) return null;

  const upcoming = entries.filter((e) => e.daysUntil !== null && e.daysUntil >= 0 && e.saved.status !== "submitted" && e.saved.status !== "withdrawn");
  const submitted = entries.filter((e) => e.saved.status === "submitted");
  const closed = entries.filter((e) => e.daysUntil !== null && e.daysUntil < 0 && e.saved.status !== "submitted");
  const noDeadline = entries.filter((e) => e.daysUntil === null && e.saved.status !== "submitted");

  return (
    <div className="max-w-3xl mx-auto px-6 py-14">
      <p className="font-mono text-xs tracking-widest uppercase text-slate">Your Calendar</p>
      <h1 className="font-display text-4xl text-ink mt-1 mb-2">Deadlines</h1>
      <p className="text-ink-soft mb-10">
        Every deadline for every opportunity you're tracking, sorted by urgency.
      </p>

      {error && <p className="text-alert text-sm mb-6">{error}</p>}

      {entries.length === 0 ? (
        <div className="case-card p-8 text-center">
          <p className="text-ink-soft">No opportunities saved yet.</p>
          <Link href="/" className="inline-block mt-3 text-forest underline text-sm">
            Browse the catalogue →
          </Link>
        </div>
      ) : (
        <>
          {upcoming.length > 0 && (
            <Section title="Upcoming" entries={upcoming} showUrgency onUpdateStatus={updateStatus} updatingId={updatingId} />
          )}
          {submitted.length > 0 && (
            <Section title="Submitted" entries={submitted} onUpdateStatus={updateStatus} updatingId={updatingId} />
          )}
          {closed.length > 0 && (
            <Section title="Closed" entries={closed} onUpdateStatus={updateStatus} updatingId={updatingId} />
          )}
          {noDeadline.length > 0 && (
            <Section title="No deadline listed" entries={noDeadline} onUpdateStatus={updateStatus} updatingId={updatingId} />
          )}
        </>
      )}
    </div>
  );
}

function Section({
  title,
  entries,
  showUrgency,
  onUpdateStatus,
  updatingId,
}: {
  title: string;
  entries: DeadlineEntry[];
  showUrgency?: boolean;
  onUpdateStatus: (id: string, status: SavedOpportunity["status"]) => void;
  updatingId: string | null;
}) {
  return (
    <div className="mb-10">
      <h2 className="font-mono text-xs tracking-widest uppercase text-slate mb-4">{title}</h2>
      <div className="space-y-3">
        {entries.map(({ saved, opportunity, daysUntil }) => (
          <div key={saved.opportunity} className="case-card p-5 flex flex-col gap-3">
            <div className="flex flex-col sm:flex-row sm:items-start gap-4">
              <div className="flex-1">
                <Link href={`/opportunities/${saved.opportunity}`} className="font-display text-lg text-ink hover:text-forest transition-colors">
                  {opportunity.title}
                </Link>
                <p className="text-sm text-slate mt-0.5">{opportunity.provider} · {opportunity.country}</p>
                {opportunity.deadline && (
                  <p className="font-mono text-xs mt-1.5">
                    <span className={urgencyClass(daysUntil)}>
                      {new Date(opportunity.deadline).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" })}
                    </span>
                    {showUrgency && daysUntil !== null && daysUntil >= 0 && (
                      <span className={`ml-2 ${urgencyClass(daysUntil)}`}>({urgencyLabel(daysUntil)})</span>
                    )}
                  </p>
                )}
              </div>
              <div className="flex items-center gap-3 shrink-0">
                <Link href={`/applications/${saved.opportunity}`} className="text-sm text-forest underline whitespace-nowrap">
                  Coaching
                </Link>
                <Link href={`/interview?opportunity=${saved.opportunity}`} className="text-sm text-slate hover:text-ink whitespace-nowrap">
                  Practice
                </Link>
              </div>
            </div>
            {/* Inline status updater */}
            <div className="flex flex-wrap gap-1.5 pt-1 border-t border-rule">
              {ALL_STATUSES.map((s) => (
                <button
                  key={s}
                  type="button"
                  disabled={updatingId === saved.opportunity}
                  onClick={() => onUpdateStatus(saved.opportunity, s)}
                  className={`text-xs px-2.5 py-1 rounded-full border transition-colors ${
                    saved.status === s
                      ? "bg-forest text-white border-forest"
                      : "border-rule text-slate hover:border-forest hover:text-forest"
                  }`}
                >
                  {STATUS_LABELS[s]}
                </button>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
