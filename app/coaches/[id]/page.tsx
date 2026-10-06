"use client";

import { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { api, ApiError } from "@/lib/api";
import { useAuth } from "@/lib/auth-context";
import { HumanCoach } from "@/lib/types";
import { CircleCheck, ExternalLink, Star } from "lucide-react";
import { SkeletonPage } from "@/components/ui/Skeleton";
import { Alert, EmptyState } from "@/components/ui/States";
import { Modal } from "@/components/ui/Modal";

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
  const router = useRouter();

  const [coach, setCoach] = useState<HumanCoach | null>(null);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);

  // Booking modal state
  const [bookingOppId, setBookingOppId] = useState("");
  const [sessionType, setSessionType] = useState<"coaching" | "review">("coaching");
  const [userMessage, setUserMessage] = useState("");
  const [booking, setBooking] = useState(false);
  const [bookingError, setBookingError] = useState<string | null>(null);
  const [bookingDone, setBookingDone] = useState(false);
  const [showModal, setShowModal] = useState(false);

  useEffect(() => {
    if (!id) return;
    api.get<{ coach: HumanCoach }>(`/coaches/${id}`)
      .then((d) => setCoach(d.coach))
      .catch((err) => {
        if (err instanceof ApiError && err.status === 404) setNotFound(true);
      })
      .finally(() => setLoading(false));
  }, [id]);

  async function handleBook(e: React.FormEvent) {
    e.preventDefault();
    if (!user) { router.push(`/login?next=/coaches/${id}`); return; }
    if (!bookingOppId) { setBookingError("Select a scholarship to get coaching for."); return; }
    setBooking(true);
    setBookingError(null);
    try {
      const { paymentUrl } = await api.post<{ booking: any; paymentUrl: string | null }>("/coaches/bookings", {
        coachId: id,
        opportunityId: bookingOppId,
        sessionType,
        userMessage: userMessage.trim() || undefined,
      });
      if (paymentUrl) {
        window.location.href = paymentUrl;
      } else {
        // dev fallback — no Stripe configured
        setBookingDone(true);
      }
    } catch (err) {
      setBookingError(err instanceof ApiError ? err.message : "Booking failed. Please try again.");
      setBooking(false);
    }
  }

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
  const openBooking = () => { setShowModal(true); setBookingDone(false); setBookingError(null); };

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
            <button type="button" onClick={openBooking} className="btn-primary btn-block sm:w-auto">
              Book a session
            </button>
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
          <button type="button" onClick={openBooking} className="btn-primary shrink-0">
            Book a session
          </button>
        </section>
      )}

      {/* Booking dialog */}
      <Modal open={showModal} onClose={() => setShowModal(false)} title={bookingDone ? "Booking requested" : `Book with ${firstName}`}>
        {bookingDone ? (
          <div className="py-2 text-center">
            <span className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-ok-soft text-ok">
              <CircleCheck size={24} aria-hidden="true" />
            </span>
            <p className="mb-6 text-sm text-ink-soft">
              {firstName} will review your request and confirm the session. You will get an email once they respond.
            </p>
            <button type="button" onClick={() => setShowModal(false)} className="btn-primary btn-block">
              Done
            </button>
          </div>
        ) : (
          <form onSubmit={handleBook} className="space-y-4">
            <div>
              <label htmlFor="bk-opp" className="label">Which scholarship is this for?</label>
              <select id="bk-opp" required value={bookingOppId} onChange={(e) => setBookingOppId(e.target.value)} className="input">
                <option value="">Select a scholarship</option>
                {coach.scholarships.map((s) => (
                  <option key={s.opportunityId} value={s.opportunityId}>{s.opportunityTitle}</option>
                ))}
              </select>
            </div>

            <fieldset>
              <legend className="label">Session type</legend>
              <div className="flex flex-col gap-2 sm:flex-row" role="radiogroup">
                {(["coaching", "review"] as const).map((t) => {
                  const selected = sessionType === t;
                  return (
                    <button
                      key={t}
                      type="button"
                      role="radio"
                      aria-checked={selected}
                      onClick={() => setSessionType(t)}
                      className={`min-h-touch flex-1 rounded-xl px-4 py-3 text-left text-sm transition-colors ${
                        selected ? "bg-forest-soft ring-2 ring-forest" : "bg-white ring-1 ring-inset ring-control hover:bg-surface-2"
                      }`}
                    >
                      <span className="block font-semibold text-ink">{t === "coaching" ? "Strategy coaching" : "Document review"}</span>
                      <span className="mt-0.5 block text-sm text-slate">
                        {t === "coaching" ? "Live session on strategy and positioning" : "Written feedback on your drafts"}
                      </span>
                    </button>
                  );
                })}
              </div>
            </fieldset>

            <div>
              <label htmlFor="bk-msg" className="label">
                Message <span className="font-normal text-slate">(optional)</span>
              </label>
              <textarea
                id="bk-msg"
                rows={3}
                value={userMessage}
                onChange={(e) => setUserMessage(e.target.value)}
                placeholder="Briefly describe where you are in your application and what you need most help with."
                className="textarea"
              />
            </div>

            <div className="flex items-center justify-between border-t border-rule py-3 text-sm">
              <span className="text-slate">Total (including platform fee)</span>
              <span className="font-semibold text-ink">${(coach.sessionFeeUSD * (1 + coach.platformFeePercent / 100)).toFixed(0)} USD</span>
            </div>

            {bookingError && <Alert variant="danger">{bookingError}</Alert>}

            <button type="submit" disabled={booking} aria-busy={booking} className="btn-primary btn-block">
              {booking ? "Sending request" : "Send booking request"}
            </button>

            {!user && <p className="text-center text-sm text-slate">You will be asked to sign in before confirming.</p>}
          </form>
        )}
      </Modal>
    </div>
  );
}
