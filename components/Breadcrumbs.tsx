import Link from "next/link";
import type { Crumb } from "@/lib/jsonld";

/** Visible breadcrumb trail. Pair with breadcrumbJsonLd() using the same crumbs. */
export default function Breadcrumbs({ crumbs }: { crumbs: Crumb[] }) {
  return (
    <nav aria-label="Breadcrumb" className="mb-5">
      <ol className="flex flex-wrap items-center gap-x-2 gap-y-1 text-xs font-mono text-slate">
        {crumbs.map((c, i) => {
          const last = i === crumbs.length - 1;
          return (
            <li key={c.path} className="flex items-center gap-2 min-w-0">
              {last ? (
                <span aria-current="page" className="text-ink-soft truncate max-w-[60vw]">{c.name}</span>
              ) : (
                <Link href={c.path} className="hover:text-forest transition-colors">{c.name}</Link>
              )}
              {!last && <span aria-hidden="true">/</span>}
            </li>
          );
        })}
      </ol>
    </nav>
  );
}
