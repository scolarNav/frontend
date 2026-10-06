import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import Breadcrumbs from "@/components/Breadcrumbs";
import { JsonLd, breadcrumbJsonLd, type Crumb } from "@/lib/jsonld";
import { fetchCountryGuide } from "@/lib/opportunities";
import { pageMetadata } from "@/lib/seo";
import { countryByValue } from "@/lib/taxonomy";
import { countryMedia } from "@/lib/country-media";
import CountryFlag from "@/components/CountryFlag";
import CountryPhoto from "@/components/CountryPhoto";
import { Check, GraduationCap, Minus, Plus } from "lucide-react";

export const revalidate = 3600;

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section>
      <h2 className="h2 mb-4">{title}</h2>
      {children}
    </section>
  );
}

export async function generateMetadata({ params }: { params: { code: string } }): Promise<Metadata> {
  const guide = await fetchCountryGuide(params.code);
  if (!guide) return { title: "Country guide not found", robots: { index: false, follow: false } };
  return pageMetadata({
    title: `Study in ${guide.name}: Student Guide`,
    description: `${guide.tagline}. ${guide.overview}`,
    path: `/countries/${guide.code}`,
  });
}

export default async function CountryDetailPage({ params }: { params: { code: string } }) {
  const guide = await fetchCountryGuide(params.code);
  if (!guide) notFound();

  const photos = countryMedia(guide.code)?.photos ?? [];
  const listing = countryByValue(guide.name);
  const browseHref = listing ? `/opportunities/country/${listing.slug}` : "/";
  const crumbs: Crumb[] = [
    { name: "Home", path: "/" },
    { name: "Country guides", path: "/countries" },
    { name: guide.name, path: `/countries/${guide.code}` },
  ];

  return (
    <>
      <JsonLd data={breadcrumbJsonLd(crumbs)} />
      <div className="page-narrow">
        <Breadcrumbs crumbs={crumbs} />

        <header className="mb-10">
          {photos[0] && <CountryPhoto photo={photos[0]} country={guide.name} priority className="mb-6 aspect-[2/1]" />}
          <div className="flex items-center gap-4">
            <CountryFlag code={guide.code} name={guide.name} className="h-10 w-[3.75rem]" />
            <div>
              <p className="eyebrow">Applications in {guide.applicationLanguage}</p>
              <h1 className="h1">{guide.name}</h1>
            </div>
          </div>
          <p className="lead mt-4">{guide.tagline}</p>
        </header>

        {/* Quick facts */}
        <dl className="mb-10 grid grid-cols-2 gap-3 sm:grid-cols-4">
          <div className="card p-4 text-center">
            <dd className="font-display text-2xl text-ink">${guide.avgMonthlyExpensesUSD.toLocaleString()}</dd>
            <dt className="mt-1 text-sm text-slate">Average per month</dt>
          </div>
          <div className="card p-4 text-center">
            <dd className="font-display text-2xl text-ink">{guide.requiresLanguageTest ? "Yes" : "No"}</dd>
            <dt className="mt-1 text-sm text-slate">Language test required</dt>
          </div>
          <div className="card p-4 text-center">
            <dd className="font-display text-2xl text-ink">{guide.intakeMonths.length}</dd>
            <dt className="mt-1 text-sm text-slate">Intakes a year</dt>
          </div>
          <div className="card p-4 text-center">
            <dd className="font-display text-lg leading-tight text-ink">{guide.intakeMonths.join(", ")}</dd>
            <dt className="mt-1 text-sm text-slate">Intake months</dt>
          </div>
        </dl>

        <div className="space-y-10">
          <Section title="Overview">
            <p className="max-w-prose leading-relaxed text-ink-soft">{guide.overview}</p>
            {photos[1] && <div className="mt-6"><CountryPhoto photo={photos[1]} country={guide.name} /></div>}
          </Section>

          <Section title="Scholarship culture">
            <p className="max-w-prose leading-relaxed text-ink-soft">{guide.scholarshipCulture}</p>
            {guide.popularScholarships.length > 0 && (
              <div className="mt-4">
                <h3 className="mb-2 text-sm font-semibold text-ink">Key scholarships</h3>
                <ul className="flex flex-wrap gap-2">
                  {guide.popularScholarships.map((s) => (
                    <li key={s} className="badge text-sm">{s}</li>
                  ))}
                </ul>
              </div>
            )}
          </Section>

          <Section title="Cost of living">
            <p className="max-w-prose leading-relaxed text-ink-soft">{guide.livingCosts}</p>
            {photos[2] && <div className="mt-6"><CountryPhoto photo={photos[2]} country={guide.name} /></div>}
          </Section>

          <Section title="Visa process">
            <p className="max-w-prose leading-relaxed text-ink-soft">{guide.visaProcess}</p>
            {guide.requiresLanguageTest && (
              <div className="card card-pad mt-4">
                <h3 className="mb-2 text-sm font-semibold text-ink">Required language tests</h3>
                <ul className="space-y-1.5">
                  {guide.commonLanguageTests.map((t) => (
                    <li key={t} className="flex gap-2 text-sm text-ink-soft">
                      <Check size={16} className="mt-0.5 shrink-0 text-ok" aria-hidden="true" />
                      {t}
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </Section>

          <Section title="Top universities">
            <ul className="grid gap-2 sm:grid-cols-2">
              {guide.topUniversities.map((u) => (
                <li key={u} className="flex gap-2 text-sm text-ink-soft">
                  <GraduationCap size={16} className="mt-0.5 shrink-0 text-forest" aria-hidden="true" />
                  {u}
                </li>
              ))}
            </ul>
          </Section>

          <Section title="Best for">
            <ul className="flex flex-wrap gap-2">
              {guide.bestFor.map((b) => (
                <li key={b} className="badge text-sm">{b}</li>
              ))}
            </ul>
          </Section>

          <Section title="Honest assessment">
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="card card-pad">
                <h3 className="mb-3 text-sm font-semibold text-ok">Why students choose {guide.name}</h3>
                <ul className="space-y-2">
                  {guide.pros.map((p) => (
                    <li key={p} className="flex gap-2 text-sm text-ink-soft">
                      <Plus size={16} className="mt-0.5 shrink-0 text-ok" aria-hidden="true" />
                      {p}
                    </li>
                  ))}
                </ul>
              </div>
              <div className="card card-pad">
                <h3 className="mb-3 text-sm font-semibold text-danger">What to prepare for</h3>
                <ul className="space-y-2">
                  {guide.cons.map((c) => (
                    <li key={c} className="flex gap-2 text-sm text-ink-soft">
                      <Minus size={16} className="mt-0.5 shrink-0 text-danger" aria-hidden="true" />
                      {c}
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          </Section>
        </div>

        <div className="mt-10 flex flex-wrap gap-3">
          <Link href={browseHref} className="btn-primary">
            Browse {guide.name} scholarships
          </Link>
          <Link href="/mentor" className="btn-secondary">
            Ask your mentor about {guide.name}
          </Link>
        </div>
      </div>
    </>
  );
}
