import type { MetadataRoute } from "next";
import { IS_PRODUCTION_SITE, SHOW_GRANTS, SITE_URL } from "@/lib/site";

// Routes that are private, per-user, or transactional. Mirrors the noindex layouts.
export const PRIVATE_PATHS = [
  "/api/",
  "/data-export", // scraper trap: see middleware.ts
  "/admin",
  "/applications/",
  "/bookings",
  "/coaches/apply",
  "/coaches/dashboard",
  "/cv",
  "/dashboard",
  "/deadlines",
  "/interview",
  "/login",
  "/mentor",
  "/onboarding",
  "/profile",
  "/register",
  "/roadmap",
  "/submit-scholarship",
  "/wins/share",
];

// Crawlers that copy content to train models or harvest data. Search engines are not listed here.
const DATA_HARVESTERS = [
  "GPTBot", "ChatGPT-User", "CCBot", "ClaudeBot", "Claude-Web", "anthropic-ai", "Google-Extended", "Applebot-Extended",
  "Bytespider", "Diffbot", "ImagesiftBot", "Omgilibot", "cohere-ai", "Amazonbot", "meta-externalagent", "PetalBot",
  "Timpibot", "SemrushBot", "AhrefsBot", "MJ12bot", "DotBot", "BLEXBot", "DataForSeoBot",
];

export default function robots(): MetadataRoute.Robots {
  if (!IS_PRODUCTION_SITE) {
    // Staging / preview: block everything and don't advertise a sitemap.
    return { rules: [{ userAgent: "*", disallow: "/" }] };
  }
  return {
    rules: [
      { userAgent: DATA_HARVESTERS, disallow: "/" },
      { userAgent: "*", allow: "/", disallow: SHOW_GRANTS ? PRIVATE_PATHS : [...PRIVATE_PATHS, "/grants"] },
    ],
    sitemap: `${SITE_URL}/sitemap.xml`,
    host: SITE_URL,
  };
}
