import type { Metadata } from "next";
import { notFound } from "next/navigation";
import OpportunityListing from "@/components/OpportunityListing";
import { fetchOpportunityList, type ListQuery } from "@/lib/opportunities";
import { pageMetadata } from "@/lib/seo";
import type { Crumb } from "./jsonld";

export function parsePage(searchParams: { page?: string | string[] }): number {
  const raw = Array.isArray(searchParams.page) ? searchParams.page[0] : searchParams.page;
  const n = parseInt(raw ?? "1", 10);
  return Number.isFinite(n) && n >= 1 ? n : 1;
}

export interface ListingConfig {
  /** Facet label, e.g. "Scholarships" or "Opportunities in Germany". */
  heading: string;
  intro: string;
  basePath: string;
  query: ListQuery;
  crumbs: Crumb[];
  firstHref?: string;
}

/**
 * Canonical rule shared by every listing: canonical = clean path (+ ?page=N for N>1).
 * Filter/sort/tracking query params are never reflected in the canonical, so they can't
 * create duplicate indexed URLs. Empty facets are noindex (thin content).
 */
export async function listingMetadata(cfg: ListingConfig, page: number): Promise<Metadata> {
  const data = await fetchOpportunityList({ ...cfg.query, page });
  const empty = !data || data.opportunities.length === 0;
  const suffix = page > 1 ? ` — Page ${page}` : "";
  return pageMetadata({
    title: `${cfg.heading}${suffix}`,
    description: cfg.intro,
    path: page > 1 ? `${cfg.basePath}?page=${page}` : cfg.basePath,
    noindex: empty,
  });
}

export async function renderListing(cfg: ListingConfig, page: number, extra?: React.ReactNode) {
  const data = await fetchOpportunityList({ ...cfg.query, page });
  if (!data || (page > 1 && page > data.pagination.pages)) notFound();
  return (
    <OpportunityListing
      h1={cfg.heading}
      intro={cfg.intro}
      basePath={cfg.basePath}
      crumbs={cfg.crumbs}
      opportunities={data.opportunities}
      pagination={data.pagination}
      extra={extra}
      firstHref={cfg.firstHref}
    />
  );
}
