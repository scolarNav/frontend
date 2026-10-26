import { Check, X } from "lucide-react";
import type { InterviewQuestion } from "@/lib/types";

/** Why the panel asks a question, a range of strong answers, and what to steer clear of. */
export function QuestionGuidance({ q }: { q: InterviewQuestion }) {
  return (
    <div className="space-y-6">
      {q.context && (
        <div>
          <h3 className="h3">Why they ask this</h3>
          <p className="mt-1.5 max-w-prose text-sm leading-relaxed text-ink-soft">{q.context}</p>
        </div>
      )}

      {q.goodAnswers && q.goodAnswers.length > 0 && (
        <div>
          <h3 className="h3">Strong ways to answer</h3>
          <p className="mt-1 text-sm text-slate">
            Pick the approach that fits your story. Replace each [bracket] with a real detail from your own life.
          </p>
          <ul className="mt-3 space-y-3">
            {q.goodAnswers.map((g) => (
              <li key={g.angle} className="rounded-lg bg-surface p-4">
                <p className="flex items-center gap-2 text-sm font-semibold text-ink">
                  <Check size={16} className="shrink-0 text-ok" aria-hidden="true" />
                  {g.angle}
                </p>
                <p className="mt-1.5 text-sm leading-relaxed text-ink-soft">{g.answer}</p>
              </li>
            ))}
          </ul>
        </div>
      )}

      {q.avoid && q.avoid.length > 0 && (
        <div>
          <h3 className="h3">Steer clear of</h3>
          <ul className="mt-2 space-y-1.5">
            {q.avoid.map((a) => (
              <li key={a} className="flex gap-2 text-sm text-ink-soft">
                <X size={16} className="mt-0.5 shrink-0 text-danger" aria-hidden="true" />
                <span>{a}</span>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
