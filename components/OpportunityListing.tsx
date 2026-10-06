import Link from "next/link";
import Breadcrumbs from "./Breadcrumbs";
import ListingPagination from "./ListingPagination";
import OpportunityCard from "./OpportunityCard";
import { JsonLd, breadcrumbJsonLd, itemListJsonLd, type Crumb } from "@/lib/jsonld";
import type { Pagination } from "@/lib/opportunities";
import { opportunityPath } from "@/lib/paths";
import { DEGREE_LEVELS, OPPORTUNITY_COUNTRIES, OPPORTUNITY_TYPES } from "@/lib/taxonomy";
import type { Opportunity } from "@/lib/types";

/** Crawlable facet links: every listing page links to every other facet. */
export function BrowseLinks({ className = "" }: { className?: string }) {
  const chip =
    "inline-flex items-center min-h-touch rounded-full bg-white px-4 text-sm text-ink-soft hover:text-forest transition-colors";
  const groups = [
    { title: "By type", items: OPPORTUNITY_TYPES.map((t) => ({ href: `/opportunities/type/${t.slug}`, label: t.plural })) },
    { title: "By level", items: DEGREE_LEVELS.map((l) => ({ href: `/opportunities/level/${l.slug}`, label: l.label })) },
    { title: "By country", items: OPPORTUNITY_COUNTRIES.map((c) => ({ href: `/opportunities/country/${c.slug}`, label: c.label })) },
  ];
  return (
    <nav aria-label="Browse opportunities" className={className}>
      <h2 className="font-display text-2xl text-ink">Browse by category</h2>
      <div className="mt-6 space-y-8">
        {groups.map((g) => (
          <div key={g.title}>
            <h3 className="text-sm font-semibold text-ink">{g.title}</h3>
            <ul className="mt-3 flex flex-wrap gap-2">
              {g.items.map((it) => (
                <li key={it.href}>
                  <Link href={it.href} className={chip}>{it.label}</Link>
                </li>
              ))}
            </ul>
          </div>
        ))}
      </div>
    </nav>
  );
}

export function OpportunityGrid({ opportunities }: { opportunities: Opportunity[] }) {
  return (
    <div className="card-grid">
      {opportunities.map((o) => (
        <OpportunityCard key={o._id} opportunity={o} />
      ))}
    </div>
  );
}

interface ListingProps {
  h1: string;
  intro: string;
  basePath: string;
  crumbs: Crumb[];
  opportunities: Opportunity[];
  pagination: Pagination;
  /** Where page 1 lives when it is not basePath (the catalogue's page 1 is the home page). */
  firstHref?: string;
  /** Optional note rendered under the intro (e.g. a link to the country guide). */
  extra?: React.ReactNode;
}

/** Server-rendered listing page: one h1, real <a> links to every item, crawlable pagination. */
export default function OpportunityListing({ h1, intro, basePath, crumbs, opportunities, pagination, extra, firstHref }: ListingProps) {
  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 py-8 sm:py-14">
      <JsonLd
        data={[
          breadcrumbJsonLd(crumbs),
          itemListJsonLd(opportunities.map((o) => ({ name: o.title, path: opportunityPath(o) }))),
        ]}
      />
      <Breadcrumbs crumbs={crumbs} />
      <h1 className="font-display text-3xl sm:text-4xl text-ink leading-tight">{h1}</h1>
      <p className="text-ink-soft mt-3 max-w-2xl leading-relaxed">{intro}</p>
      {extra}
      <p className="text-sm text-slate mt-4 mb-6">
        {pagination.total} listing{pagination.total !== 1 ? "s" : ""}
        {pagination.pages > 1 && ` — page ${pagination.page} of ${pagination.pages}`}
      </p>

      <OpportunityGrid opportunities={opportunities} />
      <ListingPagination basePath={basePath} page={pagination.page} pages={pagination.pages} firstHref={firstHref} />
      <BrowseLinks className="mt-14 pt-8 border-t border-rule" />
    </div>
  );
}
