"use client";

import { Chip } from "@/components/ui/Chip";
import { PRE_SESSION_FOCUS, PreSession, PreSessionFocus } from "@/lib/types";

/** Form state. Questions are edited as one box, one question per line. */
export interface PreSessionDraft {
  goal: string;
  focusAreas: PreSessionFocus[];
  successLooksLike: string;
  questionsText: string;
  currentStage: PreSession["currentStage"] | "";
  materialsReady: string[];
  biggestWorry: string;
  shareProfileWithCoach: boolean;
}

export type PreSessionErrors = Partial<Record<"goal" | "focusAreas" | "currentStage" | "questionsText", string>>;

export const emptyPreSession: PreSessionDraft = {
  goal: "",
  focusAreas: [],
  successLooksLike: "",
  questionsText: "",
  currentStage: "",
  materialsReady: [],
  biggestWorry: "",
  shareProfileWithCoach: false,
};

export function draftFromPreSession(p: PreSession): PreSessionDraft {
  return {
    goal: p.goal,
    focusAreas: p.focusAreas,
    successLooksLike: p.successLooksLike ?? "",
    questionsText: p.specificQuestions.join("\n"),
    currentStage: p.currentStage,
    materialsReady: p.materialsReady,
    biggestWorry: p.biggestWorry ?? "",
    shareProfileWithCoach: p.shareProfileWithCoach,
  };
}

const questionLines = (text: string) => text.split("\n").map((l) => l.trim()).filter(Boolean);

export function validatePreSession(d: PreSessionDraft): PreSessionErrors {
  const e: PreSessionErrors = {};
  if (d.goal.trim().length < 10) e.goal = "Tell your coach what you want from this session, in at least a sentence.";
  if (d.focusAreas.length === 0) e.focusAreas = "Pick at least one thing to focus on.";
  if (!d.currentStage) e.currentStage = "Tell us where you are in your application.";
  const lines = questionLines(d.questionsText);
  if (lines.length > 5) e.questionsText = "Keep it to 5 questions, one per line.";
  else if (lines.some((l) => l.length > 300)) e.questionsText = "Each question can be up to 300 characters.";
  return e;
}

export function preSessionPayload(d: PreSessionDraft) {
  return {
    goal: d.goal.trim(),
    focusAreas: d.focusAreas,
    successLooksLike: d.successLooksLike.trim() || undefined,
    specificQuestions: questionLines(d.questionsText),
    currentStage: d.currentStage as PreSession["currentStage"],
    materialsReady: d.materialsReady,
    biggestWorry: d.biggestWorry.trim() || undefined,
    shareProfileWithCoach: d.shareProfileWithCoach,
  };
}

const STAGES: { value: PreSession["currentStage"]; label: string }[] = [
  { value: "not_started", label: "Not started" },
  { value: "researching", label: "Researching" },
  { value: "drafting", label: "Drafting" },
  { value: "nearly_ready", label: "Nearly ready" },
];

const MATERIALS = ["Essay draft", "CV", "Reference letters", "Test score", "Transcripts"];

/**
 * Shared by the booking page and the "edit my answers" panel. The coach reads these answers
 * before the session, so every field exists to save time in the room.
 */
