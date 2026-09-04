"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { api, ApiError } from "@/lib/api";
import { CountryGuide } from "@/lib/types";

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="py-8 border-b border-rule last:border-0">
      <h2 className="font-display text-2xl text-ink mb-4">{title}</h2>
      {children}
    </div>
  );
}

export default function CountryDetailPage({ params }: { params: { code: string } }) {
  const { code } = params;
  const [guide, setGuide] = useState<CountryGuide | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    api.get<{ country: CountryGuide }>(`/countries/${code}`, { auth: false })
      .then(({ country }) => setGuide(country))
      .catch((err) => setError(err instanceof ApiError ? err.message : "Couldn't load guide."))
      .finally(() => setLoading(false));
  }, [code]);

  if (loading) return <p className="max-w-3xl mx-auto px-6 py-20 text-slate font-mono text-sm">Loading…</p>;
  if (error) return (
    <div className="max-w-3xl mx-auto px-6 py-20">
      <p className="text-alert text-sm">{error}</p>
      <Link href="/countries" className="text-forest text-sm underline mt-3 block">← Back to country guides</Link>
    </div>
  );
  if (!guide) return null;

  return (
    <div className="max-w-3xl mx-auto px-6 py-14">
      <Link href="/countries" className="text-sm text-slate hover:text-ink font-mono mb-6 block">← Country Guides</Link>

      <div className="flex items-center gap-4 mb-2">
        <span className="text-5xl">{guide.flag}</span>
        <div>
          <p className="font-mono text-xs tracking-widest uppercase text-slate">{guide.applicationLanguage}</p>
          <h1 className="font-display text-4xl text-ink">{guide.name}</h1>
        </div>
      </div>
      <p className="text-ink-soft mt-2 mb-10 text-lg">{guide.tagline}</p>

      {/* Quick stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-10">
        <div className="case-card p-4 text-center">
          <p className="font-display text-2xl text-ink">${guide.avgMonthlyExpensesUSD.toLocaleString()}</p>
          <p className="text-xs text-slate font-mono mt-1">Avg/month (USD)</p>
        </div>
        <div className="case-card p-4 text-center">
          <p className="font-display text-2xl text-ink">{guide.requiresLanguageTest ? "Yes" : "No"}</p>
          <p className="text-xs text-slate font-mono mt-1">Language test req.</p>
        </div>
        <div className="case-card p-4 text-center">
          <p className="font-display text-2xl text-ink">{guide.intakeMonths.length}</p>
          <p className="text-xs text-slate font-mono mt-1">Annual intakes</p>
        </div>
        <div className="case-card p-4 text-center">
          <p className="font-display text-xl text-ink leading-tight">{guide.intakeMonths.join(" / ")}</p>
          <p className="text-xs text-slate font-mono mt-1">Intake months</p>
        </div>
      </div>

      <Section title="Overview">
        <p className="text-ink-soft leading-relaxed">{guide.overview}</p>
      </Section>

      <Section title="Scholarship culture">
        <p className="text-ink-soft leading-relaxed">{guide.scholarshipCulture}</p>
        {guide.popularScholarships.length > 0 && (
          <div className="mt-4">
            <p className="text-xs font-mono text-slate uppercase tracking-widest mb-2">Key scholarships</p>
            <div className="flex flex-wrap gap-2">
              {guide.popularScholarships.map((s) => (
                <span key={s} className="text-sm border border-rule px-3 py-1 text-ink-soft">{s}</span>
              ))}
            </div>
          </div>
        )}
      </Section>

      <Section title="Cost of living">
        <p className="text-ink-soft leading-relaxed">{guide.livingCosts}</p>
      </Section>

      <Section title="Visa process">
        <p className="text-ink-soft leading-relaxed">{guide.visaProcess}</p>
        {guide.requiresLanguageTest && (
          <div className="mt-4 case-card p-4">
            <p className="text-xs font-mono text-slate uppercase tracking-widest mb-2">Required language tests</p>
            <ul className="space-y-1">
              {guide.commonLanguageTests.map((t) => (
                <li key={t} className="text-sm text-ink-soft flex gap-2">
                  <span className="text-forest shrink-0">✓</span> {t}
                </li>
              ))}
            </ul>
          </div>
        )}
      </Section>

      <Section title="Top universities">
        <ul className="space-y-1.5">
          {guide.topUniversities.map((u) => (
            <li key={u} className="text-ink-soft text-sm flex gap-2">
              <span className="text-forest shrink-0 mt-0.5">→</span> {u}
            </li>
          ))}
        </ul>
      </Section>

      <Section title="Best for">
        <div className="flex flex-wrap gap-2">
          {guide.bestFor.map((b) => (
            <span key={b} className="border border-rule text-ink-soft text-sm px-3 py-1">{b}</span>
          ))}
        </div>
      </Section>

      <Section title="Honest assessment">
        <div className="grid sm:grid-cols-2 gap-6">
          <div>
            <p className="text-xs font-mono text-forest uppercase tracking-widest mb-3">Why students choose {guide.name}</p>
            <ul className="space-y-2">
              {guide.pros.map((p) => (
                <li key={p} className="text-sm text-ink-soft flex gap-2">
                  <span className="text-forest shrink-0 mt-0.5">+</span> {p}
                </li>
              ))}
            </ul>
          </div>
          <div>
            <p className="text-xs font-mono text-alert uppercase tracking-widest mb-3">What to prepare for</p>
            <ul className="space-y-2">
              {guide.cons.map((c) => (
                <li key={c} className="text-sm text-ink-soft flex gap-2">
                  <span className="text-alert shrink-0 mt-0.5">−</span> {c}
                </li>
              ))}
            </ul>
          </div>
        </div>
      </Section>

      <div className="mt-8 flex flex-wrap gap-3">
        <Link href="/" className="bg-forest text-white px-5 py-2.5 text-sm hover:bg-forest-light transition-colors" style={{ borderRadius: "4px" }}>
          Browse {guide.name} scholarships →
        </Link>
        <Link href="/mentor" className="border border-forest text-forest px-5 py-2.5 text-sm hover:bg-forest hover:text-white transition-colors" style={{ borderRadius: "4px" }}>
          Ask your mentor about {guide.name}
        </Link>
      </div>
    </div>
  );
}
