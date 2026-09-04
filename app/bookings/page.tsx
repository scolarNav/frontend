"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { api, ApiError } from "@/lib/api";
import { useAuth } from "@/lib/auth-context";
import { CoachingBooking, HumanCoach } from "@/lib/types";

type PopulatedBooking = Omit<CoachingBooking, "coachId" | "opportunityId"> & {
  coachId: HumanCoach;
  opportunityId?: { _id: string; title: string; country: string };
};

const STATUS_STYLE: Record<string, string> = {
  requested: "bg-amber-100 text-amber-800",
  accepted: "bg-blue-100 text-blue-800",
  completed: "bg-green-100 text-green-800",
  cancelled: "bg-red-100 text-red-800",
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

  if (authLoading || loading) {
    return <p className="max-w-2xl mx-auto px-6 py-20 text-slate text-sm font-mono">Loading…</p>;
  }
  if (!user) return null;

  return (
    <div className="max-w-2xl mx-auto px-6 py-14">
      <p className="font-mono text-xs tracking-widest uppercase text-brass mb-2">Human Coaching</p>
      <h1 className="font-display text-4xl text-ink mb-8">My coaching sessions</h1>

      {error && (
        <div className="mb-5 p-4 rounded-xl border border-alert bg-alert/5 text-sm text-alert">{error}</div>
      )}

      {bookings.length === 0 && (
        <div className="text-center py-16">
          <p className="text-ink-soft mb-4">You haven't booked any coaching sessions yet.</p>
          <Link href="/opportunities" className="btn-primary">Browse scholarships</Link>
        </div>
      )}

      <div className="space-y-5">
        {bookings.map((booking) => {
          const coach = booking.coachId;
          const opp = booking.opportunityId;
          const ratingEntry = rating[booking._id] ?? { score: 0, comment: "" };
          const alreadyRated = rated.has(booking._id) || !!booking.rating;

          return (
            <div key={booking._id} className="case-card p-6">
              <div className="flex items-start gap-4">
                {coach.photoUrl ? (
                  <img src={coach.photoUrl} alt={coach.name} className="w-11 h-11 rounded-full object-cover shrink-0" />
                ) : (
                  <div className="w-11 h-11 rounded-full bg-rule flex items-center justify-center shrink-0 font-display text-base text-slate">
                    {coach.name[0]}
                  </div>
                )}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <p className="font-medium text-ink">{coach.name}</p>
                    <span className={`text-xs font-mono px-2 py-0.5 rounded ${STATUS_STYLE[booking.status] ?? ""}`}>
                      {booking.status.toUpperCase()}
                    </span>
                  </div>
                  <p className="text-xs text-slate font-mono mt-0.5">
                    {coach.credential === "alumni" ? "Scholarship alumnus" : "Panel member"}
                    {coach.credentialYear ? ` · ${coach.credentialYear}` : ""}
                  </p>
                  {opp && (
                    <p className="text-xs text-slate font-mono mt-0.5">
                      Scholarship:{" "}
                      <Link href={`/opportunities/${opp._id}`} className="underline text-forest">{opp.title}</Link>
                    </p>
                  )}
                </div>
              </div>

              <div className="mt-4 grid grid-cols-2 gap-3 text-sm">
                <div>
                  <p className="text-xs font-mono text-slate uppercase">Session type</p>
                  <p className="text-ink capitalize">{booking.sessionType}</p>
                </div>
                <div>
                  <p className="text-xs font-mono text-slate uppercase">Amount paid</p>
                  <p className="text-ink">${booking.totalAmountUSD}</p>
                </div>
                <div>
                  <p className="text-xs font-mono text-slate uppercase">Booked</p>
                  <p className="text-ink">{new Date(booking.createdAt).toLocaleDateString()}</p>
                </div>
                {booking.scheduledAt && (
                  <div>
                    <p className="text-xs font-mono text-slate uppercase">Scheduled</p>
                    <p className="text-ink">{new Date(booking.scheduledAt).toLocaleDateString()}</p>
                  </div>
                )}
              </div>

              {booking.userMessage && (
                <div className="mt-4">
                  <p className="text-xs font-mono text-slate uppercase mb-1">Your message</p>
                  <p className="text-sm text-ink-soft italic">"{booking.userMessage}"</p>
                </div>
              )}

              {booking.status === "requested" ? (
                <div className="mt-4 p-3 rounded-lg bg-canvas border border-rule text-xs text-ink-soft">
                  Waiting for the admin to confirm and schedule your session. You'll be notified once it's accepted.
                </div>
              ) : booking.status === "accepted" ? (
                <div className="mt-4 p-3 rounded-lg bg-blue-50 border border-blue-200 text-xs text-blue-700">
                  Your session has been accepted. The coach or admin will contact you to arrange timing.
                </div>
              ) : null}

              {/* Rating */}
              {booking.status === "completed" && (
                <div className="mt-4 border-t border-rule pt-4">
                  {alreadyRated ? (
                    <p className="text-xs text-slate font-mono">
                      You rated this session {booking.rating ?? ratingEntry.score}/5.
                      {(booking.ratingComment ?? ratingEntry.comment) && ` "${booking.ratingComment ?? ratingEntry.comment}"`}
                    </p>
                  ) : (
                    <div>
                      <p className="text-xs font-mono text-slate uppercase mb-2">Rate this session</p>
                      <div className="flex gap-1 mb-3">
                        {[1, 2, 3, 4, 5].map((star) => (
                          <button
                            key={star}
                            type="button"
                            onClick={() => setRating((r) => ({ ...r, [booking._id]: { ...ratingEntry, score: star } }))}
                            className={`text-xl transition-colors ${ratingEntry.score >= star ? "text-brass" : "text-rule"}`}
                          >
                            ★
                          </button>
                        ))}
                      </div>
                      <textarea
                        rows={2}
                        placeholder="Leave a comment for the coach (optional)…"
                        value={ratingEntry.comment}
                        onChange={(e) => setRating((r) => ({ ...r, [booking._id]: { ...ratingEntry, comment: e.target.value } }))}
                        className="input resize-none text-sm mb-2"
                      />
                      <button
                        onClick={() => handleRate(booking._id)}
                        disabled={!ratingEntry.score || ratingLoading === booking._id}
                        className="btn-primary text-sm py-2"
                      >
                        {ratingLoading === booking._id ? "Submitting…" : "Submit rating"}
                      </button>
                    </div>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
