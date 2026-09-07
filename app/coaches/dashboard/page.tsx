"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { api, ApiError } from "@/lib/api";
import { useAuth } from "@/lib/auth-context";
import { HumanCoach, CoachingBooking } from "@/lib/types";

// ─── Types ─────────────────────────────────────────────────────────────────

interface PortalBooking extends Omit<CoachingBooking, "userId" | "opportunityId" | "coachId"> {
  userId: { fullName: string };
  opportunityId?: { _id: string; title: string; country: string };
  coachNote?: string;
}

interface PortalStats {
  totalEarnings: number;
  completedSessions: number;
  pendingBookings: number;
}

interface PortalData {
  coach: HumanCoach & { applicationNote?: string; rejectionNote?: string };
  bookings: PortalBooking[];
  stats: PortalStats;
}

// ─── Constants ──────────────────────────────────────────────────────────────

type TabKey = "requested" | "accepted" | "completed" | "cancelled";

const TABS: { key: TabKey; label: string }[] = [
  { key: "requested", label: "Requested" },
  { key: "accepted", label: "Accepted" },
  { key: "completed", label: "Completed" },
  { key: "cancelled", label: "Cancelled" },
];

const STATUS_BADGE: Record<string, string> = {
  pending: "bg-amber-100 text-amber-800 border border-amber-200",
  approved: "bg-green-100 text-green-800 border border-green-200",
  rejected: "bg-red-100 text-red-800 border border-red-200",
};

// ─── Star rating display ─────────────────────────────────────────────────────

function StarRating({ rating }: { rating: number }) {
  return (
    <span className="flex gap-0.5" aria-label={`${rating} out of 5 stars`}>
      {[1, 2, 3, 4, 5].map((s) => (
        <span key={s} className={`text-base ${s <= rating ? "text-brass" : "text-rule"}`}>
          ★
        </span>
      ))}
    </span>
  );
}

// ─── Stat card ────────────────────────────────────────────────────────────────

function StatCard({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="case-card px-6 py-5 bg-white">
      <p className="font-display text-4xl text-ink">{value}</p>
      <p className="text-xs text-slate font-mono mt-1.5 uppercase tracking-widest">{label}</p>
    </div>
  );
}

// ─── Main page ────────────────────────────────────────────────────────────────

