"use client";

import { useEffect, useState, useCallback, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { api, ApiError } from "@/lib/api";
import { useAuth } from "@/lib/auth-context";
import { Interview, InterviewQuestion, Opportunity } from "@/lib/types";
import UpgradePrompt from "@/components/UpgradePrompt";

function ScoreBadge({ score }: { score: number }) {
  return (
    <span className="font-mono text-sm border border-rule px-2 py-0.5 text-slate">
      {score}/100
    </span>
  );
}

function AnswerScoreBadge({ score }: { score: number }) {
  return <span className="font-mono text-sm font-medium text-slate">{score}/10</span>;
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

  if (authLoading) return null;
  if (!user) return null;

  const isPro = user.subscription?.plan === "pro" &&
    (user.subscription?.status === "active" || user.subscription?.status === "trialing");

  if (!isPro) {
    return (
      <div className="max-w-2xl mx-auto px-6 py-16">
        <h1 className="font-display text-4xl text-ink">Mock Interview</h1>
        <p className="text-ink-soft mt-2 text-lg">Practice with questions tailored to your target scholarships.</p>
        <UpgradePrompt feature="interview" />
      </div>
    );
  }

  if (view === "active" && interview && currentQuestion) {
    const answered = interview.questions.filter((q) => !!q.answer);
    const total = interview.questions.length;

    return (
      <div className="max-w-2xl mx-auto px-6 py-14">
        <div className="flex items-center justify-between mb-8">
          <div>
            <p className="font-mono text-xs tracking-widest uppercase text-slate">Mock Interview</p>
            <h1 className="font-display text-2xl text-ink mt-0.5">{interview.opportunityTitle}</h1>
          </div>
          <span className="font-mono text-sm text-slate">{answered.length}/{total}</span>
        </div>

        {/* Progress */}
        <div className="h-1.5 bg-rule mb-8 rounded-full overflow-hidden">
          <div
            className="h-full bg-forest transition-all duration-500"
            style={{ width: `${(answered.length / total) * 100}%` }}
          />
        </div>

        {/* Previous answers */}
        {answered.length > 0 && (
          <div className="mb-8 space-y-4">
            {answered.map((q, i) => (
              <div key={i} className="case-card p-4">
                <div className="flex items-start justify-between gap-3 mb-2">
                  <p className="text-sm font-medium text-ink">{q.question}</p>
                  {q.feedback && <AnswerScoreBadge score={q.feedback.score} />}
                </div>
                <p className="text-sm text-ink-soft mb-3">{q.answer}</p>
                {q.feedback && (
                  <div className="text-xs text-slate space-y-1 border-t border-rule pt-2 mt-2">
                    {q.feedback.strengths.map((s, j) => (
                      <p key={j} className="text-slate">+ {s}</p>
                    ))}
                    {q.feedback.improvements.map((s, j) => (
                      <p key={j} className="text-ink-soft">→ {s}</p>
                    ))}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}

        {/* Current question */}
        <div className="case-card p-6 mb-6">
          <p className="font-mono text-xs text-slate uppercase tracking-widest mb-3">
            Question {currentQuestionIndex + 1} of {total}
          </p>
          <p className="text-ink font-display text-xl leading-snug mb-1">{currentQuestion.question}</p>
          <p className="text-xs text-slate mt-2">{currentQuestion.context}</p>
        </div>

        <textarea
          value={answer}
          onChange={(e) => setAnswer(e.target.value)}
          placeholder="Type your answer… aim for 3-5 focused sentences."
          rows={5}
          className="input resize-none"
        />
        {error && <p className="text-alert text-sm mt-2">{error}</p>}

        <button
          onClick={submitAnswer}
          disabled={submitting || !answer.trim()}
          className="btn-primary w-full mt-4"
        >
          {submitting ? "Evaluating…" : answered.length === total - 1 ? "Submit final answer" : "Submit answer"}
        </button>
      </div>
    );
  }

  if (view === "completed" && interview) {
    return (
      <div className="max-w-2xl mx-auto px-6 py-14">
        <p className="font-mono text-xs tracking-widest uppercase text-slate mb-1">Interview Complete</p>
        <h1 className="font-display text-4xl text-ink mb-2">{interview.opportunityTitle}</h1>

        <div className="flex items-center gap-4 mb-10">
          {interview.overallScore !== undefined && <ScoreBadge score={interview.overallScore} />}
          <p className="text-ink-soft text-sm">{interview.overallFeedback}</p>
        </div>

        <div className="space-y-6">
          {interview.questions.map((q, i) => (
            <div key={i} className="case-card p-5">
              <div className="flex items-start justify-between gap-3 mb-3">
                <p className="font-medium text-ink">{q.question}</p>
                {q.feedback && <AnswerScoreBadge score={q.feedback.score} />}
              </div>

              <div className="mb-3">
                <p className="text-xs font-mono text-slate uppercase tracking-wider mb-1">Your answer</p>
                <p className="text-sm text-ink-soft leading-relaxed">{q.answer}</p>
              </div>

              {q.feedback && (
                <>
                  <div className="mb-3">
                    <p className="text-xs font-mono text-slate uppercase tracking-wider mb-1">Model answer</p>
                    <p className="text-sm text-ink leading-relaxed">{q.feedback.modelAnswer}</p>
                  </div>

                  <div className="grid sm:grid-cols-2 gap-3 mt-3 pt-3 border-t border-rule">
                    <div>
                      {q.feedback.strengths.map((s, j) => (
                        <p key={j} className="text-xs text-forest">+ {s}</p>
                      ))}
                    </div>
                    <div>
                      {q.feedback.improvements.map((s, j) => (
                        <p key={j} className="text-xs text-brass">→ {s}</p>
                      ))}
                    </div>
                  </div>
                </>
              )}
            </div>
          ))}
        </div>

        <div className="mt-8 flex gap-3 flex-wrap">
          <button
            onClick={() => { setInterview(null); setView("select"); }}
            className="btn-primary text-sm"
          >
            Practice another opportunity
          </button>
          <Link href="/mentor" className="btn-secondary text-sm">
            Ask your mentor for tips
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto px-6 py-14">
      <p className="font-mono text-xs tracking-widest uppercase text-slate">Mock Interview</p>
      <h1 className="font-display text-4xl text-ink mt-1 mb-3">Practice your interview</h1>
      <p className="text-ink-soft mb-10">
        Select a scholarship and we'll generate 6 real interview questions tailored to it, then give you detailed feedback on every answer — including what a stronger response looks like.
      </p>

      {!user.cvData && (
        <div className="case-card p-5 mb-8">
          <p className="text-sm text-ink">Upload your CV first — the interview questions are tailored to your background.</p>
          <Link href="/cv" className="text-sm text-forest underline mt-1 block">Upload CV →</Link>
        </div>
      )}

      {opportunities.length === 0 ? (
        <div className="case-card p-6 mb-8">
          <p className="text-ink-soft text-sm">Save some opportunities first to practice their interviews.</p>
          <Link href="/" className="text-sm text-forest underline mt-2 block">Browse opportunities →</Link>
        </div>
      ) : (
        <div className="mb-8">
          <label className="block text-sm font-medium text-ink mb-3">Which scholarship are you practising for?</label>
          <div className="space-y-2">
            {opportunities.map((opp) => {
              const noInterview = opp.requiresInterview === false;
              return (
                <button
                  key={opp._id}
                  type="button"
                  onClick={() => !noInterview && setSelectedOppId(opp._id)}
                  disabled={noInterview}
                  className={`w-full text-left p-4 border rounded-lg transition-colors ${
                    noInterview
                      ? "border-rule opacity-50 cursor-not-allowed"
                      : selectedOppId === opp._id
                      ? "border-ink bg-white"
                      : "border-rule hover:border-ink-soft"
                  }`}
                >
                  <div className="flex items-center justify-between gap-2">
                    <p className="text-sm font-medium text-ink">{opp.title}</p>
                    {noInterview ? (
                      <span className="text-xs font-mono text-slate shrink-0">No interview</span>
                    ) : opp.requiresInterview ? (
                      <span className="text-xs font-mono text-forest shrink-0">Interview required</span>
                    ) : null}
                  </div>
                  <p className="text-xs text-slate mt-0.5">{opp.provider} · {opp.country}</p>
                </button>
              );
            })}
          </div>
        </div>
      )}

      {error && <p className="text-alert text-sm mb-4">{error}</p>}

      {(() => {
        const selectedOpp = opportunities.find((o) => o._id === selectedOppId);
        const noInterview = selectedOpp?.requiresInterview === false;
        return (
          <>
            {noInterview && (
              <p className="text-sm text-slate mb-3">
                This scholarship does not include an interview stage — no mock session needed.
              </p>
            )}
            <button
              onClick={startInterview}
              disabled={loading || !selectedOppId || !user.cvData || noInterview}
              className="btn-primary w-full mb-10"
            >
              {loading ? "Starting interview…" : "Start mock interview"}
            </button>
          </>
        );
      })()}

      {pastInterviews.length > 0 && (
        <div>
          <h2 className="font-mono text-xs tracking-widest uppercase text-slate mb-4">Past sessions</h2>
          <div className="space-y-2">
            {pastInterviews.map((iv) => (
              <button
                key={iv._id}
                onClick={async () => {
                  const { interview: loaded } = await api.get<{ interview: Interview }>(`/interviews/${iv._id}`);
                  setInterview(loaded);
                  setView(loaded.status === "completed" ? "completed" : "active");
                }}
                className="w-full text-left case-card-interactive p-4"
              >
                <div className="flex items-center justify-between">
                  <p className="text-sm font-medium text-ink">{iv.opportunityTitle}</p>
                  {iv.overallScore !== undefined ? (
                    <ScoreBadge score={iv.overallScore} />
                  ) : (
                    <span className="font-mono text-xs text-slate">In progress</span>
                  )}
                </div>
                <p className="text-xs text-slate mt-0.5">{new Date(iv.createdAt).toLocaleDateString()}</p>
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
