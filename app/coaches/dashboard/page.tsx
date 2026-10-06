"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { ExternalLink, Search, Star } from "lucide-react";
import { api, ApiError } from "@/lib/api";
import { useAuth } from "@/lib/auth-context";
import { HumanCoach, CoachingBooking, Opportunity } from "@/lib/types";
import PhotoUpload from "@/components/PhotoUpload";
import { PageHeader } from "@/components/ui/PageHeader";
import { Alert, EmptyState, ErrorState } from "@/components/ui/States";
import { Skeleton, SkeletonHeader, SkeletonList } from "@/components/ui/Skeleton";
import { opportunityPath } from "@/lib/paths";

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
  pending: "badge-warn",
  approved: "badge-ok",
  rejected: "badge-danger",
};

const STATUS_LABEL: Record<string, string> = {
  pending: "Pending review",
  approved: "Approved",
  rejected: "Not approved",
};

// ─── Star rating display ─────────────────────────────────────────────────────

function StarRating({ rating }: { rating: number }) {
  return (
    <span className="flex gap-0.5" role="img" aria-label={`${rating} out of 5 stars`}>
      {[1, 2, 3, 4, 5].map((s) => (
        <Star key={s} size={16} aria-hidden="true" className={s <= rating ? "fill-brass text-warn" : "text-control"} />
      ))}
    </span>
  );
}

// ─── Stat card ────────────────────────────────────────────────────────────────

function StatCard({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="card card-pad">
      <p className="font-display text-3xl text-ink sm:text-4xl">{value}</p>
      <p className="mt-1 text-sm text-slate">{label}</p>
    </div>
  );
}

