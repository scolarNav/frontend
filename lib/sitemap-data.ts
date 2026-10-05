import { fetchCountryGuides, fetchGrantList, fetchOpportunityList } from "./opportunities";
import { grantPath, opportunityPath } from "./paths";
import { DEGREE_LEVELS, OPPORTUNITY_COUNTRIES, OPPORTUNITY_TYPES } from "./taxonomy";

/** Google's limit is 50,000 URLs per sitemap; stay well under it. */
export const SITEMAP_CHUNK = 10_000;
const FETCH_PAGE = 100;

export interface SitemapEntry {
  url: string;
  lastModified?: Date;
}

export const STATIC_PUBLIC_PATHS = ["/", "/countries", "/grants", "/pricing", "/wins", "/coaches", "/privacy", "/terms"];

async function totals() {
  // Tolerate an API outage here so a build/start without the API still succeeds; chunks are re-listed live by /sitemap.xml.
  const [opps, grants] = await Promise.all([
    fetchOpportunityList({ page: 1, limit: 1 }).catch(() => null),
    fetchGrantList(1, 1).catch(() => null),
  ]);
  return { opportunities: opps?.pagination.total ?? 0, grants: grants?.total ?? 0 };
}

/**
 * Sitemap ids: 0 = static pages + category pages + country guides,
 * then ceil(opps/CHUNK) opportunity sitemaps, then ceil(grants/CHUNK) grant sitemaps.
 */
export async function sitemapIds(): Promise<number[]> {
  const t = await totals();
  const oppChunks = Math.max(1, Math.ceil(t.opportunities / SITEMAP_CHUNK));
  const grantChunks = t.grants > 0 ? Math.ceil(t.grants / SITEMAP_CHUNK) : 0;
  return Array.from({ length: 1 + oppChunks + grantChunks }, (_, i) => i);
}

async function inBatches<T, R>(items: T[], size: number, fn: (item: T) => Promise<R>): Promise<R[]> {
  const out: R[] = [];
  for (let i = 0; i < items.length; i += size) out.push(...(await Promise.all(items.slice(i, i + size).map(fn))));
  return out;
}

export async function pagesEntries(base: (p: string) => string): Promise<SitemapEntry[]> {
  const [guides, countryHits] = await Promise.all([
    fetchCountryGuides().catch(() => []),
    // Only include category pages that actually list something (empty facets are noindex).
    inBatches(OPPORTUNITY_COUNTRIES, 6, async (c) => ({
      c,
      total: (await fetchOpportunityList({ country: c.value, limit: 1 }))?.pagination.total ?? 0,
    })),
  ]);
  const [typeHits, levelHits] = await Promise.all([
    inBatches(OPPORTUNITY_TYPES, 5, async (t) => ({ t, total: (await fetchOpportunityList({ type: t.value, limit: 1 }))?.pagination.total ?? 0 })),
    inBatches(DEGREE_LEVELS, 5, async (l) => ({ l, total: (await fetchOpportunityList({ degreeLevel: l.value, limit: 1 }))?.pagination.total ?? 0 })),
  ]);

  const paths = [
    ...STATIC_PUBLIC_PATHS,
    ...guides.map((g) => `/countries/${g.code}`),
    ...typeHits.filter((x) => x.total > 0).map((x) => `/opportunities/type/${x.t.slug}`),
    ...levelHits.filter((x) => x.total > 0).map((x) => `/opportunities/level/${x.l.slug}`),
    ...countryHits.filter((x) => x.total > 0).map((x) => `/opportunities/country/${x.c.slug}`),
  ];
  // No lastModified here: these pages have no single "updated" date and a fake one would be inaccurate.
  return paths.map((p) => ({ url: base(p) }));
}

export async function opportunityEntries(chunk: number, base: (p: string) => string): Promise<SitemapEntry[]> {
  const first = (chunk - 1) * SITEMAP_CHUNK;
  const firstPage = first / FETCH_PAGE + 1;
  const pages = Array.from({ length: SITEMAP_CHUNK / FETCH_PAGE }, (_, i) => firstPage + i);
  const seen = new Map<string, SitemapEntry>();
  let lastPage = Infinity;
  // sort=alpha lifts the API's page cap and returns every active record (open, TBA and closed).
  for (let i = 0; i < pages.length && pages[i] <= lastPage; i += 4) {
    const batch = await Promise.all(
      pages.slice(i, i + 4).filter((p) => p <= lastPage).map((p) => fetchOpportunityList({ sort: "alpha", page: p, limit: FETCH_PAGE })),
    );
    for (const data of batch) {
      if (!data) continue;
      lastPage = Math.min(lastPage, data.pagination.pages);
      for (const o of data.opportunities) {
        if (o.isActive === false) continue;
        seen.set(o._id, { url: base(opportunityPath(o)), lastModified: o.updatedAt ? new Date(o.updatedAt) : undefined });
      }
    }
  }
  return [...seen.values()];
}

export async function grantEntries(chunk: number, base: (p: string) => string): Promise<SitemapEntry[]> {
  const first = (chunk - 1) * SITEMAP_CHUNK;
  const firstPage = first / FETCH_PAGE + 1;
  const out = new Map<string, SitemapEntry>();
  for (let p = firstPage; p < firstPage + SITEMAP_CHUNK / FETCH_PAGE; p++) {
    const data = await fetchGrantList(p, FETCH_PAGE);
    if (!data || data.grants.length === 0) break;
    for (const g of data.grants) {
      out.set(g._id, { url: base(grantPath(g)), lastModified: (g as { updatedAt?: string }).updatedAt ? new Date((g as { updatedAt?: string }).updatedAt!) : new Date(g.scrapedAt) });
    }
    if (p >= data.pages) break;
  }
  return [...out.values()];
}

const xmlEscape = (s: string) =>
  s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;").replace(/'/g, "&apos;");

export function urlsetXml(entries: SitemapEntry[]): string {
  const rows = entries.map(
    (e) => `  <url><loc>${xmlEscape(e.url)}</loc>${e.lastModified ? `<lastmod>${e.lastModified.toISOString()}</lastmod>` : ""}</url>`
  );
  return `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${rows.join("\n")}\n</urlset>\n`;
}

export function sitemapIndexXml(locs: string[]): string {
  return `<?xml version="1.0" encoding="UTF-8"?>\n<sitemapindex xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${locs
    .map((l) => `  <sitemap><loc>${xmlEscape(l)}</loc></sitemap>`)
    .join("\n")}\n</sitemapindex>\n`;
}

export const XML_HEADERS = {
  "Content-Type": "application/xml; charset=utf-8",
  "Cache-Control": "public, max-age=0, s-maxage=3600, stale-while-revalidate=86400",
};

/** Resolves sitemap id -> entries. 0 = pages, 1..N = opportunity chunks, then grant chunks. */
export async function entriesForId(id: number, base: (p: string) => string): Promise<SitemapEntry[] | null> {
  if (id === 0) return pagesEntries(base);
  const opps = await fetchOpportunityList({ page: 1, limit: 1 });
  const oppChunks = Math.max(1, Math.ceil((opps?.pagination.total ?? 0) / SITEMAP_CHUNK));
  if (id <= oppChunks) return opportunityEntries(id, base);
  const grants = await fetchGrantList(1, 1);
  const grantChunks = Math.ceil((grants?.total ?? 0) / SITEMAP_CHUNK);
  if (id - oppChunks <= grantChunks) return grantEntries(id - oppChunks, base);
  return null;
}
