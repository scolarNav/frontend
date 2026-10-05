import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { listingMetadata, parsePage, renderListing, type ListingConfig } from "@/lib/listing-route";
import { typeBySlug } from "@/lib/taxonomy";

export const dynamic = "force-dynamic";

type Props = { params: { type: string }; searchParams: { page?: string } };

function config(slug: string): ListingConfig {
  const t = typeBySlug(slug);
  if (!t) notFound();
  const basePath = `/opportunities/type/${t.slug}`;
  return {
    heading: t.plural,
    intro: `Browse ${t.plural.toLowerCase()} for international students and professionals, with deadlines, eligibility and requirements explained plainly.`,
    basePath,
    query: { type: t.value },
    crumbs: [{ name: "Home", path: "/" }, { name: t.plural, path: basePath }],
  };
}

export const generateMetadata = ({ params, searchParams }: Props): Promise<Metadata> =>
  listingMetadata(config(params.type), parsePage(searchParams));

export default function Page({ params, searchParams }: Props) {
  return renderListing(config(params.type), parsePage(searchParams));
}
