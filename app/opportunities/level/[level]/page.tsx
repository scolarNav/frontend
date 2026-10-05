import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { listingMetadata, parsePage, renderListing, type ListingConfig } from "@/lib/listing-route";
import { levelBySlug } from "@/lib/taxonomy";

export const dynamic = "force-dynamic";

type Props = { params: { level: string }; searchParams: { page?: string } };

function config(slug: string): ListingConfig {
  const l = levelBySlug(slug);
  if (!l) notFound();
  const basePath = `/opportunities/level/${l.slug}`;
  return {
    heading: `${l.label} scholarships & programs`,
    intro: `Funding and study opportunities open to ${l.label.toLowerCase()} applicants, with deadlines, eligibility and requirements explained plainly.`,
    basePath,
    query: { degreeLevel: l.value },
    crumbs: [{ name: "Home", path: "/" }, { name: l.label, path: basePath }],
  };
}

export const generateMetadata = ({ params, searchParams }: Props): Promise<Metadata> =>
  listingMetadata(config(params.level), parsePage(searchParams));

export default function Page({ params, searchParams }: Props) {
  return renderListing(config(params.level), parsePage(searchParams));
}
