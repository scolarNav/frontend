import { API_URL, SHOW_INCUBATORS } from "./site";
import type { Celebration, Grant, GrantsResponse, Opportunity } from "./types";

export interface Pagination {
  page: number;
  limit: number;
  total: number;
  pages: number;
}

export const PAGE_SIZE = 20;
const REVALIDATE = 3600;

/**
 * Returns null ONLY for a definitive 404. Any other failure (network, 5xx) throws, so a transient
 * API outage surfaces as an error (Next keeps serving the last good ISR page) instead of being
 * cached as a "not found" page and dropping out of the index.
 */
async function getJson<T>(path: string, tags: string[]): Promise<T | null> {
  const res = await fetch(`${API_URL}${path}`, { next: { revalidate: REVALIDATE, tags } });
  if (res.status === 404) return null;
  if (!res.ok) throw new Error(`API ${path} responded ${res.status}`);
  return (await res.json()) as T;
}

export async function fetchOpportunity(id: string): Promise<Opportunity | null> {
  const data = await getJson<{ opportunity?: Opportunity }>(`/opportunities/${id}`, ["opportunities", `opportunity-${id}`]);
  return data?.opportunity ?? null;
}

export interface ListQuery {
  type?: string;
  excludeType?: string;
  country?: string;
  degreeLevel?: string;
  openOnly?: boolean;
  page?: number;
  limit?: number;
  sort?: "alpha";
}

export async function fetchOpportunityList(q: ListQuery): Promise<{ opportunities: Opportunity[]; pagination: Pagination } | null> {
  const params = new URLSearchParams();
  if (q.type) params.set("type", q.type);
  // Incubators are hidden site-wide, so every listing (and the sitemap) excludes them by default.
  else if (q.excludeType || !SHOW_INCUBATORS) params.set("excludeType", q.excludeType ?? "incubator");
  if (q.country) params.set("country", q.country);
  if (q.degreeLevel) params.set("degreeLevel", q.degreeLevel);
  if (q.openOnly) params.set("openOnly", "true");
  if (q.sort) params.set("sort", q.sort);
  params.set("page", String(q.page ?? 1));
  params.set("limit", String(q.limit ?? PAGE_SIZE));
  return getJson(`/opportunities?${params}`, ["opportunities"]);
}

/** Open (future-deadline) opportunities, used for "similar open opportunities" blocks. */
export async function fetchOpenOpportunities(
  filter: { type?: string; country?: string; degreeLevel?: string },
  limit = 12
): Promise<Opportunity[]> {
  const data = await fetchOpportunityList({ ...filter, openOnly: true, limit });
  return data?.opportunities ?? [];
}

export async function fetchGrantList(page = 1, limit = 100): Promise<GrantsResponse | null> {
  return getJson(`/grants?page=${page}&limit=${limit}`, ["grants"]);
}

export async function fetchGrant(id: string): Promise<Grant | null> {
  const data = await getJson<{ grant?: Grant }>(`/grants/${id}`, ["grants", `grant-${id}`]);
  return data?.grant ?? null;
}

/** Records that must not be shown publicly (currently: incubators, unless enabled). */
export function isHiddenType(o: { type?: string }): boolean {
  return !SHOW_INCUBATORS && o.type === "incubator";
}

export function isClosed(o: { deadline?: string }): boolean {
  return !!o.deadline && new Date(o.deadline).getTime() < Date.now();
}

// Deadlines are stored as local midnight of the source site (UTC+1), i.e. 23:00Z the previous day, so a
// UTC calendar day would be off by one. Render calendar days in Africa/Lagos (UTC+1, no DST).
const DEADLINE_TZ = "Africa/Lagos";

export function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric", timeZone: DEADLINE_TZ });
}

/** YYYY-MM-DD in the same calendar as formatDate (for schema.org Date values). */
export function isoDay(iso: string): string {
  return new Date(iso).toLocaleDateString("en-CA", { timeZone: DEADLINE_TZ });
}

/** Provider names the scrapers could not determine are stored as "Unknown". */
export function knownProvider(provider?: string): string | null {
  const p = (provider ?? "").trim();
  return p && p.toLowerCase() !== "unknown" ? p : null;
}

export interface CountryGuideSummary {
  code: string;
  name: string;
  flag: string;
  tagline: string;
  bestFor: string[];
  avgMonthlyExpensesUSD: number;
  applicationLanguage: string;
}

export async function fetchCountryGuides(): Promise<CountryGuideSummary[]> {
  const data = await getJson<{ countries: CountryGuideSummary[] }>("/countries", ["countries"]);
  return data?.countries ?? [];
}

export async function fetchCountryGuide(code: string) {
  const data = await getJson<{ country: import("./types").CountryGuide }>(`/countries/${code}`, ["countries"]);
  return data?.country ?? null;
}

export async function fetchCelebrations(): Promise<Celebration[]> {
  const data = await getJson<{ celebrations: Celebration[] }>("/celebrations", ["celebrations"]);
  return data?.celebrations ?? [];
}
