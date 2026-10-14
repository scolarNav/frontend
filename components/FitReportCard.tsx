"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { CircleCheck, CircleHelp, CircleX } from "lucide-react";
import { api, ApiError } from "@/lib/api";
import { Alert, ErrorState } from "@/components/ui/States";
import { Skeleton } from "@/components/ui/Skeleton";
import type { FitReport, FitRequirement } from "@/lib/types";

const ELIGIBILITY: Record<FitReport["eligibility"], { label: string; badge: string }> = {
  eligible: { label: "Meets the requirements we can check", badge: "badge-ok" },
  likely: { label: "Likely eligible, some items to confirm", badge: "badge-info" },
  at_risk: { label: "A hard requirement is not met", badge: "badge-danger" },
  unknown: { label: "Nothing to check yet", badge: "badge-warn" },
};

const STATUS: Record<FitRequirement["status"], { label: string; Icon: typeof CircleCheck; tone: string }> = {
  met: { label: "Met", Icon: CircleCheck, tone: "text-ok" },
  not_met: { label: "Not met", Icon: CircleX, tone: "text-danger" },
  unknown: { label: "To confirm", Icon: CircleHelp, tone: "text-warn" },
};

function formatDate(iso: string | null): string {
  if (!iso) return "";
  return new Date(iso + "T00:00:00").toLocaleDateString(undefined, { day: "numeric", month: "short", year: "numeric" });
}

/** Instant, free eligibility check. Computed by the server with plain code, no AI involved. */
export default function FitReportCard({ opportunityId }: { opportunityId: string }) {
  const [report, setReport] = useState<FitReport | null>(null);
  const [hasCv, setHasCv] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    let live = true;
    setError(null);
    api
      .get<{ report: FitReport; hasCv: boolean }>(`/applications/${opportunityId}/fit`)
      .then((d) => {
        if (!live) return;
        setReport(d.report);
        setHasCv(d.hasCv);
      })
      .catch((e) => live && setError(e instanceof ApiError ? e.message : "Could not run the eligibility check."));
    return () => {
      live = false;
    };
  }, [opportunityId, attempt]);

  if (error) return <ErrorState title="Eligibility check did not load" message={error} onRetry={() => setAttempt((n) => n + 1)} />;
  if (!report) return <Skeleton className="h-64" />;

  const e = ELIGIBILITY[report.eligibility];

  return (
    <section className="card card-pad" aria-labelledby="fit-heading">
      <p className="eyebrow">Free for everyone</p>
      <h2 id="fit-heading" className="h2 mt-1">Eligibility check</h2>
      <p className="mt-1 max-w-prose text-sm text-slate">Checked instantly against this scholarship&apos;s listed requirements. It does not use AI.</p>

      {!hasCv && (
        <Alert variant="warn" className="mt-4">
          <p>Grades, experience and test scores can only be checked once your CV is on file.</p>
          <Link href="/cv" className="mt-1 inline-block font-semibold underline">Upload your CV</Link>
        </Alert>
      )}

      <div className="mt-5 flex flex-wrap items-center gap-3">
        <span className={`badge ${e.badge}`}>{e.label}</span>
        <span className="text-sm text-slate">
          Confidence in this check: <span className="font-semibold text-ink">{report.confidence}</span>
        </span>
      </div>
      <p className="mt-3 max-w-prose text-sm leading-relaxed text-ink-soft">{report.summary}</p>

      <ul className="mt-5 divide-y divide-rule">
        {report.requirements.map((r) => {
          const s = STATUS[r.status];
          return (
            <li key={r.label} className="flex gap-3 py-3">
              <s.Icon size={20} className={`mt-0.5 shrink-0 ${s.tone}`} aria-hidden="true" />
              <div className="min-w-0">
                <p className="text-sm font-semibold text-ink">
                  {r.label} <span className="ml-1 text-xs font-normal text-slate">{r.isHard ? "Required" : "Preferred"}</span>
                </p>
                <p className="mt-0.5 text-sm text-ink-soft">
                  <span className="font-semibold">{s.label}.</span> {r.evidence}
                </p>
                {r.action && r.status !== "met" && <p className="mt-0.5 text-sm text-slate">Next: {r.action}</p>}
              </div>
            </li>
          );
        })}
      </ul>

      <h3 className="h3 mt-6">Fit with your goals</h3>
      <ul className="mt-2 space-y-1.5">
        {report.preferences.map((p) => (
          <li key={p.label} className="text-sm text-ink-soft">
            <span className="font-semibold text-ink">{p.label}:</span>{" "}
            {p.status === "match" ? "Matches. " : p.status === "mismatch" ? "Does not match. " : "Unclear. "}
            {p.detail}
          </li>
        ))}
      </ul>

      <details className="mt-6 group">
        <summary className="flex min-h-touch cursor-pointer list-none items-center justify-between gap-3 text-sm font-semibold text-forest">
          Suggested timeline{report.deadline ? ` to the ${formatDate(report.deadline)} deadline` : ""}
        </summary>
        <ol className="mt-2 space-y-2">
          {report.timeline.map((t) => (
            <li key={t.milestone} className="text-sm text-ink-soft">
              <span className="font-semibold text-ink">{t.targetDate ? formatDate(t.targetDate) : ""}</span> {t.milestone}.{" "}
              <span className="text-slate">{t.deliverable}.</span>
            </li>
          ))}
        </ol>
      </details>
    </section>
  );
}
