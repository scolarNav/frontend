import type { LucideIcon } from "lucide-react";
import { Inbox, TriangleAlert, CircleCheck, Info } from "lucide-react";

/** Nothing here yet: one sentence about what belongs here, and one action. */
export function EmptyState({
  icon: Icon = Inbox,
  title,
  description,
  action,
}: {
  icon?: LucideIcon;
  title: string;
  description?: string;
  action?: React.ReactNode;
}) {
  return (
    <div className="card card-pad flex flex-col items-center py-12 text-center">
      <span className="flex h-12 w-12 items-center justify-center rounded-full bg-surface-2 text-slate">
        <Icon size={22} aria-hidden="true" />
      </span>
      <h2 className="mt-4 font-display text-xl text-ink">{title}</h2>
      {description && <p className="mt-1.5 max-w-sm text-sm text-slate">{description}</p>}
      {action && <div className="mt-5">{action}</div>}
    </div>
  );
}

/** Something went wrong: say what happened in plain words and offer a way forward. */
export function ErrorState({
  title = "Something went wrong",
  message,
  onRetry,
  action,
}: {
  title?: string;
  message?: string;
  onRetry?: () => void;
  action?: React.ReactNode;
}) {
  return (
    <div role="alert" className="card card-pad flex flex-col items-center py-12 text-center">
      <span className="flex h-12 w-12 items-center justify-center rounded-full bg-danger-soft text-danger">
        <TriangleAlert size={22} aria-hidden="true" />
      </span>
      <h2 className="mt-4 font-display text-xl text-ink">{title}</h2>
      {message && <p className="mt-1.5 max-w-sm text-sm text-slate">{message}</p>}
      <div className="mt-5 flex flex-wrap justify-center gap-3">
        {onRetry && (
          <button type="button" onClick={onRetry} className="btn-primary">
            Try again
          </button>
        )}
        {action}
      </div>
    </div>
  );
}

const ALERT_ICON = { danger: TriangleAlert, ok: CircleCheck, info: Info, warn: TriangleAlert } as const;

/** Inline message. Pairs colour with an icon so colour is never the only signal. */
export function Alert({
  variant = "info",
  children,
  className = "",
}: {
  variant?: "danger" | "ok" | "info" | "warn";
  children: React.ReactNode;
  className?: string;
}) {
  const Icon = ALERT_ICON[variant];
  return (
    <div role={variant === "danger" ? "alert" : "status"} className={`alert alert-${variant} ${className}`}>
      <Icon size={18} className="mt-0.5 shrink-0" aria-hidden="true" />
      <div className="min-w-0">{children}</div>
    </div>
  );
}
