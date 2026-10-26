"use client";

import { useState } from "react";
import { api, ApiError } from "@/lib/api";
import { PRE_SESSION_FOCUS, PreSession } from "@/lib/types";
import PreSessionForm, { draftFromPreSession, emptyPreSession, PreSessionDraft, PreSessionErrors, preSessionPayload, validatePreSession } from "@/components/PreSessionForm";
import { Alert } from "@/components/ui/States";

const STAGE_LABEL: Record<PreSession["currentStage"], string> = {
  not_started: "Not started",
  researching: "Researching",
  drafting: "Drafting",
  nearly_ready: "Nearly ready",
};

/** The student's own pre-session answers, with an edit form while the session is still ahead. */
export default function PreSessionPanel({
  bookingId,
  preSession,
  editable,
  onSaved,
}: {
  bookingId: string;
  preSession?: PreSession;
  editable: boolean;
  onSaved: (p: PreSession) => void;
}) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState<PreSessionDraft>(preSession ? draftFromPreSession(preSession) : emptyPreSession);
  const [errors, setErrors] = useState<PreSessionErrors>({});
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function save() {
    const found = validatePreSession(draft);
    setErrors(found);
    if (Object.keys(found).length > 0) return;
    setSaving(true);
    setError(null);
    try {
      const { preSession: saved } = await api.put<{ preSession: PreSession }>(`/coaches/bookings/${bookingId}/pre-session`, preSessionPayload(draft));
      onSaved(saved);
      setEditing(false);
    } catch (e) {
      setError(e instanceof ApiError ? e.message : "Could not save your answers.");
    } finally {
      setSaving(false);
    }
  }

  if (editing) {
    return (
      <div className="mt-4 border-t border-rule pt-4">
        <PreSessionForm value={draft} onChange={setDraft} errors={errors} idPrefix={`ps-${bookingId}`} />
        {error && <Alert variant="danger" className="mt-4">{error}</Alert>}
        <div className="mt-4 flex flex-wrap gap-3">
          <button type="button" onClick={save} disabled={saving} aria-busy={saving} className="btn-primary">
            {saving ? "Saving" : "Save answers"}
          </button>
          <button type="button" onClick={() => setEditing(false)} disabled={saving} className="btn-secondary">Cancel</button>
        </div>
      </div>
    );
  }

  return (
    <details className="group mt-4 border-t border-rule pt-2">
      <summary className="flex min-h-touch cursor-pointer list-none items-center justify-between gap-3 text-sm font-semibold text-forest">
        <span>{preSession ? "Your answers for the coach" : "Add your pre-session answers"}</span>
      </summary>
      {preSession ? (
        <div className="mt-2 space-y-3 text-sm">
          <div>
            <p className="text-slate">Goal</p>
            <p className="text-ink-soft">{preSession.goal}</p>
          </div>
          <div>
            <p className="text-slate">Focus</p>
            <p className="text-ink-soft">
              {preSession.focusAreas.map((f) => PRE_SESSION_FOCUS.find((x) => x.value === f)?.label ?? f).join(", ")} · {STAGE_LABEL[preSession.currentStage]}
            </p>
          </div>
          {preSession.specificQuestions.length > 0 && (
            <div>
              <p className="text-slate">Your questions</p>
              <ul className="list-disc pl-5 text-ink-soft">
                {preSession.specificQuestions.map((q) => <li key={q}>{q}</li>)}
              </ul>
            </div>
          )}
          <p className="text-slate">{preSession.shareProfileWithCoach ? "Your profile is shared with the coach." : "Your profile is not shared with the coach."}</p>
        </div>
      ) : (
        <p className="mt-2 text-sm text-slate">Your coach has not received any answers yet.</p>
      )}
      {editable && (
        <button type="button" onClick={() => setEditing(true)} className="btn-secondary mt-3">
          {preSession ? "Edit answers" : "Answer now"}
        </button>
      )}
    </details>
  );
}