function PortalSkeleton() {
  return (
    <div className="page" role="status" aria-label="Loading your coach portal">
      <SkeletonHeader withAction />
      <div className="mb-8 grid gap-4 sm:grid-cols-3">
        {[0, 1, 2].map((i) => (
          <div key={i} aria-hidden="true" className="card card-pad space-y-3">
            <Skeleton className="h-9 w-16" />
            <Skeleton className="h-3 w-28" />
          </div>
        ))}
      </div>
      <SkeletonList rows={2} />
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
    if (!authLoading && !user) router.push("/login?next=/coaches/dashboard");
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

  // The portal is for approved coaches only. Applicants who are pending or rejected see their status on the apply page.
  const notApproved = !!data && data.coach.status !== "approved";
  useEffect(() => {
    if (notApproved) router.replace("/coaches/apply");
  }, [notApproved, router]);

  // ── Loading / error states ──
  if (authLoading || loading || notApproved) return <PortalSkeleton />;

  if (!user) return null;

  if (noProfile) {
    return (
      <div className="page-narrow">
        <EmptyState
          title="No coach profile found"
          description="You do not have a coach profile yet. Apply to become a coach to use this portal."
          action={<Link href="/coaches/apply" className="btn-primary">Apply to be a coach</Link>}
        />
      </div>
    );
  }

  if (error) {
    return (
      <div className="page-narrow">
        <ErrorState title="Could not load your portal" message={error} onRetry={fetchData} />
      </div>
    );
  }

  if (!data) return null;

  const { coach, bookings, stats } = data;
  const tabBookings = bookings.filter((b) => b.status === activeTab);

  return (
    <div className="page">
      <PageHeader
        eyebrow="Coach portal"
        title={
          <span className="flex items-center gap-4">
            {coach.photoUrl ? (
              <img src={coach.photoUrl} alt="" width={56} height={56} className="h-14 w-14 shrink-0 rounded-full object-cover" />
            ) : (
              <span className="flex h-14 w-14 shrink-0 items-center justify-center rounded-full bg-surface-2 font-display text-xl text-slate">
                {coach.name[0]}
              </span>
            )}
            <span className="min-w-0 truncate">{coach.name}</span>
          </span>
        }
        description={
          <span className="flex flex-wrap items-center gap-3 text-base">
            <span className={`badge ${STATUS_BADGE[coach.status] ?? ""}`}>{STATUS_LABEL[coach.status] ?? coach.status}</span>
            {coach.averageRating && <span className="text-sm text-slate">Average rating {coach.averageRating.toFixed(1)} of 5</span>}
          </span>
        }
        actions={
          <Link href={`/coaches/${coach._id}`} className="btn-secondary">
            Public profile
            <ExternalLink size={16} aria-hidden="true" />
          </Link>
        }
      />

      <div className="space-y-8">
        {/* Stats */}
        <section aria-label="Your numbers" className="grid gap-4 sm:grid-cols-3">
          <StatCard label="Pending requests" value={stats.pendingBookings} />
          <StatCard label="Sessions completed" value={stats.completedSessions} />
          <StatCard label="Total earned" value={`$${stats.totalEarnings.toLocaleString()}`} />
        </section>

        {/* Status notices */}
        {coach.status === "pending" && (
          <Alert variant="warn">
            <p className="font-semibold">Application under review</p>
            <p className="mt-0.5">The team will review your credentials and reach out within 3 business days. You will be notified by email once your profile is approved.</p>
          </Alert>
        )}

        {coach.status === "rejected" && (
          <Alert variant="danger">
            <p className="font-semibold">Application not approved</p>
            <p className="mt-0.5">
              {coach.rejectionNote || "Your coach application was not approved at this time. Please contact support for more information."}
            </p>
          </Alert>
        )}

        {actionError && (
          <Alert variant="danger">
            <div className="flex items-start justify-between gap-3">
              <span>{actionError}</span>
              <button type="button" onClick={() => setActionError(null)} className="shrink-0 font-semibold underline">
                Dismiss
              </button>
            </div>
          </Alert>
        )}

        {/* Bookings */}
        <section aria-labelledby="bookings-heading">
          <h2 id="bookings-heading" className="h2 mb-4">Bookings</h2>

          <div role="tablist" aria-label="Booking status" className="mb-6 flex gap-1 overflow-x-auto border-b border-rule">
            {TABS.map(({ key, label }) => {
              const count = bookings.filter((b) => b.status === key).length;
              const isActive = activeTab === key;
              return (
                <button
                  key={key}
                  type="button"
                  role="tab"
                  aria-selected={isActive}
                  onClick={() => setActiveTab(key)}
                  className={`-mb-px min-h-touch whitespace-nowrap border-b-2 px-4 text-sm font-semibold transition-colors ${
                    isActive ? "border-forest text-forest" : "border-transparent text-slate hover:text-ink"
                  }`}
                >
                  {label}
                  {count > 0 && (
                    <span className={`ml-2 rounded-full px-2 py-0.5 text-xs ${isActive ? "bg-forest-soft text-forest" : "bg-surface-2 text-slate"}`}>
                      {count}
                    </span>
                  )}
                </button>
              );
            })}
          </div>

          {tabBookings.length === 0 ? (
            <EmptyState title={`No ${activeTab} bookings`} description="Bookings appear here as students book sessions with you." />
          ) : (
            <ul className="space-y-4" role="tabpanel">
              {tabBookings.map((booking) => (
                <li key={booking._id}>
                  <BookingCard
                    booking={booking}
                    scheduleValue={scheduleInputs[booking._id] ?? ""}
                    noteValue={noteInputs[booking._id] ?? ""}
                    onScheduleChange={(v) => setScheduleInputs((p) => ({ ...p, [booking._id]: v }))}
                    onNoteChange={(v) => setNoteInputs((p) => ({ ...p, [booking._id]: v }))}
                    onPatch={(body) => patchBooking(booking._id, body)}
                    isLoading={actionLoading === booking._id}
                  />
                </li>
              ))}
            </ul>
          )}
        </section>

        {/* Profile */}
        <CoachProfileSection
          coach={coach}
          onUpdated={(updated) => setData((prev) => (prev ? { ...prev, coach: updated } : prev))}
        />
      </div>
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
    <article className="card card-pad">
      <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-start">
        <div className="min-w-0 flex-1">
          <div className="mb-1 flex flex-wrap items-center gap-2">
            <p className="font-semibold text-ink">{student}</p>
            <span className="badge capitalize">{booking.sessionType}</span>
          </div>
          {opp && (
            <p className="text-sm text-ink-soft">
              {opp.title}
              <span className="text-slate"> · {opp.country}</span>
            </p>
          )}
        </div>
        <div className="shrink-0 sm:text-right">
          <p className="font-display text-xl text-ink">${booking.coachPayoutUSD}</p>
          <p className="text-sm text-slate">your payout</p>
        </div>
      </div>

      <dl className="mb-4 grid grid-cols-2 gap-3 text-sm sm:grid-cols-3">
        <div>
          <dt className="text-slate">Booked</dt>
          <dd className="mt-0.5 font-medium text-ink">{new Date(booking.createdAt).toLocaleDateString()}</dd>
        </div>
        {booking.scheduledAt && (
          <div>
            <dt className="text-slate">Scheduled</dt>
            <dd className="mt-0.5 font-medium text-ink">
              {new Date(booking.scheduledAt).toLocaleString(undefined, { dateStyle: "medium", timeStyle: "short" })}
            </dd>
          </div>
        )}
        {booking.completedAt && (
          <div>
            <dt className="text-slate">Completed</dt>
            <dd className="mt-0.5 font-medium text-ink">{new Date(booking.completedAt).toLocaleDateString()}</dd>
          </div>
        )}
      </dl>

      {booking.userMessage && (
        <div className="mb-4 rounded-lg bg-surface p-3">
          <p className="mb-1 text-sm font-semibold text-ink">Student&apos;s message</p>
          <p className="text-sm italic text-ink-soft">&ldquo;{booking.userMessage}&rdquo;</p>
        </div>
      )}

      {/* REQUESTED: accept or decline */}
      {booking.status === "requested" && (
        <div className="flex flex-wrap gap-3 border-t border-rule pt-4">
          <button type="button" onClick={() => onPatch({ status: "accepted" })} disabled={isLoading} aria-busy={isLoading} className="btn-primary">
            {isLoading ? "Processing" : "Accept booking"}
          </button>
          <button type="button" onClick={() => onPatch({ status: "cancelled" })} disabled={isLoading} className="btn-secondary">
            Decline
          </button>
        </div>
      )}

      {/* ACCEPTED: schedule, note, complete, cancel */}
      {booking.status === "accepted" && (
        <div className="space-y-5 border-t border-rule pt-4">
          <div>
            <label htmlFor={`sched-${booking._id}`} className="label">Schedule session</label>
            <div className="flex flex-wrap gap-2">
              <input
                id={`sched-${booking._id}`}
                type="datetime-local"
                value={scheduleValue}
                onChange={(e) => onScheduleChange(e.target.value)}
                className="input min-w-0 flex-1"
              />
              <button
                type="button"
                onClick={() => (scheduleValue ? onPatch({ scheduledAt: new Date(scheduleValue).toISOString() }) : undefined)}
                disabled={isLoading || !scheduleValue}
                aria-busy={isLoading}
                className="btn-primary shrink-0"
              >
                {isLoading ? "Saving" : "Set time"}
              </button>
            </div>
          </div>

          <div>
            <label htmlFor={`note-${booking._id}`} className="label">Note to student</label>
            <textarea
              id={`note-${booking._id}`}
              rows={2}
              value={noteValue}
              onChange={(e) => onNoteChange(e.target.value)}
              placeholder="Add a note the student can see, such as a video call link or preparation tips."
              className="textarea !min-h-0"
            />
            <button type="button" onClick={() => onPatch({ coachNote: noteValue })} disabled={isLoading || !noteValue.trim()} aria-busy={isLoading} className="btn-secondary mt-2">
              {isLoading ? "Saving" : "Save note"}
            </button>
          </div>

          <div className="flex flex-wrap gap-3">
            <button type="button" onClick={() => onPatch({ status: "completed" })} disabled={isLoading} aria-busy={isLoading} className="btn-primary">
              {isLoading ? "Updating" : "Mark as completed"}
            </button>
            <button type="button" onClick={() => onPatch({ status: "cancelled" })} disabled={isLoading} className="btn-secondary">
              Cancel booking
            </button>
          </div>
        </div>
      )}

      {/* COMPLETED: rating and note */}
      {booking.status === "completed" && (
        <div className="space-y-3 border-t border-rule pt-4">
          {booking.rating ? (
            <div className="flex flex-wrap items-center gap-2">
              <StarRating rating={booking.rating} />
              <span className="text-sm text-slate">{booking.rating} out of 5</span>
              {booking.ratingComment && <span className="text-sm italic text-ink-soft">&ldquo;{booking.ratingComment}&rdquo;</span>}
            </div>
          ) : (
            <p className="text-sm text-slate">Not yet rated by the student.</p>
          )}
          {booking.coachNote && (
            <div>
              <p className="text-sm font-semibold text-ink">Your note</p>
              <p className="text-sm text-ink-soft">{booking.coachNote}</p>
            </div>
          )}
        </div>
      )}
    </article>
  );
}

// ─── Profile section ──────────────────────────────────────────────────────────

const API_BASE = process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000/api";

function CoachProfileSection({
  coach,
  onUpdated,
}: {
  coach: PortalData["coach"];
  onUpdated: (updated: PortalData["coach"]) => void;
}) {
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);

  // Edit form state, initialised from current coach data
  const [name, setName] = useState(coach.name);
  const [bio, setBio] = useState(coach.bio);
  const [photoUrl, setPhotoUrl] = useState(coach.photoUrl ?? "");
  const [sessionFee, setSessionFee] = useState(String(coach.sessionFeeUSD));
  const [linkedIn, setLinkedIn] = useState(coach.linkedIn ?? "");
  const [selectedIds, setSelectedIds] = useState<string[]>(
    coach.scholarships.map((s) => String(s.opportunityId))
  );
  const [oppSearch, setOppSearch] = useState("");
  const [allOpps, setAllOpps] = useState<Opportunity[]>([]);
  const [oppsLoading, setOppsLoading] = useState(false);

  // Load all scholarships when edit mode opens
  useEffect(() => {
    if (!editing || allOpps.length > 0) return;
    setOppsLoading(true);
    fetch(`${API_BASE}/opportunities?sort=alpha&limit=500`)
      .then((r) => r.json())
      .then((d) => setAllOpps(d.opportunities ?? []))
      .catch(() => {})
      .finally(() => setOppsLoading(false));
  }, [editing, allOpps.length]);

  function openEdit() {
    // Reset to current saved values each time edit mode opens
    setName(coach.name);
    setBio(coach.bio);
    setPhotoUrl(coach.photoUrl ?? "");
    setSessionFee(String(coach.sessionFeeUSD));
    setLinkedIn(coach.linkedIn ?? "");
    setSelectedIds(coach.scholarships.map((s) => String(s.opportunityId)));
    setOppSearch("");
    setSaveError(null);
    setEditing(true);
  }

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setSaveError(null);
    try {
      const { coach: updated } = await api.patch<{ coach: PortalData["coach"] }>("/coaches/portal/me", {
        name: name.trim(),
        bio: bio.trim(),
        photoUrl: photoUrl || null,
        sessionFeeUSD: Number(sessionFee) || 0,
        linkedIn: linkedIn.trim() || null,
        opportunityIds: selectedIds.length ? selectedIds : undefined,
      });
      onUpdated(updated);
      setEditing(false);
    } catch (err) {
      setSaveError(err instanceof ApiError ? err.message : "Save failed. Please try again.");
    } finally {
      setSaving(false);
    }
  }

  const q = oppSearch.toLowerCase();
  const filteredOpps = allOpps.filter(
    (o) =>
      !q ||
      o.title.toLowerCase().includes(q) ||
      (o.provider ?? "").toLowerCase().includes(q) ||
      (o.country ?? "").toLowerCase().includes(q)
  );

  // ── View mode ──
  if (!editing) {
    return (
      <section className="card card-pad" aria-labelledby="profile-heading">
        <div className="mb-5 flex items-center justify-between gap-4">
          <h2 id="profile-heading" className="h3">Your public profile</h2>
          <button type="button" onClick={openEdit} className="btn-secondary btn-sm">
            Edit profile
          </button>
        </div>

        <div className="mb-5">
          <p className="mb-1.5 text-sm font-semibold text-ink">Bio</p>
          <p className="max-w-prose text-sm leading-relaxed text-ink-soft">{coach.bio}</p>
        </div>

        <dl className="mb-5 grid grid-cols-2 gap-4 sm:grid-cols-3">
          <div>
            <dt className="text-sm text-slate">Credential</dt>
            <dd className="mt-0.5 text-sm font-medium text-ink">{coach.credential === "alumni" ? "Scholarship alumnus" : "Panel member"}</dd>
          </div>
          {coach.credentialYear && (
            <div>
              <dt className="text-sm text-slate">Year</dt>
              <dd className="mt-0.5 text-sm font-medium text-ink">{coach.credentialYear}</dd>
            </div>
          )}
          <div>
            <dt className="text-sm text-slate">Session fee</dt>
            <dd className="mt-0.5 text-sm font-medium text-ink">${coach.sessionFeeUSD} USD</dd>
          </div>
          <div>
            <dt className="text-sm text-slate">Platform fee</dt>
            <dd className="mt-0.5 text-sm font-medium text-ink">{coach.platformFeePercent}%</dd>
          </div>
          <div>
            <dt className="text-sm text-slate">Total sessions</dt>
            <dd className="mt-0.5 text-sm font-medium text-ink">{coach.totalSessions}</dd>
          </div>
          {coach.averageRating && (
            <div>
              <dt className="text-sm text-slate">Average rating</dt>
              <dd className="mt-0.5 flex items-center gap-2">
                <StarRating rating={Math.round(coach.averageRating)} />
                <span className="text-sm text-slate">{coach.averageRating.toFixed(1)}</span>
              </dd>
            </div>
          )}
        </dl>

        {coach.scholarships.length > 0 && (
          <div className="mb-5">
            <p className="mb-2 text-sm font-semibold text-ink">Scholarships you coach for</p>
            <ul className="flex flex-wrap gap-2">
              {coach.scholarships.map((s) => (
                <li key={s.opportunityId}>
                  <Link
                    href={opportunityPath({ _id: String(s.opportunityId), title: s.opportunityTitle })}
                    className="badge min-h-touch px-4 text-sm font-medium transition-colors hover:text-forest"
                  >
                    {s.opportunityTitle}
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        )}

        {coach.linkedIn && (
          <div>
            <p className="text-sm font-semibold text-ink">LinkedIn</p>
            <a href={coach.linkedIn} target="_blank" rel="noopener noreferrer" className="break-all text-sm text-forest hover:underline">
              {coach.linkedIn}
            </a>
          </div>
        )}
      </section>
    );
  }

  // ── Edit mode ──
  return (
    <section className="card card-pad" aria-labelledby="edit-heading">
      <div className="mb-5 flex items-center justify-between">
        <h2 id="edit-heading" className="h3">Edit profile</h2>
        <button type="button" onClick={() => setEditing(false)} className="btn-ghost btn-sm">
          Cancel
        </button>
      </div>

      <form onSubmit={handleSave} className="space-y-5">
        <div>
          <label htmlFor="ce-name" className="label">Display name</label>
          <input id="ce-name" required value={name} onChange={(e) => setName(e.target.value)} className="input" placeholder="Your name as shown to students" />
        </div>

        <fieldset>
          <legend className="label">Profile photo</legend>
          <div className="mt-2">
            <PhotoUpload currentUrl={photoUrl || undefined} onChange={(url) => setPhotoUrl(url)} size={80} />
          </div>
        </fieldset>

        <div>
          <label htmlFor="ce-bio" className="label">
            Bio <span className="font-normal text-slate">(at least 50 characters)</span>
          </label>
          <textarea id="ce-bio" required minLength={50} maxLength={1000} rows={4} value={bio} onChange={(e) => setBio(e.target.value)} className="textarea" />
          <p className="help text-right">{bio.length}/1000</p>
        </div>

        <div>
          <label htmlFor="ce-fee" className="label">Session fee (USD)</label>
          <div className="relative">
            <span className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-slate" aria-hidden="true">$</span>
            <input id="ce-fee" type="number" inputMode="decimal" required min={0} max={10000} value={sessionFee} onChange={(e) => setSessionFee(e.target.value)} className="input pl-8" placeholder="150" />
          </div>
          <p className="help">The platform fee ({coach.platformFeePercent}%) is added on top. Your quoted rate is always what you receive.</p>
        </div>

        <div>
          <label htmlFor="ce-li" className="label">LinkedIn URL</label>
          <input id="ce-li" type="url" inputMode="url" value={linkedIn} onChange={(e) => setLinkedIn(e.target.value)} className="input" placeholder="https://linkedin.com/in/" />
        </div>

        <fieldset>
          <legend className="label">
            Scholarships you coach for <span className="font-normal text-slate">({selectedIds.length} selected)</span>
          </legend>
          <label htmlFor="ce-search" className="sr-only">Search scholarships</label>
          <div className="relative mt-2 mb-2">
            <Search size={16} className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-slate" aria-hidden="true" />
            <input id="ce-search" value={oppSearch} onChange={(e) => setOppSearch(e.target.value)} className="input pl-10" placeholder="Search scholarships" />
          </div>
          <div className="max-h-60 divide-y divide-rule overflow-y-auto rounded-xl bg-surface">
            {oppsLoading && (
              <div className="space-y-3 p-4" role="status" aria-label="Loading scholarships">
                {[0, 1, 2, 3].map((i) => <Skeleton key={i} className="h-5 w-full" />)}
              </div>
            )}
            {!oppsLoading && filteredOpps.length === 0 && <p className="px-4 py-3 text-sm text-slate">No scholarships found.</p>}
            {!oppsLoading &&
              filteredOpps.map((o) => {
                const checked = selectedIds.includes(o._id);
                return (
                  <label key={o._id} className={`flex min-h-touch cursor-pointer items-center gap-3 px-4 py-3 transition-colors ${checked ? "bg-forest-soft" : "hover:bg-surface-2"}`}>
                    <input
                      type="checkbox"
                      checked={checked}
                      onChange={() => setSelectedIds((prev) => (checked ? prev.filter((id) => id !== o._id) : [...prev, o._id]))}
                      className="h-5 w-5 shrink-0 accent-forest"
                    />
                    <span className="min-w-0">
                      <span className="block truncate text-sm font-medium text-ink">{o.title}</span>
                      <span className="block truncate text-sm text-slate">{o.provider} · {o.country}</span>
                    </span>
                  </label>
                );
              })}
          </div>
        </fieldset>

        {saveError && <Alert variant="danger">{saveError}</Alert>}

        <div className="flex flex-wrap gap-3 pt-2">
          <button type="submit" disabled={saving} aria-busy={saving} className="btn-primary">
            {saving ? "Saving" : "Save changes"}
          </button>
          <button type="button" onClick={() => setEditing(false)} className="btn-secondary">
            Cancel
          </button>
        </div>
      </form>
    </section>
  );
}