export default function CoachDashboardPage() {
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();

  const [data, setData] = useState<PortalData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [noProfile, setNoProfile] = useState(false);

  const [activeTab, setActiveTab] = useState<TabKey>("requested");

  // Per-booking UI state
  const [scheduleInputs, setScheduleInputs] = useState<Record<string, string>>({});
  const [noteInputs, setNoteInputs] = useState<Record<string, string>>({});
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);

  // ── Auth guard ──
  useEffect(() => {
    if (!authLoading && !user) router.push("/login");
  }, [authLoading, user, router]);

  // ── Fetch portal data ──
  const fetchData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const result = await api.get<PortalData>("/coaches/portal/me");
      setData(result);
      // Pre-populate note inputs from existing coach notes
      const notes: Record<string, string> = {};
      result.bookings.forEach((b) => {
        if (b.coachNote) notes[b._id] = b.coachNote;
      });
      setNoteInputs(notes);
    } catch (err) {
      if (err instanceof ApiError && err.status === 404) {
        setNoProfile(true);
      } else {
        setError(err instanceof ApiError ? err.message : "Failed to load your coach portal.");
      }
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!user) return;
    fetchData();
  }, [user, fetchData]);

  // ── Booking action ──
  async function patchBooking(
    bookingId: string,
    body: { status?: string; scheduledAt?: string; coachNote?: string }
  ) {
    setActionLoading(bookingId);
    setActionError(null);
    try {
      const { booking } = await api.patch<{ booking: PortalBooking }>(
        `/coaches/portal/bookings/${bookingId}`,
        body
      );
      setData((prev) => {
        if (!prev) return prev;
        return {
          ...prev,
          bookings: prev.bookings.map((b) => (b._id === bookingId ? { ...b, ...booking } : b)),
        };
      });
    } catch (err) {
      setActionError(err instanceof ApiError ? err.message : "Action failed. Please try again.");
    } finally {
      setActionLoading(null);
    }
  }

  // ── Loading / error states ──
  if (authLoading || loading) {
    return (
      <p className="max-w-4xl mx-auto px-6 py-20 text-slate text-sm font-mono">
        Loading your coach portal…
      </p>
    );
  }

  if (!user) return null;

  if (noProfile) {
    return (
      <div className="max-w-xl mx-auto px-6 py-24 text-center">
        <p className="font-mono text-xs tracking-widest uppercase text-slate mb-3">Coach Portal</p>
        <h1 className="font-display text-3xl text-ink mb-3">No coach profile found</h1>
        <p className="text-ink-soft leading-relaxed mb-8">
          You don't have a coach profile yet. Apply to become a coach to access this portal.
        </p>
        <Link href="/coaches/apply" className="btn-primary">
          Apply to be a coach
        </Link>
      </div>
    );
  }

  if (error) {
    return (
      <div className="max-w-4xl mx-auto px-6 py-20">
        <div className="p-5 rounded-xl border border-alert bg-alert/5 text-alert text-sm">{error}</div>
        <button onClick={fetchData} className="btn-primary mt-4">
          Retry
        </button>
      </div>
    );
  }

  if (!data) return null;

  const { coach, bookings, stats } = data;
  const tabBookings = bookings.filter((b) => b.status === activeTab);

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 py-10 sm:py-14">
      {/* ── Header ── */}
      <div className="flex flex-col sm:flex-row sm:items-start gap-4 mb-8">
        <div className="flex items-center gap-4 flex-1 min-w-0">
          {coach.photoUrl ? (
            <img
              src={coach.photoUrl}
              alt={coach.name}
              className="w-14 h-14 rounded-full object-cover shrink-0"
            />
          ) : (
            <div className="w-14 h-14 rounded-full bg-rule flex items-center justify-center shrink-0 font-display text-xl text-slate">
              {coach.name[0]}
            </div>
          )}
          <div className="min-w-0">
            <p className="font-mono text-xs tracking-widest uppercase text-slate mb-0.5">
              Coach Portal
            </p>
            <h1 className="font-display text-2xl sm:text-3xl text-ink leading-tight truncate">
              {coach.name}
            </h1>
            <div className="flex items-center gap-2 mt-1.5 flex-wrap">
              <span
                className={`inline-block text-xs font-mono px-2 py-0.5 rounded ${STATUS_BADGE[coach.status] ?? ""}`}
              >
                {coach.status.toUpperCase()}
              </span>
              {coach.averageRating && (
                <span className="text-xs text-slate font-mono">
                  ★ {coach.averageRating.toFixed(1)} avg
                </span>
              )}
            </div>
          </div>
        </div>
        <div className="flex items-center gap-3 shrink-0">
          <Link
            href={`/coaches`}
            className="text-sm font-mono text-forest border border-forest px-4 py-2 rounded hover:bg-forest/5 transition-colors min-h-[44px] flex items-center"
          >
            Public profile →
          </Link>
        </div>
      </div>

      {/* ── Stats row ── */}
      <div className="grid grid-cols-1 sm:grid-cols-3 divide-y sm:divide-y-0 sm:divide-x divide-rule border border-rule rounded-lg overflow-hidden mb-8">
        <StatCard label="Pending requests" value={stats.pendingBookings} />
        <StatCard label="Sessions completed" value={stats.completedSessions} />
        <StatCard label="Total earned" value={`$${stats.totalEarnings.toLocaleString()}`} />
      </div>

      {/* ── Status notices ── */}
      {coach.status === "pending" && (
        <div className="mb-8 p-4 sm:p-5 rounded-xl border border-amber-200 bg-amber-50">
          <p className="text-sm font-medium text-amber-800 mb-1">Application under review</p>
          <p className="text-sm text-amber-700">
            The team will review your credentials and reach out within 3 business days. You'll be
            notified by email once your profile is approved.
          </p>
        </div>
      )}

      {coach.status === "rejected" && coach.rejectionNote && (
        <div className="mb-8 p-4 sm:p-5 rounded-xl border border-alert bg-alert/5">
          <p className="text-sm font-medium text-alert mb-1">Application not approved</p>
          <p className="text-sm text-alert/80">{coach.rejectionNote}</p>
        </div>
      )}

      {coach.status === "rejected" && !coach.rejectionNote && (
        <div className="mb-8 p-4 sm:p-5 rounded-xl border border-alert bg-alert/5">
          <p className="text-sm font-medium text-alert mb-1">Application not approved</p>
          <p className="text-sm text-alert/80">
            Your coach application was not approved at this time. Please contact support for more
            information.
          </p>
        </div>
      )}

      {/* ── Global action error ── */}
      {actionError && (
        <div className="mb-6 p-4 rounded-xl border border-alert bg-alert/5 text-sm text-alert">
          {actionError}
          <button
            onClick={() => setActionError(null)}
            className="ml-3 underline text-xs opacity-70"
          >
            Dismiss
          </button>
        </div>
      )}

      {/* ── Bookings section ── */}
      <div className="mb-10">
        <h2 className="font-display text-xl text-ink mb-4">Bookings</h2>

        {/* Tab bar */}
        <div className="flex gap-1 border-b border-rule mb-6 overflow-x-auto">
          {TABS.map(({ key, label }) => {
            const count = bookings.filter((b) => b.status === key).length;
            const isActive = activeTab === key;
            return (
              <button
                key={key}
                onClick={() => setActiveTab(key)}
                className={`px-4 py-2.5 text-sm font-mono whitespace-nowrap transition-colors border-b-2 -mb-px ${
                  isActive
                    ? "border-forest text-forest"
                    : "border-transparent text-slate hover:text-ink"
                }`}
              >
                {label}
                {count > 0 && (
                  <span
                    className={`ml-2 text-xs px-1.5 py-0.5 rounded-full ${
                      isActive ? "bg-forest/10 text-forest" : "bg-rule text-slate"
                    }`}
                  >
                    {count}
                  </span>
                )}
              </button>
            );
          })}
        </div>

        {/* Booking cards */}
        {tabBookings.length === 0 ? (
          <div className="case-card p-8 text-center">
            <p className="text-ink-soft text-sm">No {activeTab} bookings.</p>
          </div>
        ) : (
          <div className="space-y-4">
            {tabBookings.map((booking) => (
              <BookingCard
                key={booking._id}
                booking={booking}
                scheduleValue={scheduleInputs[booking._id] ?? ""}
                noteValue={noteInputs[booking._id] ?? ""}
                onScheduleChange={(v) =>
                  setScheduleInputs((p) => ({ ...p, [booking._id]: v }))
                }
                onNoteChange={(v) =>
                  setNoteInputs((p) => ({ ...p, [booking._id]: v }))
                }
                onPatch={(body) => patchBooking(booking._id, body)}
                isLoading={actionLoading === booking._id}
              />
            ))}
          </div>
        )}
      </div>

      {/* ── Profile section ── */}
      <CoachProfileSection coach={coach} />
    </div>
  );
}

