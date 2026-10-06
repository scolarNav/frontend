"use client";

import { useEffect, useState, useCallback, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { api, ApiError } from "@/lib/api";
import { useAuth } from "@/lib/auth-context";
import { Interview, InterviewQuestion, Opportunity } from "@/lib/types";
import UpgradePrompt from "@/components/UpgradePrompt";
import { Alert, EmptyState } from "@/components/ui/States";
import { ArrowRight, Check, Mic } from "lucide-react";
import { PageHeader } from "@/components/ui/PageHeader";
import { SkeletonPage } from "@/components/ui/Skeleton";
import { ProgressBar } from "@/components/ui/Spinner";

function ScoreBadge({ score }: { score: number }) {
  return <span className="badge badge-brand">{score}/100</span>;
}

function AnswerScoreBadge({ score }: { score: number }) {
  return <span className="badge shrink-0">{score}/10</span>;
}

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
  const [view, setView] = useState<"select" | "active" | "completed" | "history">("select");

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

  async function startInterview() {
    if (!selectedOppId) { setError("Select an opportunity first."); return; }
    setLoading(true);
    setError(null);
    try {
      const { interview: iv } = await api.post<{ interview: Interview; resumed: boolean }>(
        `/interviews/${selectedOppId}/start`
      );
      setInterview(iv);
      setView(iv.status === "completed" ? "completed" : "active");
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Couldn't start interview.");
    } finally {
      setLoading(false);
    }
  }

  async function submitAnswer() {
    if (!interview || !answer.trim()) return;
    setSubmitting(true);
    setError(null);
    try {
      const { interview: updated, completed } = await api.post<{ interview: Interview; completed: boolean; currentQuestionIndex: number | null }>(
        `/interviews/${interview._id}/answer`,
        { answer: answer.trim() }
      );
      setInterview(updated);
      setAnswer("");
      if (completed) setView("completed");
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Couldn't submit answer.");
    } finally {
      setSubmitting(false);
    }
  }

  const currentQuestionIndex = interview?.questions.findIndex((q) => !q.answer) ?? -1;
  const currentQuestion: InterviewQuestion | undefined = interview?.questions[currentQuestionIndex];

  if (authLoading) return <SkeletonPage variant="list" />;
  if (!user) return null;

  const isPro = user.subscription?.plan === "pro" &&
    (user.subscription?.status === "active" || user.subscription?.status === "trialing");

  if (!isPro) {
    return (
      <div className="page-narrow">
        <PageHeader eyebrow="Pro" title="Mock interview" description="Practice with questions tailored to your target scholarships." />
        <UpgradePrompt feature="interview" />
      </div>
    );
  }

  const feedbackList = (items: string[], kind: "good" | "improve") => (
    <ul className="space-y-1.5">
      {items.map((s, j) => (
        <li key={j} className={`flex gap-2 text-sm ${kind === "good" ? "text-ok" : "text-ink-soft"}`}>
          {kind === "good" ? (
            <Check size={16} className="mt-0.5 shrink-0" aria-hidden="true" />
          ) : (
            <ArrowRight size={16} className="mt-0.5 shrink-0 text-warn" aria-hidden="true" />
          )}
          <span>{s}</span>
        </li>
      ))}
    </ul>
  );

  if (view === "active" && interview && currentQuestion) {
    const answered = interview.questions.filter((q) => !!q.answer);
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

        {answered.length > 0 && (
          <ul className="mb-8 space-y-3">
            {answered.map((q, i) => (
              <li key={i} className="card p-4">
                <div className="mb-2 flex items-start justify-between gap-3">
                  <p className="text-sm font-semibold text-ink">{q.question}</p>
                  {q.feedback && <AnswerScoreBadge score={q.feedback.score} />}
                </div>
                <p className="text-sm text-ink-soft">{q.answer}</p>
                {q.feedback && (
                  <div className="mt-3 space-y-2 border-t border-rule pt-3">
                    {feedbackList(q.feedback.strengths, "good")}
                    {feedbackList(q.feedback.improvements, "improve")}
                  </div>
                )}
              </li>
            ))}
          </ul>
        )}

        <section className="card card-pad mb-5" aria-labelledby="current-question">
          <h2 id="current-question" className="font-display text-xl leading-snug text-ink">{currentQuestion.question}</h2>
          <p className="mt-2 text-sm text-slate">{currentQuestion.context}</p>
        </section>

        <label htmlFor="iv-answer" className="label">Your answer</label>
        <textarea
          id="iv-answer"
          value={answer}
          onChange={(e) => setAnswer(e.target.value)}
          placeholder="Aim for 3 to 5 focused sentences."
          rows={6}
          disabled={submitting}
          className="textarea"
        />
        {error && <Alert variant="danger" className="mt-3">{error}</Alert>}

        <button
          type="button"
          onClick={submitAnswer}
          disabled={submitting || !answer.trim()}
          aria-busy={submitting}
          className="btn-primary btn-block mt-4"
        >
          {submitting ? "Evaluating your answer" : answered.length === total - 1 ? "Submit final answer" : "Submit answer"}
        </button>
        {submitting && (
          <div className="mt-4">
            <ProgressBar label="Evaluating your answer" />
          </div>
        )}
      </div>
    );
  }

  if (view === "completed" && interview) {
    return (
      <div className="page-narrow">
        <PageHeader eyebrow="Interview complete" title={interview.opportunityTitle} />

        <section className="card card-pad mb-8 flex flex-col gap-4 sm:flex-row sm:items-center">
          {interview.overallScore !== undefined && (
            <div className="shrink-0 text-center sm:text-left">
              <p className="font-display text-5xl text-ink">{interview.overallScore}</p>
              <p className="text-sm text-slate">out of 100</p>
            </div>
          )}
          <p className="text-sm leading-relaxed text-ink-soft">{interview.overallFeedback}</p>
        </section>

        <ol className="space-y-5">
          {interview.questions.map((q, i) => (
            <li key={i} className="card card-pad">
              <div className="mb-4 flex items-start justify-between gap-3">
                <h2 className="font-semibold text-ink">{q.question}</h2>
                {q.feedback && <AnswerScoreBadge score={q.feedback.score} />}
              </div>

              <div className="mb-4">
                <p className="eyebrow mb-1">Your answer</p>
                <p className="text-sm leading-relaxed text-ink-soft">{q.answer}</p>
              </div>

              {q.feedback && (
                <>
                  <div className="mb-4">
                    <p className="eyebrow mb-1">Model answer</p>
                    <p className="text-sm leading-relaxed text-ink">{q.feedback.modelAnswer}</p>
                  </div>

                  <div className="grid gap-4 border-t border-rule pt-4 sm:grid-cols-2">
                    <div>
                      <p className="mb-2 text-sm font-semibold text-ink">What worked</p>
                      {feedbackList(q.feedback.strengths, "good")}
                    </div>
                    <div>
                      <p className="mb-2 text-sm font-semibold text-ink">What to improve</p>
                      {feedbackList(q.feedback.improvements, "improve")}
                    </div>
                  </div>
                </>
              )}
            </li>
          ))}
        </ol>

        <div className="mt-8 flex flex-wrap gap-3">
          <button type="button" onClick={() => { setInterview(null); setView("select"); }} className="btn-primary">
            Practice another opportunity
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
        title="Practice your interview"
        description="Select a scholarship and we will generate 6 interview questions tailored to it, then give you detailed feedback on every answer, including what a stronger response looks like."
      />

      <div className="space-y-6">
        {!user.cvData && (
          <Alert variant="warn">
            <p>Upload your CV first. The interview questions are tailored to your background.</p>
            <Link href="/cv" className="mt-1 inline-block font-semibold underline">Upload CV</Link>
          </Alert>
        )}

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

        <div>
          <button
            type="button"
            onClick={startInterview}
            disabled={loading || !selectedOppId || !user.cvData || noInterview}
            aria-busy={loading}
            className="btn-primary btn-block"
          >
            {loading ? "Preparing your questions" : "Start mock interview"}
          </button>
          {loading && (
            <div className="mt-4">
              <ProgressBar label="Preparing your questions" />
            </div>
          )}
        </div>

        {pastInterviews.length > 0 && (
          <section aria-labelledby="past-heading" className="pt-4">
            <h2 id="past-heading" className="h3 mb-3">Past sessions</h2>
            <ul className="space-y-2">
              {pastInterviews.map((iv) => (
                <li key={iv._id}>
                  <button
                    type="button"
                    onClick={async () => {
                      const { interview: loaded } = await api.get<{ interview: Interview }>(`/interviews/${iv._id}`);
                      setInterview(loaded);
                      setView(loaded.status === "completed" ? "completed" : "active");
                    }}
                    className="card-interactive min-h-touch w-full p-4 text-left"
                  >
                    <span className="flex items-center justify-between gap-3">
                      <span className="text-sm font-semibold text-ink">{iv.opportunityTitle}</span>
                      {iv.overallScore !== undefined ? <ScoreBadge score={iv.overallScore} /> : <span className="badge">In progress</span>}
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
