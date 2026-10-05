/**
 * Single source of truth for site-wide SEO configuration.
 * Everything that needs the base URL, brand name or default OG image imports it from here.
 */

const PRODUCTION_URL = "https://www.scolarnav.com";

const configuredUrl = (process.env.NEXT_PUBLIC_SITE_URL || PRODUCTION_URL).replace(/\/+$/, "");

// The bare domain (and plain http) is the same site as the production URL. Normalising it means a host
// configured as "https://scolarnav.com" still gets the www canonical instead of being mistaken for staging.
export const SITE_URL = /^https?:\/\/(www\.)?scolarnav\.com$/i.test(configuredUrl) ? PRODUCTION_URL : configuredUrl;
export const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000/api";

/**
 * Only the real production deployment may be indexed. Staging and previews are
 * blocked by robots.txt and a noindex meta tag. A deployment counts as production
 * when its public URL is the production URL (and, on Vercel, VERCEL_ENV says so).
 * NEXT_PUBLIC_NOINDEX=true forces a block regardless.
 */
export const IS_PRODUCTION_SITE =
  process.env.NEXT_PUBLIC_NOINDEX !== "true" &&
  SITE_URL === PRODUCTION_URL &&
  (!process.env.VERCEL_ENV || process.env.VERCEL_ENV === "production");

/**
 * The startup-grants section (/grants) is for businesses and NGOs, which the platform does not serve, so it
 * is hidden: routes 404, and it is left out of navigation, sitemap and robots. The data and components
 * are kept; set NEXT_PUBLIC_SHOW_GRANTS=true to bring it back.
 */
export const SHOW_GRANTS = process.env.NEXT_PUBLIC_SHOW_GRANTS === "true";

/**
 * Incubators/accelerators are for businesses, which the platform does not serve, so they are hidden:
 * no category page, their detail pages 404, and they are excluded from every listing and the sitemap.
 * Set NEXT_PUBLIC_SHOW_INCUBATORS=true to bring them back.
 */
export const SHOW_INCUBATORS = process.env.NEXT_PUBLIC_SHOW_INCUBATORS === "true";

export const siteConfig = {
  name: "ScolarNav",
  legalName: "ScolarNav",
  tagline: "Scholarships & Opportunities for Global Talent",
  description:
    "Find scholarships, fellowships, study programs, and immigration or incubation pathways abroad. Get a personalized application strategy built from your own CV.",
  url: SITE_URL,
  locale: "en_US",
  logoPath: "/logo/logo.png",
  defaultOgImage: "/opengraph-image",
  contactEmail: "coaches@scolarnav.com",
  // Fill in real profile URLs/handles when they exist. Leave empty to omit.
  twitterHandle: process.env.NEXT_PUBLIC_TWITTER_HANDLE || "",
  sameAs: (process.env.NEXT_PUBLIC_SOCIAL_PROFILES || "")
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean),
  verification: {
    google: process.env.NEXT_PUBLIC_GOOGLE_SITE_VERIFICATION || undefined,
    bing: process.env.NEXT_PUBLIC_BING_SITE_VERIFICATION || undefined,
  },
} as const;

export function absoluteUrl(path = "/"): string {
  return `${SITE_URL}${path.startsWith("/") ? path : `/${path}`}`;
}

/** Trim to a max length on a word boundary, adding an ellipsis when cut. */
export function truncate(text: string, max: number): string {
  const clean = text.replace(/\s+/g, " ").trim();
  if (clean.length <= max) return clean;
  const cut = clean.slice(0, max - 1);
  const lastSpace = cut.lastIndexOf(" ");
  return `${(lastSpace > max * 0.6 ? cut.slice(0, lastSpace) : cut).replace(/[\s,;:.\-–—]+$/, "")}…`;
}
