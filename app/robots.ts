import type { MetadataRoute } from "next";
import { IS_PRODUCTION_SITE, SITE_URL } from "@/lib/site";

// Routes that are private, per-user, or transactional. Mirrors the noindex layouts.
export const PRIVATE_PATHS = [
  "/api/",
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

export default function robots(): MetadataRoute.Robots {
  if (!IS_PRODUCTION_SITE) {
    // Staging / preview: block everything and don't advertise a sitemap.
    return { rules: [{ userAgent: "*", disallow: "/" }] };
  }
  return {
    rules: [{ userAgent: "*", allow: "/", disallow: PRIVATE_PATHS }],
    sitemap: `${SITE_URL}/sitemap.xml`,
    host: SITE_URL,
  };
}
