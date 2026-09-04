import Link from "next/link";
import { Opportunity } from "@/lib/types";

export type CardVariant = "featured" | "default" | "compact";

const TYPE_LABELS: Record<string, string> = {
  scholarship: "Scholarship",
  study_program: "Study Program",
  immigration_pathway: "Immigration",
  incubator: "Incubator",
  fellowship: "Fellowship",
};

function daysUntil(dateStr?: string): number | null {
  if (!dateStr) return null;
  const diff = new Date(dateStr).getTime() - Date.now();
  return Math.ceil(diff / (1000 * 60 * 60 * 24));
}

function formatShortDate(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString("en-GB", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

type StatusKind = "open" | "closing-soon" | "urgent" | "opening-soon" | "get-ready" | "closed" | "tba";

function getStatus(d: number | null, o: number | null): StatusKind {
  if (o !== null && o > 0) return o <= 14 ? "get-ready" : "opening-soon";
  if (d === null) return "tba";
  if (d < 0) return "closed";
  if (d <= 3) return "urgent";
  if (d <= 14) return "closing-soon";
  return "open";
}

const STATUS_CONFIG: Record<StatusKind, {
  label: string;
  bg: string;
  color: string;
  dot: string;
  borderColor: string;
  pulse?: boolean;
}> = {
  urgent:         { label: "CLOSING", bg: "#FEF2F2", color: "#DC2626", dot: "#DC2626", borderColor: "#FCA5A5", pulse: true },
  "closing-soon": { label: "CLOSING SOON", bg: "#FFF7ED", color: "#D97706", dot: "#F59E0B", borderColor: "#FCD34D" },
  open:           { label: "OPEN NOW", bg: "#F0FDF4", color: "#15803D", dot: "#22C55E", borderColor: "#86EFAC" },
  "get-ready":    { label: "OPENS SOON", bg: "#EFF6FF", color: "#1D4ED8", dot: "#60A5FA", borderColor: "#93C5FD" },
  "opening-soon": { label: "UPCOMING", bg: "#EFF6FF", color: "#1D4ED8", dot: "#93C5FD", borderColor: "#BFDBFE" },
  closed:         { label: "CLOSED", bg: "#F8FAFC", color: "#94A3B8", dot: "#CBD5E1", borderColor: "#E2E8F0" },
  tba:            { label: "DATES TBA", bg: "#F8FAFC", color: "#94A3B8", dot: "#CBD5E1", borderColor: "#E2E8F0" },
};

function ApplicationWindow({
  status, d, o, deadline, applicationOpens,
}: {
  status: StatusKind;
  d: number | null;
  o: number | null;
  deadline?: string;
  applicationOpens?: string;
}) {
  if (status === "urgent") {
    return (
      <div className="mt-auto pt-4 border-t border-rule">
        {applicationOpens && (
          <p className="font-mono text-[0.65rem] text-slate/50 mb-0.5">
            Opened {formatShortDate(applicationOpens)}
          </p>
        )}
        <p className="font-mono text-xs font-medium" style={{ color: "#DC2626" }}>
          <span
            className="inline-block w-1.5 h-1.5 rounded-full mr-1.5 align-middle animate-pulse"
            style={{ backgroundColor: "#DC2626" }}
          />
          {d === 0 ? "Closes today" : `Closes in ${d} day${d !== 1 ? "s" : ""}`}
          {deadline && <span className="font-normal text-slate/60 ml-2">· {formatShortDate(deadline)}</span>}
        </p>
      </div>
    );
  }

  if (status === "closing-soon") {
    return (
      <div className="mt-auto pt-4 border-t border-rule">
        {applicationOpens && (
          <p className="font-mono text-[0.65rem] text-slate/50 mb-0.5">
            Opened {formatShortDate(applicationOpens)}
          </p>
        )}
        <p className="font-mono text-xs font-medium" style={{ color: "#D97706" }}>
          <span
            className="inline-block w-1.5 h-1.5 rounded-full mr-1.5 align-middle"
            style={{ backgroundColor: "#F59E0B" }}
          />
          {d} days left
          {deadline && <span className="font-normal text-slate/60 ml-2">· {formatShortDate(deadline)}</span>}
        </p>
      </div>
    );
  }

  if (status === "open") {
    return (
      <div className="mt-auto pt-4 border-t border-rule">
        {applicationOpens && new Date(applicationOpens) <= new Date() && (
          <p className="font-mono text-[0.65rem] text-slate/50 mb-0.5">
            Opened {formatShortDate(applicationOpens)}
          </p>
        )}
        <p className="font-mono text-xs text-slate">
          {deadline
            ? <>Closes <span className="text-ink font-medium">{formatShortDate(deadline)}</span></>
            : "Open — deadline TBA"}
        </p>
      </div>
    );
  }

  if (status === "get-ready" || status === "opening-soon") {
    return (
      <div className="mt-auto pt-4 border-t border-rule">
        <p className="font-mono text-xs" style={{ color: "#1D4ED8" }}>
          Opens{" "}
          <span className="font-medium">
            {applicationOpens ? formatShortDate(applicationOpens) : "soon"}
          </span>
        </p>
        {deadline && (
          <p className="font-mono text-[0.65rem] text-slate/50 mt-0.5">
            Closes {formatShortDate(deadline)}
          </p>
        )}
      </div>
    );
  }

  if (status === "closed") {
    return (
      <div className="mt-auto pt-4 border-t border-rule">
        <p className="font-mono text-xs text-slate line-through">
          {deadline ? `Closed ${formatShortDate(deadline)}` : "Closed"}
        </p>
      </div>
    );
  }

  return (
    <div className="mt-auto pt-4 border-t border-rule">
      <p className="font-mono text-xs text-slate/50">Application dates TBA</p>
    </div>
  );
}

export default function OpportunityCard({
  opportunity,
  variant = "default",
}: {
  opportunity: Opportunity;
  variant?: CardVariant;
}) {
  const d = daysUntil(opportunity.deadline);
  const o = daysUntil(opportunity.applicationOpens);
  const status = getStatus(d, o);
  const sc = STATUS_CONFIG[status];

  return (
    <Link href={`/opportunities/${opportunity._id}`} className="block h-full">
      <article
        className="case-card-interactive h-full flex flex-col p-5"
        style={{ borderTop: `3px solid ${sc.borderColor}` }}
      >
        {/* Status badge + Type label row */}
        <div className="flex items-center justify-between gap-2 mb-3">
          <p className="font-mono text-xs text-slate uppercase tracking-widest leading-none">
            {TYPE_LABELS[opportunity.type] ?? opportunity.type}
            {opportunity.degreeLevel && opportunity.degreeLevel !== "none" && (
              <span className="opacity-50"> · {opportunity.degreeLevel}</span>
            )}
          </p>
          <span
            className="shrink-0 font-mono text-[0.6rem] font-semibold px-2 py-0.5 rounded-full tracking-wider flex items-center gap-1"
            style={{ backgroundColor: sc.bg, color: sc.color }}
          >
            <span
              className={`w-1.5 h-1.5 rounded-full inline-block${sc.pulse ? " animate-pulse" : ""}`}
              style={{ backgroundColor: sc.dot }}
            />
            {sc.label}
          </span>
        </div>

        {/* Title */}
        <h3
          className={`font-display text-ink leading-snug ${
            variant === "featured"
              ? "text-2xl line-clamp-3"
              : variant === "compact"
              ? "text-base line-clamp-2"
              : "text-xl line-clamp-3"
          }`}
        >
          {opportunity.title}
        </h3>

        {/* Provider · country */}
        <p className="text-sm text-slate mt-1">
          {opportunity.provider}
          {variant !== "compact" && (
            <span className="opacity-60"> · {opportunity.country}</span>
          )}
        </p>

        {/* Fields of study — featured cards only */}
        {variant === "featured" && opportunity.fieldsOfStudy.length > 0 && (
          <p className="text-xs text-slate mt-3 leading-relaxed">
            {opportunity.fieldsOfStudy.slice(0, 4).join(" · ")}
          </p>
        )}

        {/* Win count badge */}
        {(opportunity.winCount ?? 0) > 0 && variant !== "compact" && (
          <p className="text-xs mt-2 font-mono" style={{ color: "#15803d" }}>
            🏆 {opportunity.winCount} scholar{(opportunity.winCount ?? 0) !== 1 ? "s" : ""} won this
          </p>
        )}

        {/* Funding — default + featured */}
        {variant !== "compact" && opportunity.fundingCoverage && (
          <p className="text-xs text-slate mt-2 opacity-70 line-clamp-1">
            {opportunity.fundingCoverage}
          </p>
        )}

        {/* Application window */}
        <ApplicationWindow
          status={status}
          d={d}
          o={o}
          deadline={opportunity.deadline}
          applicationOpens={opportunity.applicationOpens}
        />
      </article>
    </Link>
  );
}
