import type { Metadata } from "next";
import Link from "next/link";
import { notFound, permanentRedirect } from "next/navigation";
import OpportunityDetail from "./OpportunityDetail";
import Breadcrumbs from "@/components/Breadcrumbs";
import OpportunityCard from "@/components/OpportunityCard";
import { JsonLd, breadcrumbJsonLd, type Crumb } from "@/lib/jsonld";
import { opportunityJsonLd } from "@/lib/opportunity-schema";
import { fetchCountryGuides, fetchOpenOpportunities, fetchOpportunity, formatDate, isClosed, knownProvider } from "@/lib/opportunities";
import { opportunityPath, parseOpportunityParam } from "@/lib/paths";
import { pageMetadata } from "@/lib/seo";
import { countryByValue, levelByValue, typeByValue } from "@/lib/taxonomy";
import type { Opportunity } from "@/lib/types";

// On-demand ISR: rendered on first request, refreshed hourly, and instantly via revalidateTag(`opportunity-<id>`).
export const revalidate = 3600;

/** Returns null when the record is missing or unpublished (-> real 404). */
async function loadOpportunity(param: string): Promise<Opportunity | null> {
  const id = parseOpportunityParam(param);
  if (!id) return null;
  const opp = await fetchOpportunity(id);
  return opp && opp.isActive !== false ? opp : null;
}

export async function generateMetadata({ params }: { params: { id: string } }): Promise<Metadata> {
  const opp = await loadOpportunity(params.id);
  if (!opp) return { title: "Opportunity not found", robots: { index: false, follow: false } };

  const path = opportunityPath(opp);
  const level = opp.degreeLevel && opp.degreeLevel !== "none" ? levelByValue(opp.degreeLevel) : undefined;
  const providerName = knownProvider(opp.provider);
  // Built from structured fields: the free-text objectives/eligibility are scraped and often start
  // with boilerplate ("Deadline: … Study in: …"), which makes poor search snippets. The type label is
  // left out on purpose: scraped records are not always classified reliably.
  const deadline = opp.deadline ? (isClosed(opp) ? `Closed ${formatDate(opp.deadline)}. ` : `Deadline ${formatDate(opp.deadline)}. `) : "";
  const by = providerName ? ` offered by ${providerName}` : "";
  const where = opp.country && opp.country !== "Multiple" ? ` in ${opp.country}` : "";
  const forLevel = level ? ` for ${level.label} study` : "";
  const funding = opp.fundingCoverage ? ` Funding: ${opp.fundingCoverage}.` : "";
  const description = `${deadline}${opp.title}: an opportunity${by}${where}${forLevel}.${funding} See eligibility, requirements and how to apply.`;
  const title = providerName && opp.title.length <= 30 ? `${opp.title} — ${providerName}` : opp.title;

  return pageMetadata({
    title,
    description,
    path,
    type: "article",
    image: `${path}/opengraph-image`,
  });
}

async function relatedOpportunities(opp: Opportunity): Promise<Opportunity[]> {
  const [sameCountry, sameType] = await Promise.all([
    fetchOpenOpportunities({ type: opp.type, country: opp.country }, 8),
    fetchOpenOpportunities({ type: opp.type }, 8),
  ]);
  const seen = new Set<string>([opp._id]);
  const out: Opportunity[] = [];
  for (const o of [...sameCountry, ...sameType]) {
    if (seen.has(o._id)) continue;
    seen.add(o._id);
    out.push(o);
    if (out.length === 6) break;
  }
  return out;
}

export default async function OpportunityPage({ params }: { params: { id: string } }) {
  const opp = await loadOpportunity(params.id);
  if (!opp) notFound();

  // Stable canonical URL: bare-id and stale-slug URLs permanently redirect to the current slug.
  const path = opportunityPath(opp);
  if (decodeURIComponent(params.id) !== path.replace("/opportunities/", "")) permanentRedirect(path);

  const [related, guides] = await Promise.all([relatedOpportunities(opp), fetchCountryGuides().catch(() => [])]);

  const type = typeByValue(opp.type);
  const country = countryByValue(opp.country);
  const level = opp.degreeLevel && opp.degreeLevel !== "none" ? levelByValue(opp.degreeLevel) : undefined;
  const guide = guides.find((g) => g.name.toLowerCase() === opp.country.toLowerCase());
  const closed = isClosed(opp);

  const crumbs: Crumb[] = [
    { name: "Home", path: "/" },
    ...(type ? [{ name: type.plural, path: `/opportunities/type/${type.slug}` }] : []),
    { name: opp.title, path },
  ];

  return (
    <>
      <JsonLd data={[opportunityJsonLd(opp, path), breadcrumbJsonLd(crumbs)]} />

      <div className="max-w-5xl mx-auto px-4 sm:px-6 pt-8 sm:pt-12">
        <Breadcrumbs crumbs={crumbs} />
        {closed && opp.deadline && (
          <div role="status" className="border border-rule bg-white p-4 text-sm text-ink-soft" style={{ borderRadius: "6px" }}>
            <strong className="text-ink">This opportunity closed on {formatDate(opp.deadline)}.</strong>{" "}
            Applications for this cycle are no longer open. Many programmes reopen annually — save it to be ready,
            or see similar opportunities that are open now below.
          </div>
        )}
      </div>

      <OpportunityDetail initial={opp} />

      <aside aria-label="Related opportunities" className="max-w-5xl mx-auto px-4 sm:px-6 pb-8">
        <h2 className="font-display text-xl sm:text-2xl text-ink border-b border-rule pb-2">
          {closed ? "Similar opportunities that are open now" : "More opportunities like this"}
        </h2>

        <ul className="mt-4 flex flex-wrap gap-2 text-sm">
          {type && <li><Link href={`/opportunities/type/${type.slug}`} className="stamp text-forest border-forest">All {type.plural.toLowerCase()}</Link></li>}
          {country && <li><Link href={`/opportunities/country/${country.slug}`} className="stamp text-forest border-forest">Opportunities in {country.label}</Link></li>}
          {level && <li><Link href={`/opportunities/level/${level.slug}`} className="stamp text-forest border-forest">{level.label} opportunities</Link></li>}
          {guide && <li><Link href={`/countries/${guide.code}`} className="stamp text-forest border-forest">Study in {guide.name}: country guide</Link></li>}
        </ul>

        {related.length > 0 ? (
          <div className="mt-6 grid gap-4 sm:grid-cols-2">
            {related.map((o) => <OpportunityCard key={o._id} opportunity={o} variant="compact" />)}
          </div>
        ) : (
          <p className="mt-4 text-sm text-slate">
            No similar open opportunities right now. <Link href="/" className="text-forest underline">Browse the full catalogue</Link>.
          </p>
        )}
      </aside>
    </>
  );
}