// ─── Booking Card ─────────────────────────────────────────────────────────────

interface BookingCardProps {
  booking: PortalBooking;
  scheduleValue: string;
  noteValue: string;
  onScheduleChange: (v: string) => void;
  onNoteChange: (v: string) => void;
  onPatch: (body: { status?: string; scheduledAt?: string; coachNote?: string }) => void;
  isLoading: boolean;
}

function BookingCard({
  booking,
  scheduleValue,
  noteValue,
  onScheduleChange,
  onNoteChange,
  onPatch,
  isLoading,
}: BookingCardProps) {
  const opp = booking.opportunityId;
  const student = booking.userId?.fullName ?? "Unknown student";

  return (
    <div className="case-card p-5 sm:p-6">
      {/* ── Card header ── */}
      <div className="flex flex-col sm:flex-row sm:items-start gap-3 mb-4">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap mb-1">
            <p className="font-medium text-ink">{student}</p>
            <span className="font-mono text-xs text-slate capitalize px-2 py-0.5 rounded-full bg-rule">
              {booking.sessionType}
            </span>
          </div>
          {opp && (
            <p className="text-sm text-ink-soft">
              {opp.title}
              <span className="text-slate"> · {opp.country}</span>
            </p>
          )}
        </div>
        <div className="text-right shrink-0">
          <p className="font-display text-lg text-ink">${booking.coachPayoutUSD}</p>
          <p className="text-xs text-slate font-mono mt-0.5">your payout</p>
        </div>
      </div>

      {/* ── Meta grid ── */}
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 text-sm mb-4">
        <div>
          <p className="text-xs font-mono text-slate uppercase mb-0.5">Booked</p>
          <p className="text-ink">{new Date(booking.createdAt).toLocaleDateString()}</p>
        </div>
        {booking.scheduledAt && (
          <div>
            <p className="text-xs font-mono text-slate uppercase mb-0.5">Scheduled</p>
            <p className="text-ink">
              {new Date(booking.scheduledAt).toLocaleString(undefined, {
                dateStyle: "medium",
                timeStyle: "short",
              })}
            </p>
          </div>
        )}
        {booking.completedAt && (
          <div>
            <p className="text-xs font-mono text-slate uppercase mb-0.5">Completed</p>
            <p className="text-ink">{new Date(booking.completedAt).toLocaleDateString()}</p>
          </div>
        )}
      </div>

      {/* ── Student message ── */}
      {booking.userMessage && (
        <div className="mb-4 p-3 rounded-lg bg-paper border border-rule">
          <p className="text-xs font-mono text-slate uppercase mb-1">Student's message</p>
          <p className="text-sm text-ink-soft italic">"{booking.userMessage}"</p>
        </div>
      )}

      {/* ── REQUESTED: Accept / Decline ── */}
      {booking.status === "requested" && (
        <div className="flex gap-3 flex-wrap pt-2 border-t border-rule">
          <button
            onClick={() => onPatch({ status: "accepted" })}
            disabled={isLoading}
            className="btn-primary flex-1 sm:flex-none min-h-[44px]"
          >
            {isLoading ? "Processing…" : "Accept booking"}
          </button>
          <button
            onClick={() => onPatch({ status: "cancelled" })}
            disabled={isLoading}
            className="flex-1 sm:flex-none min-h-[44px] px-4 py-2 text-sm font-medium border border-rule text-ink-soft rounded hover:border-alert hover:text-alert transition-colors"
          >
            Decline
          </button>
        </div>
      )}

      {/* ── ACCEPTED: Schedule + Mark complete + Note + Cancel ── */}
      {booking.status === "accepted" && (
        <div className="pt-3 border-t border-rule space-y-4">
          {/* Schedule */}
          <div>
            <label className="block text-xs font-mono text-slate uppercase mb-1.5">
              Schedule session
            </label>
            <div className="flex gap-2 flex-wrap">
              <input
                type="datetime-local"
                value={scheduleValue}
                onChange={(e) => onScheduleChange(e.target.value)}
                className="input flex-1 min-w-0 text-sm"
              />
              <button
                onClick={() =>
                  scheduleValue
                    ? onPatch({ scheduledAt: new Date(scheduleValue).toISOString() })
                    : undefined
                }
                disabled={isLoading || !scheduleValue}
                className="btn-primary shrink-0 min-h-[44px] text-sm"
              >
                {isLoading ? "Saving…" : "Set time"}
              </button>
            </div>
          </div>

          {/* Note to student */}
          <div>
            <label className="block text-xs font-mono text-slate uppercase mb-1.5">
              Note to student
            </label>
            <textarea
              rows={2}
              value={noteValue}
              onChange={(e) => onNoteChange(e.target.value)}
              placeholder="Add a note visible to the student — e.g. a Zoom link or preparation tips…"
              className="input resize-none text-sm w-full"
            />
            <button
              onClick={() => onPatch({ coachNote: noteValue })}
              disabled={isLoading || !noteValue.trim()}
              className="mt-2 px-4 py-2 text-sm font-medium border border-rule text-ink rounded hover:border-forest hover:text-forest transition-colors min-h-[44px]"
            >
              {isLoading ? "Saving…" : "Save note"}
            </button>
          </div>

          {/* Mark complete + Cancel */}
          <div className="flex gap-3 flex-wrap">
            <button
              onClick={() => onPatch({ status: "completed" })}
              disabled={isLoading}
              className="flex-1 sm:flex-none min-h-[44px] px-4 py-2 text-sm font-medium bg-forest/10 text-forest border border-forest/20 rounded hover:bg-forest/15 transition-colors"
            >
              {isLoading ? "Updating…" : "Mark as completed"}
            </button>
            <button
              onClick={() => onPatch({ status: "cancelled" })}
              disabled={isLoading}
              className="flex-1 sm:flex-none min-h-[44px] px-4 py-2 text-sm font-medium border border-rule text-ink-soft rounded hover:border-alert hover:text-alert transition-colors"
            >
              Cancel booking
            </button>
          </div>
        </div>
      )}

      {/* ── COMPLETED: Rating + coach note ── */}
      {booking.status === "completed" && (
        <div className="pt-3 border-t border-rule space-y-3">
          {booking.rating ? (
            <div className="flex items-center gap-2">
              <StarRating rating={booking.rating} />
              <span className="text-xs font-mono text-slate">{booking.rating}/5</span>
              {booking.ratingComment && (
                <span className="text-xs text-ink-soft italic ml-1">"{booking.ratingComment}"</span>
              )}
            </div>
          ) : (
            <p className="text-xs text-slate font-mono">Not yet rated by student.</p>
          )}
          {booking.coachNote && (
            <div>
              <p className="text-xs font-mono text-slate uppercase mb-1">Your note</p>
              <p className="text-sm text-ink-soft">{booking.coachNote}</p>
            </div>
          )}
        </div>
      )}

      {/* ── CANCELLED: nothing extra needed ── */}
    </div>
  );
}

