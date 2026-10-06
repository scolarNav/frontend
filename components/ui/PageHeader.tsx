import Link from "next/link";
import { ChevronLeft } from "lucide-react";

/** Standard page heading: optional back link, eyebrow, title, one-line description, and actions on the right. */
export function PageHeader({
  title,
  eyebrow,
  description,
  actions,
  back,
}: {
  title: React.ReactNode;
  eyebrow?: string;
  description?: React.ReactNode;
  actions?: React.ReactNode;
  back?: { href: string; label: string };
}) {
  return (
    <header className="mb-8 sm:mb-10">
      {back && (
        <Link
          href={back.href}
          className="mb-4 inline-flex min-h-touch items-center gap-1 text-sm font-medium text-slate transition-colors hover:text-ink"
        >
          <ChevronLeft size={16} aria-hidden="true" />
          {back.label}
        </Link>
      )}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div className="min-w-0">
          {eyebrow && <p className="eyebrow mb-2">{eyebrow}</p>}
          <h1 className="h1">{title}</h1>
          {description && <p className="lead mt-3">{description}</p>}
        </div>
        {actions && <div className="flex shrink-0 flex-wrap items-center gap-3">{actions}</div>}
      </div>
    </header>
  );
}
