"use client";

import { useEffect, useState, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { api, ApiError } from "@/lib/api";
import { useAuth } from "@/lib/auth-context";
import { Interview, InterviewQuestion, Opportunity } from "@/lib/types";
import UpgradePrompt from "@/components/UpgradePrompt";
import { QuestionGuidance } from "@/components/QuestionGuidance";
import { Alert, EmptyState } from "@/components/ui/States";
import { Mic } from "lucide-react";
import { PageHeader } from "@/components/ui/PageHeader";
import { SkeletonPage } from "@/components/ui/Skeleton";

export default function InterviewPage() {
  return (
    <Suspense>
      <InterviewPageInner />
    </Suspense>
  );
}

function InterviewPageInner() {
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();
  const searchParams = useSearchParams();
  const opportunityId = searchParams.get("opportunity");

  const [opportunities, setOpportunities] = useState<Opportunity[]>([]);
  const [selectedOppId, setSelectedOppId] = useState<string>(opportunityId || "");
  const [interview, setInterview] = useState<Interview | null>(null);
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [answer, setAnswer] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pastInterviews, setPastInterviews] = useState<any[]>([]);
  const [view, setView] = useState<"select" | "active" | "completed">("select");
  // The question the student has just answered. While set, we show how strong answers look.
  const [reviewing, setReviewing] = useState<InterviewQuestion | null>(null);

  useEffect(() => {
    if (!authLoading && !user) router.push("/login");
  }, [authLoading, user, router]);

  useEffect(() => {
    if (!user) return;
    if (user.savedOpportunities.length === 0) return;

    Promise.all(
      user.savedOpportunities.slice(0, 15).map((s) =>
        api.get<{ opportunity: Opportunity }>(`/opportunities/${s.opportunity}`, { auth: false })
          .then((r) => r.opportunity)
          .catch(() => null)
      )
    ).then((results) => setOpportunities(results.filter(Boolean) as Opportunity[]));

    api.get<{ interviews: any[] }>("/interviews")
      .then(({ interviews }) => setPastInterviews(interviews))
      .catch(() => {});
  }, [user]);

  function open(iv: Interview) {
    setInterview(iv);
    setReviewing(null);
    setAnswer("");
    setView(iv.status === "completed" ? "completed" : "active");
  }

  async function startInterview() {
    if (!selectedOppId) { setError("Select an opportunity first."); return; }
    setLoading(true);
    setError(null);
    try {
      const { interview: iv } = await api.post<{ interview: Interview; resumed: boolean }>(
        `/interviews/${selectedOppId}/start`
      );
      open(iv);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Couldn't start interview.");
    } finally {
      setLoading(false);
    }
  }

  async function submitAnswer() {
    if (!interview || answer.trim().length < 10) return;
    setSubmitting(true);
    setError(null);
    try {
      const { interview: updated, guidance } = await api.post<{
        interview: Interview;
        guidance: InterviewQuestion;
        completed: boolean;
      }>(`/interviews/${interview._id}/answer`, { answer: answer.trim() });
      setInterview(updated);
      setReviewing(guidance);
      setAnswer("");
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Couldn't submit answer.");
    } finally {
      setSubmitting(false);
    }
  }

  function nextQuestion() {
    setReviewing(null);
    if (interview?.status === "completed") setView("completed");
  }

  const currentQuestionIndex = interview?.questions.findIndex((q) => !q.answeredAt) ?? -1;
  const currentQuestion: InterviewQuestion | undefined = interview?.questions[currentQuestionIndex];

  if (authLoading) return <SkeletonPage variant="list" />;
  if (!user) return null;

  const isPro = user.subscription?.plan === "pro" &&
    (user.subscription?.status === "active" || user.subscription?.status === "trialing");

  if (!isPro) {
    return (
      <div className="page-narrow">
        <PageHeader eyebrow="Pro" title="Mock interview" description="Practise the questions scholarship panels ask, and see what strong answers look like." />
        <UpgradePrompt feature="interview" />
      </div>
    );
  }

  // Just answered: show the panel's motive and a range of strong answers.
  if (view === "active" && interview && reviewing) {
    const total = interview.questions.length;
    const answeredCount = interview.questions.filter((q) => !!q.answeredAt).length;
    const last = interview.status === "completed";
    return (
      <div className="page-narrow">
        <PageHeader eyebrow="Mock interview" title={interview.opportunityTitle} />
        <p className="mb-4 text-sm font-semibold text-ink">Question {answeredCount} of {total}</p>

        <section className="card card-pad" aria-labelledby="reviewed-question">
          <h2 id="reviewed-question" className="font-display text-xl leading-snug text-ink">{reviewing.question}</h2>
          <p className="mt-2 text-sm text-slate">
            Your answer was not saved or marked. Compare it with the approaches below and tighten it.
          </p>
          <div className="mt-6 border-t border-rule pt-6">
            <QuestionGuidance q={reviewing} />
          </div>
        </section>

        <button type="button" onClick={nextQuestion} className="btn-primary btn-block mt-6">
          {last ? "See all questions" : "Next question"}
        </button>
      </div>
    );
  }

  if (view === "active" && interview && currentQuestion) {
    const answered = interview.questions.filter((q) => !!q.answeredAt);
    const total = interview.questions.length;

    return (
      <div className="page-narrow">
        <PageHeader eyebrow="Mock interview" title={interview.opportunityTitle} />

        <div className="mb-8">
          <div className="mb-2 flex items-center justify-between">
            <p className="text-sm font-semibold text-ink">Question {currentQuestionIndex + 1} of {total}</p>
            <p className="text-sm text-slate">{answered.length} answered</p>
          </div>
          <div className="h-2 overflow-hidden rounded-full bg-surface-2" role="progressbar" aria-valuenow={answered.length} aria-valuemin={0} aria-valuemax={total} aria-label="Interview progress">
            <div className="h-full rounded-full bg-forest transition-all duration-500" style={{ width: `${(answered.length / total) * 100}%` }} />
          </div>
        </div>

        <section className="card card-pad mb-5" aria-labelledby="current-question">
          <h2 id="current-question" className="font-display text-xl leading-snug text-ink">{currentQuestion.question}</h2>
        </section>

        <label htmlFor="iv-answer" className="label">Your answer</label>
        <textarea
          id="iv-answer"
          value={answer}
          onChange={(e) => setAnswer(e.target.value)}
          placeholder="Write the answer you would give, or say it out loud and jot down the key points."
          rows={6}
          disabled={submitting}
          className="textarea"
        />
        <p className="help">
          Nobody reads this. It is not saved or scored. Committing to an answer first makes the comparison on the next screen useful.
        </p>
        {error && <Alert variant="danger" className="mt-3">{error}</Alert>}

        <button
          type="button"
          onClick={submitAnswer}
          disabled={submitting || answer.trim().length < 10}
          aria-busy={submitting}
          className="btn-primary btn-block mt-4"
        >
          {submitting ? "Opening the guide" : "Show me strong answers"}
        </button>
      </div>
    );
  }

  if (view === "completed" && interview) {
    return (
      <div className="page-narrow">
        <PageHeader eyebrow="Practice complete" title={interview.opportunityTitle} description={interview.overallFeedback} />

        <ol className="space-y-3">
          {interview.questions.map((q, i) => (
            <li key={q.key ?? i}>
              <details className="card group">
                <summary className="flex min-h-touch cursor-pointer list-none items-start justify-between gap-3 p-4 sm:p-5">
                  <span className="font-semibold text-ink">{i + 1}. {q.question}</span>
                  <span className="shrink-0 text-sm font-semibold text-forest group-open:hidden">Show guide</span>
                  <span className="hidden shrink-0 text-sm font-semibold text-forest group-open:inline">Hide guide</span>
                </summary>
                <div className="border-t border-rule p-4 sm:p-5">
                  <QuestionGuidance q={q} />
                </div>
              </details>
            </li>
          ))}
        </ol>

        <div className="mt-8 flex flex-wrap gap-3">
          <button type="button" onClick={() => { setInterview(null); setView("select"); }} className="btn-primary">
            Practise another scholarship
          </button>
          <Link href="/mentor" className="btn-secondary">
            Ask your mentor for tips
          </Link>
        </div>
      </div>
    );
  }

  const selectedOpp = opportunities.find((o) => o._id === selectedOppId);
  const noInterview = selectedOpp?.requiresInterview === false;

  return (
    <div className="page-narrow">
      <PageHeader
        eyebrow="Mock interview"
        title="Practise your interview"
        description="Pick a scholarship and work through 8 questions panels commonly ask. After each answer you see why they ask it and a range of strong ways to respond."
      />

      <div className="space-y-6">
        {opportunities.length === 0 ? (
          <EmptyState
            icon={Mic}
            title="Save an opportunity to practise"
            description="Mock interviews are built from the opportunities you have saved."
            action={<Link href="/" className="btn-primary">Browse opportunities</Link>}
          />
        ) : (
          <fieldset>
            <legend className="label">Which scholarship are you practising for?</legend>
            <div role="radiogroup" className="mt-2 space-y-2">
              {opportunities.map((opp) => {
                const none = opp.requiresInterview === false;
                const selected = selectedOppId === opp._id;
                return (
                  <button
                    key={opp._id}
                    type="button"
                    role="radio"
                    aria-checked={selected}
                    onClick={() => !none && setSelectedOppId(opp._id)}
                    disabled={none}
                    className={`flex min-h-touch w-full items-start gap-3 rounded-xl p-4 text-left transition-colors disabled:cursor-not-allowed disabled:opacity-50 ${
                      selected ? "bg-white ring-2 ring-forest" : "bg-white ring-1 ring-inset ring-rule-strong hover:bg-surface-2"
                    }`}
                  >
                    <span
                      className={`mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full border-2 ${
                        selected ? "border-forest" : "border-control"
                      }`}
                    >
                      {selected && <span className="h-2.5 w-2.5 rounded-full bg-forest" />}
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="flex items-center justify-between gap-2">
                        <span className="text-sm font-semibold text-ink">{opp.title}</span>
                        {none ? (
                          <span className="badge shrink-0">No interview</span>
                        ) : opp.requiresInterview ? (
                          <span className="badge badge-brand shrink-0">Interview required</span>
                        ) : null}
                      </span>
                      <span className="mt-0.5 block text-sm text-slate">{opp.provider} · {opp.country}</span>
                    </span>
                  </button>
                );
              })}
            </div>
          </fieldset>
        )}

        {error && <Alert variant="danger">{error}</Alert>}

        {noInterview && (
          <p className="text-sm text-slate">This scholarship does not include an interview stage, so no mock session is needed.</p>
        )}

        <button
          type="button"
          onClick={startInterview}
          disabled={loading || !selectedOppId || noInterview}
          aria-busy={loading}
          className="btn-primary btn-block"
        >
          {loading ? "Starting" : "Start mock interview"}
        </button>

        {pastInterviews.length > 0 && (
          <section aria-labelledby="past-heading" className="pt-4">
            <h2 id="past-heading" className="h3 mb-3">Past sessions</h2>
            <ul className="space-y-2">
              {pastInterviews.map((iv) => (
                <li key={iv._id}>
                  <button
                    type="button"
                    onClick={async () => {
                      try {
                        const { interview: loaded } = await api.get<{ interview: Interview }>(`/interviews/${iv._id}`);
                        open(loaded);
                      } catch (err) {
                        setError(err instanceof ApiError ? err.message : "Couldn't open that session.");
                      }
                    }}
                    className="card-interactive min-h-touch w-full p-4 text-left"
                  >
                    <span className="flex items-center justify-between gap-3">
                      <span className="text-sm font-semibold text-ink">{iv.opportunityTitle}</span>
                      <span className={`badge ${iv.status === "completed" ? "badge-ok" : ""}`}>
                        {iv.status === "completed" ? "Completed" : "In progress"}
                      </span>
                    </span>
                    <span className="mt-0.5 block text-sm text-slate">{new Date(iv.createdAt).toLocaleDateString()}</span>
                  </button>
                </li>
              ))}
            </ul>
          </section>
        )}
      </div>
    </div>
  );
}
