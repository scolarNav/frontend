import { SHOW_INCUBATORS } from "./site";
import type { DegreeLevel, OpportunityType } from "./types";

export function slugify(text: string): string {
  return text
    .normalize("NFKD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/&/g, " and ")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

/** Listing-page taxonomy. `slug` is the URL segment, `value` is what the API filters on. */
export const OPPORTUNITY_TYPES: { slug: string; value: OpportunityType; label: string; plural: string }[] = [
  { slug: "scholarships", value: "scholarship", label: "Scholarship", plural: "Scholarships" },
  { slug: "fellowships", value: "fellowship", label: "Fellowship", plural: "Fellowships" },
  { slug: "study-programs", value: "study_program", label: "Study Program", plural: "Study Programs" },
  { slug: "immigration-pathways", value: "immigration_pathway", label: "Immigration Pathway", plural: "Immigration Pathways" },
  ...(SHOW_INCUBATORS
    ? [{ slug: "incubators", value: "incubator" as const, label: "Incubator", plural: "Incubators & Accelerators" }]
    : []),
];

export const DEGREE_LEVELS: { slug: string; value: DegreeLevel; label: string }[] = [
  { slug: "undergraduate", value: "undergraduate", label: "Undergraduate" },
  { slug: "masters", value: "masters", label: "Master's" },
  { slug: "phd", value: "phd", label: "PhD" },
  { slug: "postdoc", value: "postdoc", label: "Postdoctoral" },
  { slug: "professional", value: "professional", label: "Professional" },
];

/** Countries as stored by the scrapers (same list the catalogue filter uses). */
export const OPPORTUNITY_COUNTRIES = [
  "United Kingdom", "United States", "Germany", "Canada", "Australia", "Netherlands", "Sweden", "France",
  "Japan", "South Korea", "Norway", "Denmark", "Switzerland", "Belgium", "Ireland", "New Zealand", "Finland",
  "Austria", "Italy", "China", "South Africa", "Nigeria", "Kenya", "Ghana", "Egypt", "Rwanda", "Morocco",
  "Ethiopia", "Multiple",
].map((value) => ({
  slug: slugify(value),
  value,
  label: value === "Multiple" ? "Multiple / International" : value,
}));

export const typeBySlug = (slug: string) => OPPORTUNITY_TYPES.find((t) => t.slug === slug);
export const typeByValue = (value: string) => OPPORTUNITY_TYPES.find((t) => t.value === value);
export const levelBySlug = (slug: string) => DEGREE_LEVELS.find((l) => l.slug === slug);
export const levelByValue = (value: string) => DEGREE_LEVELS.find((l) => l.value === value);
export const countryBySlug = (slug: string) => OPPORTUNITY_COUNTRIES.find((c) => c.slug === slug);
export const countryByValue = (value: string) =>
  OPPORTUNITY_COUNTRIES.find((c) => c.value.toLowerCase() === value.toLowerCase());
