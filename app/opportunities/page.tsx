import type { Metadata } from "next";
import { permanentRedirect } from "next/navigation";
import { listingMetadata, parsePage, renderListing, type ListingConfig } from "@/lib/listing-route";

export const dynamic = "force-dynamic";

type Props = { searchParams: { page?: string } };

// The full catalogue. Page 1 is the home page, so this route only serves pages 2+ (crawlable
// pagination with a real self-canonical) and redirects everything else to "/".
const config: ListingConfig = {
  heading: "All scholarships and opportunities",
  intro:
    "Every scholarship, fellowship, study program and immigration pathway on ScolarNav, with deadlines, eligibility and requirements explained plainly.",
  basePath: "/opportunities",
  firstHref: "/",
  query: { excludeType: "incubator" },
  crumbs: [{ name: "Home", path: "/" }, { name: "All opportunities", path: "/opportunities" }],
};

export function generateMetadata({ searchParams }: Props): Promise<Metadata> {
  return listingMetadata(config, Math.max(2, parsePage(searchParams)));
}

export default function Page({ searchParams }: Props) {
  const page = parsePage(searchParams);
  if (page <= 1) permanentRedirect("/");
  return renderListing(config, page);
}
