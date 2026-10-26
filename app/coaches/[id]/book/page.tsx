"use client";

import { Suspense, useEffect, useState } from "react";
import { useParams, useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { CircleCheck } from "lucide-react";
import { api, ApiError } from "@/lib/api";
import { useAuth } from "@/lib/auth-context";
import type { HumanCoach } from "@/lib/types";
import PreSessionForm, { emptyPreSession, PreSessionDraft, PreSessionErrors, preSessionPayload, validatePreSession } from "@/components/PreSessionForm";
import { PageHeader } from "@/components/ui/PageHeader";
import { SkeletonPage } from "@/components/ui/Skeleton";
import { Alert, EmptyState } from "@/components/ui/States";

export default function BookCoachPage() {
  return (
    <Suspense>
      <BookCoachInner />
    </Suspense>
  );
}

function BookCoachInner() {
  const { id } = useParams<{ id: string }>();
  const searchParams = useSearchParams();
  const router = useRouter();
  const { user, loading: authLoading } = useAuth();

  const [coach, setCoach] = useState<HumanCoach | null>(null);
  const [loading, setLoading] = useState(true);
  const [oppId, setOppId] = useState(searchParams.get("opp") ?? "");
  const [sessionType, setSessionType] = useState<"coaching" | "review">("coaching");
  const [draft, setDraft] = useState<PreSessionDraft>(emptyPreSession);
  const [errors, setErrors] = useState<PreSessionErrors>({});
  const [oppError, setOppError] = useState<string | null>(null);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [done, setDone] = useState(false);

  useEffect(() => {
    if (!authLoading && !user) router.push(`/login?next=/coaches/${id}/book`);
  }, [authLoading, user, router, id]);

  useEffect(() => {
    if (!id) return;
    api.get<{ coach: HumanCoach }>(`/coaches/${id}`)
      .then((d) => setCoach(d.coach))
      .catch(() => setCoach(null))
      .finally(() => setLoading(false));
  }, [id]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const found = validatePreSession(draft);
    const missingOpp = !oppId ? "Select the scholarship this session is for." : null;
    setErrors(found);
    setOppError(missingOpp);
    if (missingOpp || Object.keys(found).length > 0) {
      // Move focus to the first problem so keyboard and screen reader users land on it.
      requestAnimationFrame(() => document.querySelector<HTMLElement>('[aria-invalid="true"], #bk-opp[aria-invalid="true"]')?.focus());
      return;
    }

    setSubmitting(true);
    setSubmitError(null);
    try {
      const { paymentUrl } = await api.post<{ paymentUrl: string | null }>("/coaches/bookings", {
        coachId: id,
        opportunityId: oppId,
        sessionType,
        preSession: preSessionPayload(draft),
      });
      if (paymentUrl) window.location.href = paymentUrl;
      else setDone(true);
    } catch (err) {
      setSubmitError(err instanceof ApiError ? err.message : "Booking failed. Please try again.");
    } finally {
      setSubmitting(false);
    }
  }

  if (authLoading || loading) return <SkeletonPage variant="detail" />;
  if (!user) return null;

  if (!coach) {
    return (
      <div className="page-narrow">
        <EmptyState
          title="Coach not found"
          description="This profile may have been removed or is no longer active."
          action={<Link href="/coaches" className="btn-primary">See all coaches</Link>}
        />
      </div>
    );
  }

  const firstName = coach.name.split(" ")[0];

  if (done) {
    return (
      <div className="page-narrow">
        <div className="card card-pad py-10 text-center">
          <span className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-ok-soft text-ok">
            <CircleCheck size={24} aria-hidden="true" />
          </span>
          <h1 className="h2">Booking requested</h1>
          <p className="mx-auto mt-2 max-w-sm text-sm text-ink-soft">
            {firstName} will read your answers, review your request and confirm the session. You will get an email once they respond.
          </p>
          <Link href="/bookings" className="btn-primary mt-6">View my sessions</Link>
        </div>
      </div>
    );
  }

  const total = coach.sessionFeeUSD * (1 + coach.platformFeePercent / 100);

  return (
    <div className="page-narrow">
      <PageHeader
        back={{ href: `/coaches/${id}`, label: `Back to ${firstName}` }}
        eyebrow="Book a session"
        title={`Book with ${coach.name}`}
        description="Your answers go to your coach before the session, so the time is spent on what matters to you."
      />

      <form onSubmit={handleSubmit} noValidate className="space-y-8">
        <div className="card card-pad space-y-6">
          <div>
            <label htmlFor="bk-opp" className="label">Which scholarship is this for?</label>
            <select
              id="bk-opp"
              value={oppId}
              onChange={(e) => setOppId(e.target.value)}
              aria-invalid={!!oppError}
              aria-describedby={oppError ? "bk-opp-err" : undefined}
              className="input"
            >
              <option value="">Select a scholarship</option>
              {coach.scholarships.map((s) => (
                <option key={s.opportunityId} value={s.opportunityId}>{s.opportunityTitle}</option>
              ))}
            </select>
            {oppError && <p id="bk-opp-err" className="field-error">{oppError}</p>}
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
        </div>

        <section className="card card-pad" aria-labelledby="pre-heading">
          <h2 id="pre-heading" className="h3">Before your session</h2>
          <p className="mb-6 mt-1 text-sm text-slate">About two minutes. You can change these answers until the session takes place.</p>
          <PreSessionForm value={draft} onChange={setDraft} errors={errors} idPrefix="bk" />
        </section>

        <div className="card card-pad">
          <div className="flex items-center justify-between text-sm">
            <span className="text-slate">Total (including platform fee)</span>
            <span className="font-semibold tabular-nums text-ink">${total.toFixed(0)} USD</span>
          </div>
          {submitError && <Alert variant="danger" className="mt-4">{submitError}</Alert>}
          <button type="submit" disabled={submitting} aria-busy={submitting} className="btn-primary btn-block mt-4">
            {submitting ? "Sending request" : "Send booking request"}
          </button>
        </div>
      </form>
    </div>
  );
}
