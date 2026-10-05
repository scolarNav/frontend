import type { Metadata } from "next";
import { notFound } from "next/navigation";
import HomeExplorer from "@/components/HomeExplorer";
import { BrowseLinks } from "@/components/OpportunityListing";
import { JsonLd, itemListJsonLd, organizationJsonLd, websiteJsonLd } from "@/lib/jsonld";
import { parsePage } from "@/lib/listing-route";
import { fetchOpportunityList, PAGE_SIZE } from "@/lib/opportunities";
import { opportunityPath } from "@/lib/paths";
import { pageMetadata } from "@/lib/seo";
import { siteConfig } from "@/lib/site";

// Rendered per request (the API is not reachable at build time on every host); the data fetch itself
// is cached for an hour by Next's data cache and tag-revalidated by the backend.
export const dynamic = "force-dynamic";

type Props = { searchParams: { page?: string } };

export function generateMetadata({ searchParams }: Props): Metadata {
  const page = parsePage(searchParams);
  const title = `${siteConfig.name} — ${siteConfig.tagline}${page > 1 ? ` (Page ${page})` : ""}`;
  const base = pageMetadata({
    title: siteConfig.name,
    description: siteConfig.description,
    // Only ?page=N is reflected in the canonical; filters live in client state and never create URLs.
    path: page > 1 ? `/?page=${page}` : "/",
  });
  // The home title is absolute: the "%s | ScolarNav" template would repeat the brand.
  return {
    ...base,
    title: { absolute: title },
    openGraph: { ...base.openGraph, title },
    twitter: { ...base.twitter, title },
  };
}

export default async function HomePage({ searchParams }: Props) {
  const page = parsePage(searchParams);
  const data = await fetchOpportunityList({ excludeType: "incubator", page, limit: PAGE_SIZE }).catch(() => null);
  if (data && page > 1 && page > data.pagination.pages) notFound();

  return (
    <>
      <JsonLd
        data={[
          organizationJsonLd(),
          websiteJsonLd(),
          ...(data ? [itemListJsonLd(data.opportunities.map((o) => ({ name: o.title, path: opportunityPath(o) })))] : []),
        ]}
      />
      <HomeExplorer initial={data} />
      <BrowseLinks className="max-w-6xl mx-auto px-4 sm:px-6 mt-14" />
    </>
  );
}
