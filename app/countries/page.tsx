"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { api, ApiError } from "@/lib/api";
import { CountrySummary } from "@/lib/types";

export default function CountriesPage() {
  const [countries, setCountries] = useState<CountrySummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    api.get<{ countries: CountrySummary[] }>("/countries", { auth: false })
      .then(({ countries: c }) => setCountries(c))
      .catch((err) => setError(err instanceof ApiError ? err.message : "Couldn't load country guides."))
      .finally(() => setLoading(false));
  }, []);

  return (
    <div className="max-w-5xl mx-auto px-6 py-14">
      <p className="font-mono text-xs tracking-widest uppercase text-slate">Country Guides</p>
      <h1 className="font-display text-4xl text-ink mt-1 mb-3">Where do you want to study?</h1>
      <p className="text-ink-soft mb-10 max-w-2xl">
        Honest breakdowns of each country's scholarship culture, cost of living, visa process, and what type of student thrives there.
      </p>

      {loading && <p className="text-slate font-mono text-sm">Loading guides…</p>}
      {error && <p className="text-alert text-sm">{error}</p>}

      {!loading && !error && (
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5">
          {countries.map((c) => (
            <Link key={c.code} href={`/countries/${c.code}`}>
              <article className="case-card p-5 h-full flex flex-col hover:border-forest transition-colors group">
                <div className="flex items-center gap-3 mb-3">
                  <span className="text-3xl">{c.flag}</span>
                  <div>
                    <h2 className="font-display text-xl text-ink group-hover:text-forest transition-colors">{c.name}</h2>
                    <p className="text-xs text-slate font-mono">{c.applicationLanguage}</p>
                  </div>
                </div>

                <p className="text-sm text-ink-soft leading-relaxed flex-1">{c.tagline}</p>

                <div className="mt-4 pt-3 border-t border-rule flex items-center justify-between">
                  <div className="flex flex-wrap gap-1">
                    {c.bestFor.slice(0, 3).map((b) => (
                      <span key={b} className="text-xs border border-rule px-2 py-0.5 text-slate">{b}</span>
                    ))}
                  </div>
                  <span className="font-mono text-xs text-ink-soft shrink-0 ml-3">
                    ~${c.avgMonthlyExpensesUSD.toLocaleString()}/mo
                  </span>
                </div>
              </article>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
