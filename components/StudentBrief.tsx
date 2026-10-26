"use client";

import { useEffect, useState } from "react";
import { api, ApiError } from "@/lib/api";
import { BookingBrief, PRE_SESSION_FOCUS } from "@/lib/types";
import { Alert, ErrorState } from "@/components/ui/States";
import { Skeleton } from "@/components/ui/Skeleton";

const STAGE_LABEL = { not_started: "Not started", researching: "Researching", drafting: "Drafting", nearly_ready: "Nearly ready" } as const;
const ELIGIBILITY_LABEL = {
  eligible: "Meets the requirements we can check",
  likely: "Likely eligible, some items to confirm",
  at_risk: "A hard requirement is not met",
  unknown: "Nothing to check yet",
} as const;

function Block({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="space-y-2">
      <h4 className="text-sm font-semibold text-ink">{title}</h4>
      {children}
    </section>
  );
}

const List = ({ items }: { items: string[] }) => (
  <ul className="list-disc space-y-1 pl-5 text-sm text-ink-soft">
    {items.map((i, n) => <li key={n}>{i}</li>)}
  </ul>
);

/** Everything a coach needs before a session: what the student wants, and where they stand on this scholarship. */
export default function StudentBrief({ bookingId }: { bookingId: string }) {
  const [brief, setBrief] = useState<BookingBrief | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    let live = true;
    setError(null);
    api
      .get<BookingBrief>(`/coaches/portal/bookings/${bookingId}/brief`)
      .then((d) => live && setBrief(d))
      .catch((e) => live && setError(e instanceof ApiError ? e.message : "Could not load the brief."));
    return () => {
      live = false;
    };
  }, [bookingId, attempt]);

  if (error) return <ErrorState title="The brief did not load" message={error} onRetry={() => setAttempt((n) => n + 1)} />;
  if (!brief) return <Skeleton className="h-48" />;

  const { preSession: ps, scholarship: sch, student: st } = brief;

  return (
    <div className="space-y-6 rounded-lg bg-surface p-4 sm:p-5">
      {ps ? (
        <Block title="What the student wants from this session">
          <p className="text-sm text-ink">{ps.goal}</p>
          <p className="text-sm text-ink-soft">
            <span className="text-slate">Focus:</span> {ps.focusAreas.map((f) => PRE_SESSION_FOCUS.find((x) => x.value === f)?.label ?? f).join(", ")}
            <br />
            <span className="text-slate">Stage:</span> {STAGE_LABEL[ps.currentStage]}
            {ps.materialsReady.length > 0 && (
              <>
                <br />
                <span className="text-slate">Already has:</span> {ps.materialsReady.join(", ")}
              </>
            )}
          </p>
          {ps.specificQuestions.length > 0 && (
            <div>
              <p className="text-sm text-slate">Their questions</p>
              <List items={ps.specificQuestions} />
            </div>
          )}
          {ps.biggestWorry && <p className="text-sm text-ink-soft"><span className="text-slate">Biggest worry:</span> {ps.biggestWorry}</p>}
          {ps.successLooksLike && <p className="text-sm text-ink-soft"><span className="text-slate">A good outcome:</span> {ps.successLooksLike}</p>}
        </Block>
      ) : (
        <Alert variant="warn">This student has not filled in the pre-session questionnaire.</Alert>
      )}

      <Block title="Scholarship">
        <p className="text-sm text-ink-soft">
          {sch.title}, {sch.provider} · {sch.country}
          {sch.deadline ? ` · closes ${new Date(sch.deadline).toLocaleDateString()}` : ""}
        </p>
        {sch.requirements.length > 0 && <List items={sch.requirements.map((r) => `${r.label} (${r.hard ? "required" : "preferred"})`)} />}
        {sch.essayPrompts.length > 0 && (
          <div>
            <p className="text-sm text-slate">Essay prompts</p>
            <List items={sch.essayPrompts.map((p) => `${p.label}: ${p.question}`)} />
          </div>
        )}
      </Block>

      {!st.profileShared ? (
        <Alert variant="info">{brief.note ?? "The student chose not to share their profile."}</Alert>
      ) : (
        <>
          {brief.fit && (
            <Block title="How they match this scholarship">
              <p className="text-sm text-ink">
                {ELIGIBILITY_LABEL[brief.fit.eligibility]} <span className="text-slate">(score {brief.fit.score} of 100)</span>
              </p>
              <p className="text-sm text-ink-soft">{brief.fit.summary}</p>
              {brief.fit.gaps.length > 0 && <List items={brief.fit.gaps.map((g) => `${g.requirement}: ${g.whatToDo}`)} />}
            </Block>
          )}

          {brief.aiCoaching && (
            <Block title="Their AI coaching result">
              {brief.aiCoaching.tier && <p className="text-sm text-ink">Position: <span className="font-semibold capitalize">{brief.aiCoaching.tier}</span></p>}
              {brief.aiCoaching.standoutFactors.length > 0 && (
                <div>
                  <p className="text-sm text-slate">Stand-out strengths</p>
                  <List items={brief.aiCoaching.standoutFactors} />
                </div>
              )}
              {brief.aiCoaching.weaknesses.length > 0 && (
                <div>
                  <p className="text-sm text-slate">Gaps identified</p>
                  <List items={brief.aiCoaching.weaknesses} />
                </div>
              )}
              {brief.aiCoaching.gapFromWinner && <p className="text-sm text-ink-soft">{brief.aiCoaching.gapFromWinner}</p>}
            </Block>
          )}

          <Block title="Background">
            {st.summary && <p className="text-sm text-ink-soft">{st.summary}</p>}
            {st.education && st.education.length > 0 && (
              <List items={st.education.map((e) => [e.degree, e.fieldOfStudy, e.institution, e.gpa && `grade ${e.gpa}`].filter(Boolean).join(", "))} />
            )}
            {st.experience && st.experience.length > 0 && (
              <div>
                <p className="text-sm text-slate">Work</p>
                <List items={st.experience.map((e) => `${e.role} at ${e.organization}${e.isCurrent ? " (current)" : ""}`)} />
              </div>
            )}
            {st.volunteerExperience && st.volunteerExperience.length > 0 && (
              <div>
                <p className="text-sm text-slate">Volunteering and community</p>
                <List items={st.volunteerExperience.map((e) => `${e.role} at ${e.organization}`)} />
              </div>
            )}
            {st.testScores && Object.keys(st.testScores).length > 0 && (
              <p className="text-sm text-ink-soft">
                <span className="text-slate">Test scores:</span>{" "}
                {Object.entries(st.testScores).filter(([, v]) => v).map(([k, v]) => `${k.toUpperCase()} ${v}`).join(", ")}
              </p>
            )}
            {st.skills && st.skills.length > 0 && <p className="text-sm text-ink-soft"><span className="text-slate">Skills:</span> {st.skills.join(", ")}</p>}
          </Block>

          {brief.progress && (
            <Block title="Where their application stands">
              <List
                items={[
                  `Essay drafts: ${brief.progress.essayDrafts.length === 0 ? "none yet" : brief.progress.essayDrafts.map((d) => `${d.title} (v${d.version}, ${d.characters} characters${d.reviewed ? ", reviewed" : ""})`).join("; ")}`,
                  `Reference letters uploaded: ${brief.progress.referenceLetters}`,
                  `Documents uploaded: ${brief.progress.documentsUploaded.length === 0 ? "none yet" : brief.progress.documentsUploaded.join(", ")}`,
                ]}
              />
              <p className="text-xs text-slate">Essay text stays private until the student chooses to share it with you.</p>
            </Block>
          )}
        </>
      )}
    </div>
  );
}
