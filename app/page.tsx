import type { Metadata } from "next";
import { permanentRedirect } from "next/navigation";
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

export function generateMetadata(): Metadata {
  const base = pageMetadata({ title: siteConfig.name, description: siteConfig.description, path: "/" });
  const title = `${siteConfig.name} — ${siteConfig.tagline}`;
  // The home title is absolute: the "%s | ScolarNav" template would repeat the brand.
  return {
    ...base,
    title: { absolute: title },
    openGraph: { ...base.openGraph, title },
    twitter: { ...base.twitter, title },
  };
}

export default async function HomePage({ searchParams }: Props) {
  // Next drops the query string from a root-URL canonical, so ?page=N cannot self-canonicalize here.
  // Deeper pages live at /opportunities?page=N instead (see app/opportunities/page.tsx).
  const page = parsePage(searchParams);
  if (page > 1) permanentRedirect(`/opportunities?page=${page}`);
  const data = await fetchOpportunityList({ excludeType: "incubator", page: 1, limit: PAGE_SIZE }).catch(() => null);

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
