import type { Metadata } from "next";
import Link from "next/link";
import { JsonLd, breadcrumbJsonLd } from "@/lib/jsonld";
import { fetchCountryGuides } from "@/lib/opportunities";
import { pageMetadata } from "@/lib/seo";
import { PageHeader } from "@/components/ui/PageHeader";
import { EmptyState } from "@/components/ui/States";

export const dynamic = "force-dynamic";

export const metadata: Metadata = pageMetadata({
  title: "Study Abroad Country Guides",
  description:
    "Honest breakdowns of each study destination: scholarship culture, cost of living, visa process, intakes and what type of student thrives there.",
  path: "/countries",
});

export default async function CountriesPage() {
  const countries = await fetchCountryGuides();

  return (
    <>
      <JsonLd data={breadcrumbJsonLd([{ name: "Home", path: "/" }, { name: "Country guides", path: "/countries" }])} />
      <div className="page">
        <PageHeader
          eyebrow="Country guides"
          title="Where do you want to study?"
          description="Honest breakdowns of each country's scholarship culture, cost of living, visa process, and what type of student thrives there."
        />

        {countries.length === 0 && (
          <EmptyState title="Guides are unavailable right now" description="Country guides could not be loaded. Please check back soon." />
        )}

        {countries.length > 0 && (
          <ul className="card-grid">
            {countries.map((c) => (
              <li key={c.code}>
                <Link href={`/countries/${c.code}`} className="card-interactive group flex h-full flex-col p-5">
                  <div className="mb-3 flex items-center gap-3">
                    <span className="text-3xl" aria-hidden="true">{c.flag}</span>
                    <div>
                      <h2 className="font-display text-xl text-ink transition-colors group-hover:text-forest">{c.name}</h2>
                      <p className="text-sm text-slate">Applications in {c.applicationLanguage}</p>
                    </div>
                  </div>

                  <p className="flex-1 text-sm leading-relaxed text-ink-soft">{c.tagline}</p>

                  <div className="mt-4 flex items-end justify-between gap-3 border-t border-rule pt-3">
                    <ul className="flex flex-wrap gap-1.5">
                      {c.bestFor.slice(0, 3).map((b) => (
                        <li key={b} className="badge">{b}</li>
                      ))}
                    </ul>
                    <span className="shrink-0 text-sm font-semibold text-ink">~${c.avgMonthlyExpensesUSD.toLocaleString()}/mo</span>
                  </div>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </div>
    </>
  );
}
