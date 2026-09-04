"use client";

import { useEffect, useState } from "react";
import { ReadinessScore } from "@/lib/types";

const IMPACT_COLORS = {
  high: "border border-rule text-ink",
  medium: "border border-rule text-slate",
  low: "border border-rule text-slate opacity-60",
};

function ScoreRing({ score }: { score: number }) {
  const [animated, setAnimated] = useState(false);
  const r = 56;
  const circ = 2 * Math.PI * r;
  const fill = circ * (1 - score / 100);

  const strokeColor =
    score >= 75 ? "#d3622c" : score >= 50 ? "#f0c845" : "#DC2626";

  useEffect(() => {
    const t = setTimeout(() => setAnimated(true), 120);
    return () => clearTimeout(t);
  }, []);

  return (
    <div className="relative shrink-0" style={{ width: 152, height: 152 }}>
      <svg viewBox="0 0 128 128" className="w-full h-full" style={{ transform: "rotate(-90deg)" }}>
        {/* Track */}
        <circle cx="64" cy="64" r={r} fill="none" stroke="#c5d5e8" strokeWidth="10" />
        {/* Fill */}
        <circle
          cx="64"
          cy="64"
          r={r}
          fill="none"
          stroke={strokeColor}
          strokeWidth="10"
          strokeLinecap="round"
          strokeDasharray={circ}
          strokeDashoffset={animated ? fill : circ}
          style={{ transition: "stroke-dashoffset 1.1s cubic-bezier(0.4,0,0.2,1)" }}
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span
          className="font-display leading-none"
          style={{ fontSize: 36, color: strokeColor }}
        >
          {score}
        </span>
        <span className="font-mono text-xs text-slate mt-0.5">/100</span>
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
  const barColor =
    pct >= 75 ? "bg-forest" : pct >= 50 ? "bg-brass" : "bg-alert";

  return (
    <div className="py-3 border-b border-rule last:border-0">
      <button
        onClick={() => setOpen((o) => !o)}
        className="w-full flex items-center gap-3 text-left"
      >
        <div className="flex-1 min-w-0">
          <div className="flex items-center justify-between mb-1.5">
            <span className="text-sm font-medium text-ink">{label}</span>
            <span className="font-mono text-xs text-slate ml-3 shrink-0">
              {score}/{max}
            </span>
          </div>
          <div className="h-1.5 bg-surface rounded-full overflow-hidden border border-rule">
            <div
              className={`h-full rounded-full ${barColor} transition-all duration-700`}
              style={{ width: `${pct}%` }}
            />
          </div>
        </div>
        <span className="text-slate text-xs shrink-0 ml-1">{open ? "▲" : "▼"}</span>
      </button>

      {open && (
        <div className="mt-3 pl-0 space-y-2">
          <p className="text-sm text-ink-soft leading-relaxed">{feedback}</p>
          {actions.length > 0 && (
            <ul className="space-y-1">
              {actions.map((a, i) => (
                <li key={i} className="flex gap-2 text-xs text-forest">
                  <span className="shrink-0">→</span>
                  <span>{a}</span>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </div>
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
      ? "On Track"
      : readiness.overall >= 40
      ? "Building Up"
      : "Just Starting";

  return (
    <div className="case-card overflow-hidden">
      {/* Header */}
      <div className="px-6 pt-6 pb-5 border-b border-rule flex items-center justify-between">
        <div>
          <p className="font-mono text-xs tracking-widest uppercase text-slate">
            Application Readiness
          </p>
          <h2 className="font-display text-2xl text-ink mt-0.5">{label}</h2>
          <p className="text-xs text-slate mt-1">How prepared you are to apply — not a prediction of outcome.</p>
        </div>
        <button
          onClick={onRefresh}
          disabled={refreshing}
          className="text-xs font-mono text-forest hover:underline disabled:opacity-40 transition-opacity"
        >
          {refreshing ? "Recalculating…" : "↻ Refresh"}
        </button>
      </div>

      {/* Score + top actions */}
      <div className="px-6 py-6 flex flex-col sm:flex-row gap-6 items-start">
        <ScoreRing score={readiness.overall} />

        <div className="flex-1 min-w-0">
          <p className="font-mono text-xs text-slate uppercase tracking-widest mb-3">
            Top actions right now
          </p>
          <div className="space-y-2.5">
            {readiness.topActions.map((item, i) => (
              <div key={i} className="flex items-start gap-2.5">
                <span
                  className={`mt-0.5 shrink-0 font-mono text-xs px-1.5 py-0.5 rounded ${IMPACT_COLORS[item.impact]}`}
                >
                  {item.impact}
                </span>
                <p className="text-sm text-ink-soft leading-snug">{item.action}</p>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Dimension breakdown */}
      <div className="px-6 pb-4 border-t border-rule pt-2">
        <p className="font-mono text-xs text-slate uppercase tracking-widest py-3">
          Score breakdown
        </p>
        {readiness.dimensions.map((d) => (
          <DimensionRow key={d.id} {...d} />
        ))}
      </div>

      <div className="px-6 pb-5">
        <p className="text-xs text-slate font-mono">
          Last updated {new Date(readiness.generatedAt).toLocaleDateString()} · Committees make the final call — this score measures your preparation, not your odds.
        </p>
      </div>
    </div>
  );
}
