import Link from "next/link";
import Breadcrumbs from "./Breadcrumbs";
import ListingPagination from "./ListingPagination";
import OpportunityCard, { type CardVariant } from "./OpportunityCard";
import { JsonLd, breadcrumbJsonLd, itemListJsonLd, type Crumb } from "@/lib/jsonld";
import type { Pagination } from "@/lib/opportunities";
import { opportunityPath } from "@/lib/paths";
import { DEGREE_LEVELS, OPPORTUNITY_COUNTRIES, OPPORTUNITY_TYPES } from "@/lib/taxonomy";
import type { Opportunity } from "@/lib/types";

/** Crawlable facet links: every listing page links to every other facet. */
export function BrowseLinks({ className = "" }: { className?: string }) {
  const chip = "text-xs font-mono text-ink-soft border border-rule px-2.5 py-1 hover:border-forest hover:text-forest transition-colors";
  return (
    <nav aria-label="Browse opportunities" className={className}>
      <h2 className="font-display text-xl text-ink">Browse by category</h2>
      <div className="mt-3 space-y-4">
        <ul className="flex flex-wrap gap-2">
          {OPPORTUNITY_TYPES.map((t) => (
            <li key={t.slug}><Link href={`/opportunities/type/${t.slug}`} className={chip}>{t.plural}</Link></li>
          ))}
        </ul>
        <ul className="flex flex-wrap gap-2">
          {DEGREE_LEVELS.map((l) => (
            <li key={l.slug}><Link href={`/opportunities/level/${l.slug}`} className={chip}>{l.label}</Link></li>
          ))}
        </ul>
        <ul className="flex flex-wrap gap-2">
          {OPPORTUNITY_COUNTRIES.map((c) => (
            <li key={c.slug}><Link href={`/opportunities/country/${c.slug}`} className={chip}>{c.label}</Link></li>
          ))}
        </ul>
      </div>
    </nav>
  );
}

export function OpportunityGrid({ opportunities }: { opportunities: Opportunity[] }) {
  return (
    <div className="bento-discovery">
      {opportunities.map((o, i) => {
        const pos = i % 7;
        const variant: CardVariant = pos === 0 ? "featured" : pos >= 5 ? "default" : "compact";
        return <OpportunityCard key={o._id} opportunity={o} variant={variant} />;
      })}
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
      <p className="text-xs text-slate font-mono mt-4 mb-5">
        {pagination.total} listing{pagination.total !== 1 ? "s" : ""}
        {pagination.pages > 1 && ` — page ${pagination.page} of ${pagination.pages}`}
      </p>

      <OpportunityGrid opportunities={opportunities} />
      <ListingPagination basePath={basePath} page={pagination.page} pages={pagination.pages} firstHref={firstHref} />
      <BrowseLinks className="mt-14 pt-8 border-t border-rule" />
    </div>
  );
}
