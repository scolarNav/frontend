"use client";

import { useEffect, useState } from "react";
import { ArrowRight, ChevronDown, RefreshCw } from "lucide-react";
import { ReadinessScore } from "@/lib/types";

const IMPACT_BADGE = {
  high: "badge-brand",
  medium: "",
  low: "",
};

function ScoreRing({ score }: { score: number }) {
  const [animated, setAnimated] = useState(false);
  const r = 56;
  const circ = 2 * Math.PI * r;
  const fill = circ * (1 - score / 100);

  const tone = score >= 75 ? "ok" : score >= 50 ? "warn" : "danger";
  const strokeClass = tone === "ok" ? "stroke-ok" : tone === "warn" ? "stroke-warn" : "stroke-danger";
  const textClass = tone === "ok" ? "text-ok" : tone === "warn" ? "text-warn" : "text-danger";

  useEffect(() => {
    const t = setTimeout(() => setAnimated(true), 120);
    return () => clearTimeout(t);
  }, []);

  return (
    <div className="relative h-36 w-36 shrink-0" role="img" aria-label={`Readiness score ${score} out of 100`}>
      <svg viewBox="0 0 128 128" className="h-full w-full -rotate-90" aria-hidden="true">
        <circle cx="64" cy="64" r={r} fill="none" className="stroke-surface-2" strokeWidth="10" />
        <circle
          cx="64"
          cy="64"
          r={r}
          fill="none"
          className={strokeClass}
          strokeWidth="10"
          strokeLinecap="round"
          strokeDasharray={circ}
          strokeDashoffset={animated ? fill : circ}
          style={{ transition: "stroke-dashoffset 900ms ease-out" }}
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span className={`font-display text-4xl leading-none ${textClass}`}>{score}</span>
        <span className="mt-0.5 text-xs text-slate">out of 100</span>
      </div>
    </div>
  );
}

function DimensionRow({
  label,
  score,
  max,
  feedback,
  actions,
}: {
  label: string;
  score: number;
  max: number;
  feedback: string;
  actions: string[];
}) {
  const [open, setOpen] = useState(false);
  const pct = (score / max) * 100;
  const barColor = pct >= 75 ? "bg-ok" : pct >= 50 ? "bg-warn" : "bg-danger";

  return (
    <li className="border-t border-rule first:border-t-0">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-expanded={open}
        className="flex min-h-touch w-full items-center gap-3 py-3 text-left"
      >
        <div className="min-w-0 flex-1">
          <div className="mb-1.5 flex items-center justify-between">
            <span className="text-sm font-medium text-ink">{label}</span>
            <span className="ml-3 shrink-0 text-sm text-slate">
              {score}/{max}
            </span>
          </div>
          <div className="h-2 overflow-hidden rounded-full bg-surface-2">
            <div className={`h-full rounded-full ${barColor}`} style={{ width: `${pct}%` }} />
          </div>
        </div>
        <ChevronDown size={18} aria-hidden="true" className={`shrink-0 text-slate transition-transform duration-150 ${open ? "rotate-180" : ""}`} />
      </button>

      {open && (
        <div className="space-y-2 pb-4">
          <p className="text-sm leading-relaxed text-ink-soft">{feedback}</p>
          {actions.length > 0 && (
            <ul className="space-y-1.5">
              {actions.map((a, i) => (
                <li key={i} className="flex gap-2 text-sm text-forest">
                  <ArrowRight size={16} className="mt-0.5 shrink-0" aria-hidden="true" />
                  <span>{a}</span>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </li>
  );
}

export default function ReadinessScoreCard({
  readiness,
  onRefresh,
  refreshing,
}: {
  readiness: ReadinessScore;
  onRefresh: () => void;
  refreshing: boolean;
}) {
  const label =
    readiness.overall >= 80
      ? "Strong"
      : readiness.overall >= 60
      ? "On track"
      : readiness.overall >= 40
      ? "Building up"
      : "Just starting";

  return (
    <div className="card overflow-hidden">
      <div className="flex items-start justify-between gap-4 px-5 pb-5 pt-5 sm:px-6 sm:pt-6">
        <div>
          <p className="eyebrow">Application readiness</p>
          <h2 className="mt-1 h2">{label}</h2>
          <p className="mt-1 text-sm text-slate">How prepared you are to apply. It is not a prediction of the outcome.</p>
        </div>
        <button
          type="button"
          onClick={onRefresh}
          disabled={refreshing}
          aria-busy={refreshing}
          className="btn-secondary btn-sm shrink-0"
        >
          {!refreshing && <RefreshCw size={14} aria-hidden="true" />}
          {refreshing ? "Recalculating" : "Refresh"}
        </button>
      </div>

      <div className="flex flex-col items-start gap-6 border-t border-rule px-5 py-6 sm:flex-row sm:px-6">
        <ScoreRing score={readiness.overall} />

        <div className="min-w-0 flex-1">
          <h3 className="mb-3 text-sm font-semibold text-ink">Top actions right now</h3>
          <ul className="space-y-3">
            {readiness.topActions.map((item, i) => (
              <li key={i} className="flex items-start gap-3">
                <span className={`badge mt-0.5 shrink-0 capitalize ${IMPACT_BADGE[item.impact]}`}>{item.impact}</span>
                <p className="text-sm leading-snug text-ink-soft">{item.action}</p>
              </li>
            ))}
          </ul>
        </div>
      </div>

      <div className="border-t border-rule px-5 pb-2 pt-4 sm:px-6">
        <h3 className="text-sm font-semibold text-ink">Score breakdown</h3>
        <ul className="mt-1">
          {readiness.dimensions.map((d) => (
            <DimensionRow key={d.id} {...d} />
          ))}
        </ul>
      </div>

      <p className="px-5 pb-5 pt-2 text-sm text-slate sm:px-6">
        Last updated {new Date(readiness.generatedAt).toLocaleDateString()}. Committees make the final call, so this score measures your preparation, not your odds.
      </p>
    </div>
  );
}
