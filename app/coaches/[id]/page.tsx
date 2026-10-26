"use client";

import { useState, useEffect } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { api, ApiError } from "@/lib/api";
import { useAuth } from "@/lib/auth-context";
import { HumanCoach } from "@/lib/types";
import { ExternalLink, Star } from "lucide-react";
import { SkeletonPage } from "@/components/ui/Skeleton";
import { EmptyState } from "@/components/ui/States";

function StarRating({ rating, count }: { rating: number; count?: number }) {
  return (
    <span className="flex items-center gap-2" role="img" aria-label={`Rated ${rating.toFixed(1)} out of 5`}>
      <span className="flex gap-0.5" aria-hidden="true">
        {[1, 2, 3, 4, 5].map((s) => (
          <Star key={s} size={18} className={s <= Math.round(rating) ? "fill-brass text-warn" : "text-control"} />
        ))}
      </span>
      <span className="text-sm text-slate">
        {rating.toFixed(1)}
        {count !== undefined ? ` · ${count} session${count !== 1 ? "s" : ""}` : ""}
      </span>
    </span>
  );
}

export default function CoachPublicProfilePage() {
  const { id } = useParams<{ id: string }>();
  const { user } = useAuth();

  const [coach, setCoach] = useState<HumanCoach | null>(null);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);


  useEffect(() => {
    if (!id) return;
    api.get<{ coach: HumanCoach }>(`/coaches/${id}`)
      .then((d) => setCoach(d.coach))
      .catch((err) => {
        if (err instanceof ApiError && err.status === 404) setNotFound(true);
      })
      .finally(() => setLoading(false));
  }, [id]);

  if (loading) return <SkeletonPage variant="detail" />;

  if (notFound || !coach) {
    return (
      <div className="page-narrow">
        <EmptyState
          title="Coach not found"
          description="This profile may have been removed or is no longer active."
          action={<Link href="/" className="btn-primary">Back to catalogue</Link>}
        />
      </div>
    );
  }

  const totalStudents = coach.totalSessions;
  const isOwnProfile = user?.isCoach;
  const firstName = coach.name.split(" ")[0];
  const bookHref = user ? `/coaches/${id}/book` : `/login?next=/coaches/${id}/book`;

  return (
    <div className="page-narrow">
      {/* Header */}
      <div className="card card-pad mb-8 flex flex-col gap-6 sm:flex-row sm:items-start">
        {coach.photoUrl ? (
          <img src={coach.photoUrl} alt={coach.name} width={96} height={96} className="h-24 w-24 shrink-0 rounded-full object-cover" />
        ) : (
          <div className="flex h-24 w-24 shrink-0 items-center justify-center rounded-full bg-surface-2 font-display text-3xl text-slate">
            {coach.name[0]}
          </div>
        )}

        <div className="min-w-0 flex-1">
          <p className="eyebrow mb-1">
            {coach.credential === "alumni" ? "Scholarship alumnus" : "Selection panel member"}
            {coach.credentialYear ? ` · ${coach.credentialYear}` : ""}
          </p>
          <h1 className="h1">{coach.name}</h1>

          <div className="mt-3 flex flex-wrap items-center gap-4">
            {coach.averageRating ? (
              <StarRating rating={coach.averageRating} count={totalStudents} />
            ) : (
              <span className="text-sm text-slate">
                {totalStudents > 0 ? `${totalStudents} session${totalStudents !== 1 ? "s" : ""}` : "New coach"}
              </span>
            )}
            {coach.linkedIn && (
              <a href={coach.linkedIn} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 text-sm font-semibold text-forest hover:underline">
                LinkedIn
                <ExternalLink size={14} aria-hidden="true" />
              </a>
            )}
          </div>
        </div>

        <div className="shrink-0 sm:text-right">
          <p className="font-display text-3xl text-ink">${coach.sessionFeeUSD}</p>
          <p className="mb-4 mt-0.5 text-sm text-slate">per session, plus platform fee</p>
          {!isOwnProfile && (
            <Link href={bookHref} className="btn-primary btn-block sm:w-auto">
              Book a session
            </Link>
          )}
          {isOwnProfile && (
            <Link href="/coaches/dashboard" className="btn-secondary btn-block sm:w-auto">
              Your dashboard
            </Link>
          )}
        </div>
      </div>

      {/* Bio */}
      <section className="mb-10" aria-labelledby="bio-heading">
        <h2 id="bio-heading" className="h3 mb-3">About {firstName}</h2>
        <p className="max-w-prose whitespace-pre-line leading-relaxed text-ink">{coach.bio}</p>
      </section>

      {/* Scholarships */}
      {coach.scholarships.length > 0 && (
        <section className="mb-10" aria-labelledby="schol-heading">
          <h2 id="schol-heading" className="h3 mb-3">Coaches for these scholarships</h2>
          <ul className="flex flex-wrap gap-2">
            {coach.scholarships.map((s) => (
              <li key={s.opportunityId}>
                <Link
                  href={`/opportunities/${s.opportunityId}`}
                  className="inline-flex min-h-touch items-center rounded-full bg-white px-4 text-sm font-medium text-ink-soft ring-1 ring-inset ring-control transition-colors hover:bg-surface-2 hover:text-forest"
                >
                  {s.opportunityTitle}
                </Link>
              </li>
            ))}
          </ul>
        </section>
      )}

      {/* Session types */}
      <section className="mb-10" aria-labelledby="get-heading">
        <h2 id="get-heading" className="h3 mb-3">What you get</h2>
        <ul className="grid gap-4 sm:grid-cols-2">
          {[
            {
              type: "Strategy coaching",
              desc: "A focused session on your application strategy and positioning: what the committee is looking for, and how to close gaps in your profile.",
            },
            {
              type: "Document review",
              desc: "Detailed feedback on your essays, personal statement or supporting documents. Written notes delivered after the session.",
            },
          ].map(({ type, desc }) => (
            <li key={type} className="card card-pad">
              <p className="mb-1 font-semibold text-ink">{type}</p>
              <p className="text-sm leading-relaxed text-ink-soft">{desc}</p>
            </li>
          ))}
        </ul>
      </section>

      {/* Book CTA */}
      {!isOwnProfile && (
        <section className="card card-pad flex flex-col items-start gap-4 sm:flex-row sm:items-center">
          <div className="flex-1">
            <p className="font-semibold text-ink">Ready to work with {firstName}?</p>
            <p className="mt-0.5 text-sm text-slate">${coach.sessionFeeUSD} per session · usually responds within 48 hours</p>
          </div>
          <Link href={bookHref} className="btn-primary shrink-0">
            Book a session
          </Link>
        </section>
      )}

    </div>
  );
}
