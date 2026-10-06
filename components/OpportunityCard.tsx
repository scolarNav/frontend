import Link from "next/link";
import { Clock, CalendarClock, CircleCheck, CircleSlash, CircleHelp, Hourglass } from "lucide-react";
import { Opportunity } from "@/lib/types";
import { opportunityPath } from "@/lib/paths";
import { knownProvider } from "@/lib/opportunities";
import { levelByValue } from "@/lib/taxonomy";

// Kept so existing callers that pass a size variant keep compiling. Cards are uniform now.
export type CardVariant = "featured" | "default" | "compact";

const TYPE_LABELS: Record<string, string> = {
  scholarship: "Scholarship",
  study_program: "Study program",
  immigration_pathway: "Immigration pathway",
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
    timeZone: "Africa/Lagos",
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

// Each status pairs a colour with an icon and a word, so colour is never the only signal.
const STATUS_CONFIG: Record<StatusKind, { label: string; pill: string; Icon: typeof Clock }> = {
  urgent: { label: "Closing", pill: "bg-danger-soft text-danger", Icon: Clock },
  "closing-soon": { label: "Closing soon", pill: "bg-warn-soft text-warn", Icon: Clock },
  open: { label: "Open", pill: "bg-ok-soft text-ok", Icon: CircleCheck },
  "get-ready": { label: "Opens soon", pill: "bg-info-soft text-info", Icon: CalendarClock },
  "opening-soon": { label: "Upcoming", pill: "bg-info-soft text-info", Icon: CalendarClock },
  closed: { label: "Closed", pill: "bg-surface text-slate", Icon: CircleSlash },
  tba: { label: "Dates to be announced", pill: "bg-surface text-slate", Icon: Hourglass },
};

function dateLine(status: StatusKind, d: number | null, deadline?: string, applicationOpens?: string): React.ReactNode {
  switch (status) {
    case "urgent":
      return (
        <>
          <span className="font-semibold text-danger">{d === 0 ? "Closes today" : `Closes in ${d} day${d !== 1 ? "s" : ""}`}</span>
          {deadline && <span className="text-slate"> · {formatShortDate(deadline)}</span>}
        </>
      );
    case "closing-soon":
      return (
        <>
          <span className="font-semibold text-warn">{d} days left</span>
          {deadline && <span className="text-slate"> · {formatShortDate(deadline)}</span>}
        </>
      );
    case "open":
      return deadline ? (
        <>
          <span className="text-slate">Closes </span>
          <span className="font-semibold text-ink">{formatShortDate(deadline)}</span>
        </>
      ) : (
        <span className="text-slate">Open, deadline to be announced</span>
      );
    case "get-ready":
    case "opening-soon":
      return (
        <>
          <span className="text-slate">Opens </span>
          <span className="font-semibold text-ink">{applicationOpens ? formatShortDate(applicationOpens) : "soon"}</span>
        </>
      );
    case "closed":
      return <span className="text-slate">{deadline ? `Closed ${formatShortDate(deadline)}` : "Closed"}</span>;
    default:
      return <span className="text-slate">Application dates not announced yet</span>;
  }
}

export default function OpportunityCard({
  opportunity,
}: {
  opportunity: Opportunity;
  variant?: CardVariant;
}) {
  const d = daysUntil(opportunity.deadline);
  const o = daysUntil(opportunity.applicationOpens);
  const status = getStatus(d, o);
  const { label, pill, Icon } = STATUS_CONFIG[status];

  const level = opportunity.degreeLevel !== "none" ? levelByValue(opportunity.degreeLevel)?.label : undefined;
  const provider = knownProvider(opportunity.provider);

  return (
    <Link
      href={opportunityPath(opportunity)}
      className="block h-full rounded-lg focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-forest"
    >
      <article className="case-card-interactive h-full flex flex-col p-5">
        <div className="flex items-start justify-between gap-3">
          <p className="text-xs font-medium text-slate leading-5">
            {TYPE_LABELS[opportunity.type] ?? opportunity.type}
            {level && <span> · {level}</span>}
          </p>
          <span className={`shrink-0 inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-semibold ${pill}`}>
            <Icon size={12} aria-hidden="true" />
            {label}
          </span>
        </div>

        <h3 className="mt-3 font-display text-lg leading-snug text-ink line-clamp-3">{opportunity.title}</h3>

        <p className="mt-1.5 text-sm text-ink-soft line-clamp-2">
          {[provider, opportunity.country && opportunity.country !== "Multiple" ? opportunity.country : null].filter(Boolean).join(" · ")}
        </p>

        <p className="mt-auto pt-4 text-sm font-mono">{dateLine(status, d, opportunity.deadline, opportunity.applicationOpens)}</p>
      </article>
    </Link>
  );
}