export default function PreSessionForm({
  value,
  onChange,
  errors,
  idPrefix = "ps",
}: {
  value: PreSessionDraft;
  onChange: (next: PreSessionDraft) => void;
  errors: PreSessionErrors;
  idPrefix?: string;
}) {
  const set = <K extends keyof PreSessionDraft>(key: K, v: PreSessionDraft[K]) => onChange({ ...value, [key]: v });
  const toggle = <T extends string>(list: T[], item: T) => (list.includes(item) ? list.filter((x) => x !== item) : [...list, item]);
  const id = (name: string) => `${idPrefix}-${name}`;

  return (
    <div className="space-y-6">
      <div>
        <label htmlFor={id("goal")} className="label">What do you want to achieve in this session?</label>
        <textarea
          id={id("goal")}
          rows={3}
          value={value.goal}
          maxLength={600}
          onChange={(e) => set("goal", e.target.value)}
          aria-invalid={!!errors.goal}
          aria-describedby={errors.goal ? id("goal-err") : undefined}
          placeholder="For example: decide which story to lead my leadership essay with."
          className="textarea"
        />
        {errors.goal && <p id={id("goal-err")} className="field-error">{errors.goal}</p>}
      </div>

      <fieldset>
        <legend className="label">What should the session focus on?</legend>
        <div className="mt-2 flex flex-wrap gap-2">
          {PRE_SESSION_FOCUS.map((f) => (
            <Chip key={f.value} active={value.focusAreas.includes(f.value)} onClick={() => set("focusAreas", toggle(value.focusAreas, f.value))}>
              {f.label}
            </Chip>
          ))}
        </div>
        {errors.focusAreas && <p className="field-error">{errors.focusAreas}</p>}
      </fieldset>

      <fieldset>
        <legend className="label">Where are you in your application?</legend>
        <div role="radiogroup" className="mt-2 grid grid-cols-2 gap-2 sm:grid-cols-4">
          {STAGES.map((s) => {
            const selected = value.currentStage === s.value;
            return (
              <button
                key={s.value}
                type="button"
                role="radio"
                aria-checked={selected}
                onClick={() => set("currentStage", s.value)}
                className={`min-h-touch rounded-xl px-3 py-2 text-sm font-medium transition-colors ${
                  selected ? "bg-forest-soft text-ink ring-2 ring-forest" : "bg-white text-ink-soft ring-1 ring-inset ring-control hover:bg-surface-2"
                }`}
              >
                {s.label}
              </button>
            );
          })}
        </div>
        {errors.currentStage && <p className="field-error">{errors.currentStage}</p>}
      </fieldset>

      <div>
        <label htmlFor={id("questions")} className="label">
          Specific questions for your coach <span className="font-normal text-slate">(optional, one per line, up to 5)</span>
        </label>
        <textarea
          id={id("questions")}
          rows={3}
          value={value.questionsText}
          onChange={(e) => set("questionsText", e.target.value)}
          aria-invalid={!!errors.questionsText}
          aria-describedby={errors.questionsText ? id("questions-err") : undefined}
          className="textarea"
        />
        {errors.questionsText && <p id={id("questions-err")} className="field-error">{errors.questionsText}</p>}
      </div>

      <fieldset>
        <legend className="label">
          What do you already have? <span className="font-normal text-slate">(optional)</span>
        </legend>
        <div className="mt-2 flex flex-wrap gap-2">
          {MATERIALS.map((m) => (
            <Chip key={m} active={value.materialsReady.includes(m)} onClick={() => set("materialsReady", toggle(value.materialsReady, m))}>
              {m}
            </Chip>
          ))}
        </div>
      </fieldset>

      <div>
        <label htmlFor={id("worry")} className="label">
          What worries you most? <span className="font-normal text-slate">(optional)</span>
        </label>
        <textarea id={id("worry")} rows={2} maxLength={400} value={value.biggestWorry} onChange={(e) => set("biggestWorry", e.target.value)} className="textarea !min-h-0" />
      </div>

      <div>
        <label htmlFor={id("success")} className="label">
          What would make this session a success? <span className="font-normal text-slate">(optional)</span>
        </label>
        <input id={id("success")} maxLength={300} value={value.successLooksLike} onChange={(e) => set("successLooksLike", e.target.value)} className="input" />
      </div>

      <label className="flex min-h-touch cursor-pointer items-start gap-3 rounded-lg bg-surface p-4">
        <input
          type="checkbox"
          checked={value.shareProfileWithCoach}
          onChange={(e) => set("shareProfileWithCoach", e.target.checked)}
          className="mt-0.5 h-5 w-5 shrink-0 accent-forest"
        />
        <span className="text-sm">
          <span className="block font-semibold text-ink">Share my profile with this coach (recommended)</span>
          <span className="mt-0.5 block text-ink-soft">
            Your coach will see your CV summary, how you match this scholarship and your coaching results, so you do not spend the session explaining your background. They will not see your essay text.
          </span>
        </span>
      </label>
    </div>
  );
}
