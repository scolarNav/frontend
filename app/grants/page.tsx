import type { Metadata } from "next";
import { notFound } from "next/navigation";
import GrantsExplorer from "@/components/GrantsExplorer";
import { JsonLd, breadcrumbJsonLd, itemListJsonLd } from "@/lib/jsonld";
import { parsePage } from "@/lib/listing-route";
import { fetchGrantList } from "@/lib/opportunities";
import { grantPath } from "@/lib/paths";
import { pageMetadata } from "@/lib/seo";
import { SHOW_GRANTS } from "@/lib/site";

export const dynamic = "force-dynamic";

type Props = { searchParams: { page?: string } };

export function generateMetadata({ searchParams }: Props): Metadata {
  if (!SHOW_GRANTS) return { title: "Page not found", robots: { index: false, follow: false } };
  const page = parsePage(searchParams);
  return pageMetadata({
    title: `Startup Grants${page > 1 ? ` — Page ${page}` : ""}`,
    description:
      "Grants and funding for startups in technology, inclusion, innovation, talent development and African markets, refreshed automatically every 8 hours.",
    path: page > 1 ? `/grants?page=${page}` : "/grants",
  });
}

export default async function GrantsPage({ searchParams }: Props) {
  if (!SHOW_GRANTS) notFound();
  const page = parsePage(searchParams);
  const data = await fetchGrantList(page, 24).catch(() => null);
  if (data && page > 1 && page > data.pages) notFound();

  return (
    <>
      <JsonLd
        data={[
          breadcrumbJsonLd([{ name: "Home", path: "/" }, { name: "Startup Grants", path: "/grants" }]),
          ...(data ? [itemListJsonLd(data.grants.map((g) => ({ name: g.title, path: grantPath(g) })))] : []),
        ]}
      />
      <GrantsExplorer initial={data} />
    </>
  );
}
