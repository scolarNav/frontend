import { ArrowRight, Check } from "lucide-react";

export interface ReviewIssue {
  location: string;
  problem: string;
  suggestion: string;
}

/**
 * The shared layout for AI feedback on essays, documents and reference letters:
 * an overall assessment, what works, what to fix, and optional extra notes.
 */
export function ReviewBlock({
  assessmentLabel = "Overall",
  assessment,
  strengths,
  issues,
  issuesLabel = "To fix",
  notes = [],
}: {
  assessmentLabel?: string;
  assessment: string;
  strengths: string[];
  issues: ReviewIssue[];
  issuesLabel?: string;
  notes?: { label: string; text: string }[];
}) {
  return (
    <div className="space-y-4">
      <div>
        <h4 className="text-sm font-semibold text-ink">{assessmentLabel}</h4>
        <p className="mt-1 text-sm leading-relaxed text-ink-soft">{assessment}</p>
      </div>

      {strengths.length > 0 && (
        <div>
          <h4 className="text-sm font-semibold text-ok">Working well</h4>
          <ul className="mt-1.5 space-y-1.5">
            {strengths.map((s, i) => (
              <li key={i} className="flex gap-2 text-sm text-ink-soft">
                <Check size={16} className="mt-0.5 shrink-0 text-ok" aria-hidden="true" />
                <span>{s}</span>
              </li>
            ))}
          </ul>
        </div>
      )}

      {issues.length > 0 && (
        <div>
          <h4 className="text-sm font-semibold text-danger">{issuesLabel}</h4>
          <ul className="mt-1.5 space-y-3">
            {issues.map((issue, i) => (
              <li key={i} className="rounded-lg bg-danger-soft px-4 py-3">
                <p className="text-sm text-slate">{issue.location}</p>
                <p className="text-sm text-ink">{issue.problem}</p>
                <p className="mt-1 flex gap-2 text-sm font-medium text-forest">
                  <ArrowRight size={16} className="mt-0.5 shrink-0" aria-hidden="true" />
                  <span>{issue.suggestion}</span>
                </p>
              </li>
            ))}
          </ul>
        </div>
      )}

      {notes.map((n) => (
        <div key={n.label}>
          <h4 className="text-sm font-semibold text-ink">{n.label}</h4>
          <p className="mt-1 text-sm leading-relaxed text-ink-soft">{n.text}</p>
        </div>
      ))}
    </div>
  );
}
