"use client";

import { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { api, ApiError } from "@/lib/api";
import { useAuth } from "@/lib/auth-context";
import { HumanCoach } from "@/lib/types";

function StarRating({ rating, count }: { rating: number; count?: number }) {
  return (
    <span className="flex items-center gap-1.5">
      {[1, 2, 3, 4, 5].map((s) => (
        <span key={s} className={`text-lg ${s <= Math.round(rating) ? "text-brass" : "text-rule"}`}>
          ★
        </span>
      ))}
      <span className="text-sm text-slate font-mono ml-0.5">
        {rating.toFixed(1)}{count !== undefined ? ` · ${count} session${count !== 1 ? "s" : ""}` : ""}
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

  if (loading) {
    return <p className="max-w-3xl mx-auto px-6 py-20 text-slate text-sm font-mono">Loading…</p>;
  }

  if (notFound || !coach) {
    return (
      <div className="max-w-xl mx-auto px-6 py-24 text-center">
        <p className="font-display text-2xl text-ink mb-3">Coach not found</p>
        <p className="text-ink-soft text-sm mb-8">This profile may have been removed or is no longer active.</p>
        <Link href="/" className="btn-primary">Back to catalogue</Link>
      </div>
    );
  }

  const totalStudents = coach.totalSessions;
  const isOwnProfile = user?.isCoach;

  return (
    <div className="max-w-3xl mx-auto px-4 sm:px-6 py-10 sm:py-16">

      {/* ── Header ── */}
      <div className="flex flex-col sm:flex-row gap-6 mb-8">
        {coach.photoUrl ? (
          <img
            src={coach.photoUrl}
            alt={coach.name}
            className="w-24 h-24 rounded-full object-cover shrink-0"
          />
        ) : (
          <div className="w-24 h-24 rounded-full bg-rule flex items-center justify-center shrink-0 font-display text-3xl text-slate">
            {coach.name[0]}
          </div>
        )}

        <div className="flex-1 min-w-0">
          <p className="font-mono text-xs tracking-widest uppercase text-slate mb-1">
            {coach.credential === "alumni" ? "Scholarship alumnus" : "Selection panel member"}
            {coach.credentialYear ? ` · ${coach.credentialYear}` : ""}
          </p>
          <h1 className="font-display text-3xl sm:text-4xl text-ink leading-tight">{coach.name}</h1>

          <div className="flex items-center gap-4 mt-3 flex-wrap">
            {coach.averageRating ? (
              <StarRating rating={coach.averageRating} count={totalStudents} />
            ) : (
              <span className="text-sm text-slate font-mono">
                {totalStudents > 0 ? `${totalStudents} session${totalStudents !== 1 ? "s" : ""}` : "New coach"}
              </span>
            )}
            {coach.linkedIn && (
              <a
                href={coach.linkedIn}
                target="_blank"
                rel="noopener noreferrer"
                className="text-xs font-mono text-forest hover:underline"
              >
                LinkedIn →
              </a>
            )}
          </div>
        </div>

        {/* Pricing + CTA */}
        <div className="shrink-0 sm:text-right">
          <p className="font-display text-3xl text-ink">${coach.sessionFeeUSD}</p>
          <p className="text-xs text-slate font-mono mt-0.5 mb-4">per session + platform fee</p>
          {!isOwnProfile && (
            <button
              onClick={() => { setShowModal(true); setBookingDone(false); setBookingError(null); }}
              className="btn-primary w-full sm:w-auto"
            >
              Book a session →
            </button>
          )}
          {isOwnProfile && (
            <Link href="/coaches/dashboard" className="btn-secondary w-full sm:w-auto text-center">
              Your dashboard →
            </Link>
          )}
        </div>
      </div>

      {/* ── Bio ── */}
      <div className="mb-8">
        <p className="text-ink leading-relaxed whitespace-pre-line">{coach.bio}</p>
      </div>

      {/* ── Scholarships ── */}
      {coach.scholarships.length > 0 && (
        <div className="mb-8">
          <p className="font-mono text-xs tracking-widest uppercase text-slate mb-3">
            Coaches for these scholarships
          </p>
          <div className="flex flex-wrap gap-2">
            {coach.scholarships.map((s) => (
              <Link
                key={s.opportunityId}
                href={`/opportunities/${s.opportunityId}`}
                className="text-sm px-3 py-1.5 rounded-full border border-rule text-ink-soft hover:border-forest hover:text-forest transition-colors"
              >
                {s.opportunityTitle}
              </Link>
            ))}
          </div>
        </div>
      )}

      {/* ── Session types ── */}
      <div className="mb-8">
        <p className="font-mono text-xs tracking-widest uppercase text-slate mb-3">What you get</p>
        <div className="grid sm:grid-cols-2 gap-4">
          {[
            {
              type: "Strategy coaching",
              desc: "A focused session on your application strategy — positioning, narrative, what the committee is looking for, and how to close gaps in your profile.",
            },
            {
              type: "Document review",
              desc: "Detailed feedback on your essays, personal statement, or supporting documents. Written notes delivered after the session.",
            },
          ].map(({ type, desc }) => (
            <div key={type} className="case-card p-5">
              <p className="font-medium text-ink mb-1">{type}</p>
              <p className="text-sm text-ink-soft leading-relaxed">{desc}</p>
            </div>
          ))}
        </div>
      </div>

      {/* ── Book CTA banner (bottom) ── */}
      {!isOwnProfile && (
        <div className="case-card p-6 flex flex-col sm:flex-row items-start sm:items-center gap-4">
          <div className="flex-1">
            <p className="font-medium text-ink">Ready to work with {coach.name.split(" ")[0]}?</p>
            <p className="text-sm text-slate mt-0.5">
              ${coach.sessionFeeUSD} per session · usually responds within 48 hours
            </p>
          </div>
          <button
            onClick={() => { setShowModal(true); setBookingDone(false); setBookingError(null); }}
            className="btn-primary shrink-0"
          >
            Book a session →
          </button>
        </div>
      )}

      {/* ── Booking modal ── */}
      {showModal && (
        <div
          className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-4 bg-black/40"
          onClick={(e) => { if (e.target === e.currentTarget) setShowModal(false); }}
        >
          <div className="bg-white rounded-2xl p-6 sm:p-7 w-full max-w-md shadow-xl">
            {bookingDone ? (
              <div className="text-center py-4">
                <div className="w-12 h-12 rounded-full bg-forest/10 flex items-center justify-center mx-auto mb-4">
                  <span className="text-xl text-forest">✓</span>
                </div>
                <p className="font-display text-xl text-ink mb-2">Booking requested</p>
                <p className="text-sm text-ink-soft mb-6">
                  {coach.name.split(" ")[0]} will review your request and confirm the session. You'll get an email once they respond.
                </p>
                <button onClick={() => setShowModal(false)} className="btn-primary w-full">
                  Done
                </button>
              </div>
            ) : (
              <>
                <div className="flex items-center justify-between mb-5">
                  <p className="font-display text-xl text-ink">Book with {coach.name.split(" ")[0]}</p>
                  <button onClick={() => setShowModal(false)} className="text-slate hover:text-ink text-xl leading-none">×</button>
                </div>

                <form onSubmit={handleBook} className="space-y-4">
                  {/* Scholarship */}
                  <div>
                    <label className="block text-sm font-medium text-ink mb-1.5">
                      Which scholarship is this for?
                    </label>
                    <select
                      required
                      value={bookingOppId}
                      onChange={(e) => setBookingOppId(e.target.value)}
                      className="input"
                    >
                      <option value="">Select a scholarship…</option>
                      {coach.scholarships.map((s) => (
                        <option key={s.opportunityId} value={s.opportunityId}>
                          {s.opportunityTitle}
                        </option>
                      ))}
                    </select>
                  </div>

                  {/* Session type */}
                  <div>
                    <label className="block text-sm font-medium text-ink mb-2">Session type</label>
                    <div className="flex flex-col sm:flex-row gap-2">
                      {(["coaching", "review"] as const).map((t) => (
                        <button
                          key={t}
                          type="button"
                          onClick={() => setSessionType(t)}
                          className={`flex-1 text-left px-4 py-3 rounded-xl border text-sm transition-colors ${
                            sessionType === t
                              ? "border-forest bg-forest/5 text-ink"
                              : "border-rule text-ink-soft hover:border-forest"
                          }`}
                        >
                          <span className="font-medium block">
                            {t === "coaching" ? "Strategy coaching" : "Document review"}
                          </span>
                          <span className="text-xs text-slate mt-0.5 block">
                            {t === "coaching" ? "Live session, strategy & positioning" : "Written feedback on your drafts"}
                          </span>
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Message */}
                  <div>
                    <label className="block text-sm font-medium text-ink mb-1.5">
                      Message <span className="text-slate font-normal">(optional)</span>
                    </label>
                    <textarea
                      rows={3}
                      value={userMessage}
                      onChange={(e) => setUserMessage(e.target.value)}
                      placeholder="Briefly describe where you are in your application and what you need most help with…"
                      className="input resize-none text-sm"
                    />
                  </div>

                  {/* Pricing summary */}
                  <div className="flex items-center justify-between py-3 border-t border-rule text-sm">
                    <span className="text-slate">Total (incl. platform fee)</span>
                    <span className="font-medium text-ink">
                      ${(coach.sessionFeeUSD * (1 + coach.platformFeePercent / 100)).toFixed(0)} USD
                    </span>
                  </div>

                  {bookingError && (
                    <p className="text-alert text-sm p-3 bg-alert/5 rounded-lg border border-alert/20">
                      {bookingError}
                    </p>
                  )}

                  <button type="submit" disabled={booking} className="btn-primary w-full">
                    {booking ? "Sending request…" : "Send booking request →"}
                  </button>

                  {!user && (
                    <p className="text-xs text-slate text-center">
                      You'll be asked to sign in before confirming.
                    </p>
                  )}
                </form>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
