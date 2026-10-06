"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { api, ApiError } from "@/lib/api";
import { useAuth } from "@/lib/auth-context";
import { Celebration } from "@/lib/types";
import { Trophy } from "lucide-react";
import { EmptyState, ErrorState } from "@/components/ui/States";
import { SkeletonGrid } from "@/components/ui/Skeleton";

const AWARD_LABELS: Record<string, string> = {
  scholarship: "Scholarship",
  study_program: "Study programme",
  fellowship: "Fellowship",
  incubator: "Incubator",
  immigration_pathway: "Visa or pathway",
};

export default function WinsWall({ initial }: { initial: Celebration[] | null }) {
  const { user } = useAuth();
  const [celebrations, setCelebrations] = useState<Celebration[]>(initial ?? []);
  const [loading, setLoading] = useState(!initial);
  const [error, setError] = useState<string | null>(null);

  async function load() {
    setLoading(true);
    setError(null);
    try {
      const { celebrations: data } = await api.get<{ celebrations: Celebration[] }>("/celebrations", { auth: false });
      setCelebrations(data);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Couldn't load the wins wall.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    // The server already rendered the wall; only fetch client-side if that failed.
    if (initial) return;
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [initial]);

  const featured = celebrations.filter((c) => c.isFeatured);
  const regular = celebrations.filter((c) => !c.isFeatured);

  return (
    <div>
      {/* Hero band */}
      <section className="bg-navy px-4 pb-14 pt-14 text-center sm:px-6">
        <div className="mx-auto max-w-2xl">
          <p className="mb-4 text-xs font-semibold uppercase tracking-widest text-brass">The wins wall</p>
          <h1 className="font-display text-4xl leading-tight text-white sm:text-6xl">
            ScolarNav students
            <br />
            who made it
          </h1>
          <p className="mx-auto mt-5 max-w-lg text-base leading-relaxed text-white/80">
            Real people, real wins. Each of them prepared for this, and now they are in.
          </p>
          {user ? (
            <Link href="/wins/share" className="btn-primary mt-8 !bg-brass !text-navy hover:!bg-brass-light">
              Share your win
            </Link>
          ) : (
            <Link href="/register" className="btn-primary mt-8 !bg-white !text-navy hover:!bg-surface-2">
              Join ScolarNav, it is free
            </Link>
          )}
        </div>
      </section>

      <div className="page">
        {loading && <SkeletonGrid count={6} />}
        {error && !loading && <ErrorState title="Could not load the wins wall" message={error} onRetry={load} />}

        {!loading && !error && celebrations.length === 0 && (
          <EmptyState
            icon={Trophy}
            title="No wins shared yet"
            description="Be the first to share your story and show the next student what is possible."
            action={user ? <Link href="/wins/share" className="btn-primary">Share your win</Link> : undefined}
          />
        )}

        {featured.length > 0 && (
          <section className="mb-12" aria-labelledby="featured-heading">
            <h2 id="featured-heading" className="h2 mb-5">Featured</h2>
            <div className="grid gap-4 sm:grid-cols-2">
              {featured.map((c) => (
                <CelebrationCard key={c._id} c={c} featured />
              ))}
            </div>
          </section>
        )}

        {regular.length > 0 && (
          <section aria-labelledby="all-heading">
            {featured.length > 0 && <h2 id="all-heading" className="h2 mb-5">All wins</h2>}
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {regular.map((c) => (
                <CelebrationCard key={c._id} c={c} />
              ))}
            </div>
          </section>
        )}
      </div>
    </div>
  );
}

function CelebrationCard({ c, featured = false }: { c: Celebration; featured?: boolean }) {
  return (
    <article className={`flex flex-col gap-3 rounded-xl p-5 sm:p-6 ${featured ? "bg-navy text-white" : "bg-white"}`}>
      <span className={`badge self-start ${featured ? "!bg-white/15 !text-white" : "badge-brand"}`}>
        {AWARD_LABELS[c.awardType] ?? c.awardType}
      </span>

      <h3 className={`font-display leading-snug ${featured ? "text-xl text-white sm:text-2xl" : "text-lg text-ink"}`}>
        {c.opportunityTitle}
      </h3>
      {c.opportunityProvider && <p className={`text-sm ${featured ? "text-white/80" : "text-slate"}`}>{c.opportunityProvider}</p>}

      <blockquote className={`flex-1 text-base leading-relaxed ${featured ? "text-white/90" : "text-ink-soft"}`}>
        &ldquo;{c.message}&rdquo;
      </blockquote>

      <div className={`flex items-center gap-2.5 border-t pt-3 ${featured ? "border-white/15" : "border-rule"}`}>
        {c.photoUrl ? (
          <img src={c.photoUrl} alt={`Photo of ${c.displayName}`} width={32} height={32} loading="lazy" className="h-8 w-8 shrink-0 rounded-full object-cover" />
        ) : (
          <span className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-sm font-semibold ${featured ? "bg-white/15 text-white" : "bg-forest-soft text-forest"}`}>
            {c.displayName.charAt(0).toUpperCase()}
          </span>
        )}
        <div className="min-w-0">
          <p className={`text-sm font-semibold leading-none ${featured ? "text-white" : "text-ink"}`}>{c.displayName}</p>
          {c.country && <p className={`mt-1 text-sm ${featured ? "text-white/70" : "text-slate"}`}>{c.country}</p>}
        </div>
        <p className={`ml-auto shrink-0 text-sm ${featured ? "text-white/70" : "text-slate"}`}>
          {new Date(c.createdAt).toLocaleDateString("en-GB", { month: "short", year: "numeric" })}
        </p>
      </div>
    </article>
  );
}
