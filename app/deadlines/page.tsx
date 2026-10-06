"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { api, ApiError } from "@/lib/api";
import { useAuth } from "@/lib/auth-context";
import { Opportunity, SavedOpportunity } from "@/lib/types";
import { Alert, EmptyState } from "@/components/ui/States";
import { CalendarDays } from "lucide-react";
import { PageHeader } from "@/components/ui/PageHeader";
import { SkeletonPage } from "@/components/ui/Skeleton";
import { opportunityPath } from "@/lib/paths";

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
  if (days <= 7) return "font-semibold text-danger";
  if (days <= 30) return "font-semibold text-warn";
  return "text-ink-soft";
}

function urgencyBadge(days: number): string {
  if (days <= 7) return "badge-danger";
  if (days <= 30) return "badge-warn";
  return "";
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

  if (authLoading || loading) return <SkeletonPage variant="list" />;

  if (!user) return null;

  const upcoming = entries.filter((e) => e.daysUntil !== null && e.daysUntil >= 0 && e.saved.status !== "submitted" && e.saved.status !== "withdrawn");
  const submitted = entries.filter((e) => e.saved.status === "submitted");
  const closed = entries.filter((e) => e.daysUntil !== null && e.daysUntil < 0 && e.saved.status !== "submitted");
  const noDeadline = entries.filter((e) => e.daysUntil === null && e.saved.status !== "submitted");

  return (
    <div className="page-narrow">
      <PageHeader
        eyebrow="Your calendar"
        title="Deadlines"
        description="Every deadline for every opportunity you are tracking, sorted by urgency."
      />

      {error && <Alert variant="danger" className="mb-6">{error}</Alert>}

      {entries.length === 0 ? (
        <EmptyState
          icon={CalendarDays}
          title="No deadlines to track yet"
          description="Save an opportunity and its deadline will show up here."
          action={<Link href="/" className="btn-primary">Browse opportunities</Link>}
        />
      ) : (
        <div className="space-y-10">
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
        </div>
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
    <section aria-label={title}>
      <h2 className="h3 mb-4">
        {title} <span className="text-base font-normal text-slate">({entries.length})</span>
      </h2>
      <ul className="space-y-3">
        {entries.map(({ saved, opportunity, daysUntil }) => (
          <li key={saved.opportunity} className="card card-pad">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-start">
              <div className="min-w-0 flex-1">
                <Link href={opportunityPath(opportunity)} className="font-display text-lg text-ink transition-colors hover:text-forest">
                  {opportunity.title}
                </Link>
                <p className="mt-0.5 text-sm text-slate">{opportunity.provider} · {opportunity.country}</p>
                {opportunity.deadline && (
                  <p className="mt-2 flex flex-wrap items-center gap-2 text-sm">
                    <span className={urgencyClass(daysUntil)}>
                      {new Date(opportunity.deadline).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" })}
                    </span>
                    {showUrgency && daysUntil !== null && daysUntil >= 0 && (
                      <span className={`badge ${urgencyBadge(daysUntil)}`}>{urgencyLabel(daysUntil)}</span>
                    )}
                  </p>
                )}
              </div>
              <div className="flex shrink-0 items-center gap-2">
                <Link href={`/applications/${saved.opportunity}`} className="btn-secondary btn-sm">Coaching</Link>
                <Link href={`/interview?opportunity=${saved.opportunity}`} className="btn-ghost btn-sm">Practice</Link>
              </div>
            </div>

            <div className="mt-4 border-t border-rule pt-4" role="group" aria-label={`Status of ${opportunity.title}`}>
              <div className="flex flex-wrap gap-2">
                {ALL_STATUSES.map((s) => {
                  const active = saved.status === s;
                  return (
                    <button
                      key={s}
                      type="button"
                      disabled={updatingId === saved.opportunity}
                      onClick={() => onUpdateStatus(saved.opportunity, s)}
                      aria-pressed={active}
                      className={`inline-flex min-h-touch items-center rounded-full px-3.5 text-sm font-medium transition-colors disabled:opacity-60 ${
                        active ? "bg-navy text-white" : "bg-white text-ink-soft ring-1 ring-inset ring-control hover:bg-surface-2"
                      }`}
                    >
                      {STATUS_LABELS[s]}
                    </button>
                  );
                })}
              </div>
            </div>
          </li>
        ))}
      </ul>
    </section>
  );
}
