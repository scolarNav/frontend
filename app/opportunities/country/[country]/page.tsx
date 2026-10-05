import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { listingMetadata, parsePage, renderListing, type ListingConfig } from "@/lib/listing-route";
import { fetchCountryGuides } from "@/lib/opportunities";
import { countryBySlug } from "@/lib/taxonomy";

export const dynamic = "force-dynamic";

type Props = { params: { country: string }; searchParams: { page?: string } };

function config(slug: string): ListingConfig {
  const c = countryBySlug(slug);
  if (!c) notFound();
  const basePath = `/opportunities/country/${c.slug}`;
  const where = c.value === "Multiple" ? "multiple countries" : c.label;
  return {
    heading: c.value === "Multiple" ? "International opportunities" : `Opportunities in ${c.label}`,
    intro: `Scholarships, fellowships and study programs in ${where}, with deadlines, eligibility and requirements explained plainly.`,
    basePath,
    query: { country: c.value },
    crumbs: [{ name: "Home", path: "/" }, { name: c.label, path: basePath }],
  };
}

export const generateMetadata = ({ params, searchParams }: Props): Promise<Metadata> =>
  listingMetadata(config(params.country), parsePage(searchParams));

export default async function Page({ params, searchParams }: Props) {
  const cfg = config(params.country);
  const c = countryBySlug(params.country)!;
  const guide = (await fetchCountryGuides().catch(() => [])).find((g) => g.name.toLowerCase() === c.value.toLowerCase());
  return (
    <>
      {await renderListing(cfg, parsePage(searchParams))}
      {guide && (
        <p className="max-w-6xl mx-auto px-4 sm:px-6 -mt-8 mb-8 text-sm text-ink-soft">
          Planning to study here? Read the <Link href={`/countries/${guide.code}`} className="text-forest underline">{guide.name} country guide</Link> for costs, visas and intakes.
        </p>
      )}
    </>
  );
}
