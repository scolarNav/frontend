import { API_URL } from "./site";
import type { Grant, GrantsResponse, Opportunity } from "./types";

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
  else if (q.excludeType) params.set("excludeType", q.excludeType);
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

export function isClosed(o: { deadline?: string }): boolean {
  return !!o.deadline && new Date(o.deadline).getTime() < Date.now();
}

export function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric", timeZone: "UTC" });
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