// ─── Profile section ──────────────────────────────────────────────────────────

function CoachProfileSection({
  coach,
}: {
  coach: PortalData["coach"];
}) {
  return (
    <div className="case-card p-5 sm:p-6">
      <div className="flex items-center justify-between mb-5">
        <h2 className="font-display text-xl text-ink">Your public profile</h2>
        <Link
          href="/coaches/apply"
          className="text-xs font-mono text-slate hover:text-ink border border-rule px-3 py-1.5 rounded transition-colors"
        >
          Edit application →
        </Link>
      </div>

      {/* Bio */}
      <div className="mb-5">
        <p className="text-xs font-mono text-slate uppercase mb-1.5">Bio</p>
        <p className="text-sm text-ink-soft leading-relaxed">{coach.bio}</p>
      </div>

      {/* Credential */}
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 mb-5">
        <div>
          <p className="text-xs font-mono text-slate uppercase mb-1">Credential</p>
          <p className="text-sm text-ink capitalize">
            {coach.credential === "alumni" ? "Scholarship alumnus" : "Panel member"}
          </p>
        </div>
        {coach.credentialYear && (
          <div>
            <p className="text-xs font-mono text-slate uppercase mb-1">Year</p>
            <p className="text-sm text-ink">{coach.credentialYear}</p>
          </div>
        )}
        <div>
          <p className="text-xs font-mono text-slate uppercase mb-1">Session fee</p>
          <p className="text-sm text-ink">${coach.sessionFeeUSD} USD</p>
        </div>
        <div>
          <p className="text-xs font-mono text-slate uppercase mb-1">Platform fee</p>
          <p className="text-sm text-ink">{coach.platformFeePercent}%</p>
        </div>
        <div>
          <p className="text-xs font-mono text-slate uppercase mb-1">Total sessions</p>
          <p className="text-sm text-ink">{coach.totalSessions}</p>
        </div>
        {coach.averageRating && (
          <div>
            <p className="text-xs font-mono text-slate uppercase mb-1">Avg rating</p>
            <div className="flex items-center gap-1.5">
              <StarRating rating={Math.round(coach.averageRating)} />
              <span className="text-xs text-slate font-mono">{coach.averageRating.toFixed(1)}</span>
            </div>
          </div>
        )}
      </div>

      {/* Scholarships */}
      {coach.scholarships.length > 0 && (
        <div className="mb-5">
          <p className="text-xs font-mono text-slate uppercase mb-2">
            Scholarships you coach for
          </p>
          <div className="flex flex-wrap gap-2">
            {coach.scholarships.map((s) => (
              <Link
                key={s.opportunityId}
                href={`/opportunities/${s.opportunityId}`}
                className="text-xs font-mono px-2.5 py-1 rounded-full border border-rule text-ink-soft hover:border-forest hover:text-forest transition-colors"
              >
                {s.opportunityTitle}
              </Link>
            ))}
          </div>
        </div>
      )}

      {/* LinkedIn */}
      {coach.linkedIn && (
        <div>
          <p className="text-xs font-mono text-slate uppercase mb-1">LinkedIn</p>
          <a
            href={coach.linkedIn}
            target="_blank"
            rel="noopener noreferrer"
            className="text-sm text-forest hover:underline break-all"
          >
            {coach.linkedIn}
          </a>
        </div>
      )}
    </div>
  );
}
