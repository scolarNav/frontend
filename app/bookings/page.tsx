"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { api, ApiError } from "@/lib/api";
import { useAuth } from "@/lib/auth-context";
import { CoachingBooking, HumanCoach } from "@/lib/types";
import { Star, Video } from "lucide-react";
import { PageHeader } from "@/components/ui/PageHeader";
import { SkeletonPage } from "@/components/ui/Skeleton";
import { Alert, EmptyState } from "@/components/ui/States";
import { opportunityPath } from "@/lib/paths";

type PopulatedBooking = Omit<CoachingBooking, "coachId" | "opportunityId"> & {
  coachId: HumanCoach | null;
  opportunityId?: { _id: string; title: string; country: string };
};

const STATUS_BADGE: Record<string, string> = {
  requested: "badge-warn",
  accepted: "badge-info",
  completed: "badge-ok",
  cancelled: "badge-danger",
};

const STATUS_LABEL: Record<string, string> = {
  pending_payment: "Pending payment",
  requested: "Requested",
  accepted: "Accepted",
  completed: "Completed",
  cancelled: "Cancelled",
};

export default function BookingsPage() {
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();

  const [bookings, setBookings] = useState<PopulatedBooking[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [rating, setRating] = useState<Record<string, { score: number; comment: string }>>({});
  const [ratingLoading, setRatingLoading] = useState<string | null>(null);
  const [rated, setRated] = useState<Set<string>>(new Set());

  useEffect(() => {
    if (!authLoading && !user) router.push("/login");
  }, [authLoading, user, router]);

  useEffect(() => {
    if (!user) return;
    api
      .get<{ bookings: PopulatedBooking[] }>("/coaches/bookings/mine")
      .then(({ bookings: list }) => {
        setBookings(list);
        const alreadyRated = new Set(list.filter((b) => b.rating).map((b) => b._id));
        setRated(alreadyRated);
      })
      .catch((err) => setError(err instanceof ApiError ? err.message : "Failed to load bookings."))
      .finally(() => setLoading(false));
  }, [user]);

  async function handleRate(bookingId: string) {
    const r = rating[bookingId];
    if (!r || !r.score) return;
    setRatingLoading(bookingId);
    try {
      await api.patch(`/coaches/bookings/${bookingId}/rate`, { rating: r.score, ratingComment: r.comment });
      setRated((prev) => new Set([...prev, bookingId]));
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Failed to submit rating.");
    } finally {
      setRatingLoading(null);
    }
  }

  if (authLoading || loading) return <SkeletonPage variant="list" />;
  if (!user) return null;

  return (
    <div className="page-narrow">
      <PageHeader eyebrow="Human coaching" title="My coaching sessions" />

      {error && <Alert variant="danger" className="mb-5">{error}</Alert>}

      {bookings.length === 0 && (
        <EmptyState
          icon={Video}
          title="No coaching sessions yet"
          description="Book a session with a scholarship alumnus or former panel member from any opportunity page."
          action={<Link href="/" className="btn-primary">Browse scholarships</Link>}
        />
      )}

      <ul className="space-y-5">
        {bookings.map((booking) => {
          const coach = booking.coachId;
          const coachName = coach?.name ?? "Coach no longer available";
          const opp = booking.opportunityId;
          const ratingEntry = rating[booking._id] ?? { score: 0, comment: "" };
          const alreadyRated = rated.has(booking._id) || !!booking.rating;

          return (
            <li key={booking._id} className="card card-pad">
              <div className="flex items-start gap-4">
                {coach?.photoUrl ? (
                  <img src={coach.photoUrl} alt={coachName} width={44} height={44} loading="lazy" className="h-11 w-11 shrink-0 rounded-full object-cover" />
                ) : (
                  <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-surface-2 font-display text-base text-slate">
                    {coachName[0]}
                  </div>
                )}
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <p className="font-semibold text-ink">{coachName}</p>
                    <span className={`badge ${STATUS_BADGE[booking.status] ?? ""}`}>{STATUS_LABEL[booking.status] ?? booking.status}</span>
                  </div>
                  {coach && (
                    <p className="mt-0.5 text-sm text-slate">
                      {coach.credential === "alumni" ? "Scholarship alumnus" : "Panel member"}
                      {coach.credentialYear ? ` · ${coach.credentialYear}` : ""}
                    </p>
                  )}
                  {opp && (
                    <p className="mt-0.5 text-sm text-slate">
                      Scholarship:{" "}
                      <Link href={opportunityPath(opp)} className="font-medium text-forest hover:underline">{opp.title}</Link>
                    </p>
                  )}
                </div>
              </div>

              <dl className="mt-5 grid grid-cols-2 gap-4 text-sm sm:grid-cols-4">
                <div>
                  <dt className="text-slate">Session type</dt>
                  <dd className="mt-0.5 font-medium capitalize text-ink">{booking.sessionType}</dd>
                </div>
                <div>
                  <dt className="text-slate">Amount paid</dt>
                  <dd className="mt-0.5 font-medium text-ink">${booking.totalAmountUSD}</dd>
                </div>
                <div>
                  <dt className="text-slate">Booked</dt>
                  <dd className="mt-0.5 font-medium text-ink">{new Date(booking.createdAt).toLocaleDateString()}</dd>
                </div>
                {booking.scheduledAt && (
                  <div>
                    <dt className="text-slate">Scheduled</dt>
                    <dd className="mt-0.5 font-medium text-ink">{new Date(booking.scheduledAt).toLocaleDateString()}</dd>
                  </div>
                )}
              </dl>

              {booking.userMessage && (
                <div className="mt-4">
                  <p className="text-sm text-slate">Your message</p>
                  <p className="mt-0.5 text-sm italic text-ink-soft">&ldquo;{booking.userMessage}&rdquo;</p>
                </div>
              )}

              {booking.status === "requested" ? (
                <Alert variant="info" className="mt-4">Waiting for the admin to confirm and schedule your session. You will be notified once it is accepted.</Alert>
              ) : booking.status === "accepted" ? (
                <Alert variant="ok" className="mt-4">Your session has been accepted. The coach or admin will contact you to arrange timing.</Alert>
              ) : null}

              {/* Rating */}
              {booking.status === "completed" && (
                <div className="mt-4 border-t border-rule pt-4">
                  {alreadyRated ? (
                    <p className="text-sm text-slate">
                      You rated this session {booking.rating ?? ratingEntry.score} out of 5.
                      {(booking.ratingComment ?? ratingEntry.comment) && ` "${booking.ratingComment ?? ratingEntry.comment}"`}
                    </p>
                  ) : (
                    <div>
                      <p className="mb-1 text-sm font-semibold text-ink">Rate this session</p>
                      <div className="mb-3 flex gap-1" role="radiogroup" aria-label="Rating out of 5">
                        {[1, 2, 3, 4, 5].map((star) => (
                          <button
                            key={star}
                            type="button"
                            role="radio"
                            aria-checked={ratingEntry.score === star}
                            aria-label={`${star} star${star > 1 ? "s" : ""}`}
                            onClick={() => setRating((r) => ({ ...r, [booking._id]: { ...ratingEntry, score: star } }))}
                            className="flex h-11 w-11 items-center justify-center rounded-md transition-colors hover:bg-surface-2"
                          >
                            <Star size={24} aria-hidden="true" className={ratingEntry.score >= star ? "fill-brass text-warn" : "text-control"} />
                          </button>
                        ))}
                      </div>
                      <label htmlFor={`rate-${booking._id}`} className="sr-only">Comment for the coach</label>
                      <textarea
                        id={`rate-${booking._id}`}
                        rows={2}
                        placeholder="Leave a comment for the coach (optional)"
                        value={ratingEntry.comment}
                        onChange={(e) => setRating((r) => ({ ...r, [booking._id]: { ...ratingEntry, comment: e.target.value } }))}
                        className="textarea mb-3 !min-h-0"
                      />
                      <button
                        type="button"
                        onClick={() => handleRate(booking._id)}
                        disabled={!ratingEntry.score || ratingLoading === booking._id}
                        aria-busy={ratingLoading === booking._id}
                        className="btn-primary"
                      >
                        {ratingLoading === booking._id ? "Submitting" : "Submit rating"}
                      </button>
                    </div>
                  )}
                </div>
              )}
            </li>
          );
        })}
      </ul>
    </div>
  );
}
