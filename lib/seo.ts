import type { Metadata } from "next";
import { absoluteUrl, siteConfig, truncate } from "./site";

interface PageMetaInput {
  /** Page title WITHOUT the " | ScolarNav" suffix (the root template adds it). */
  title: string;
  description: string;
  /** Canonical path, e.g. "/pricing". Query strings must not be included. */
  path: string;
  type?: "website" | "article";
  /** Absolute or root-relative image URL (resolved against metadataBase); defaults to the generated site OG image. */
  image?: string;
  noindex?: boolean;
}

// Root template appends " | ScolarNav" (11 chars); keep the full <title> under 60.
const TITLE_MAX = 60 - " | ScolarNav".length;
const DESC_MAX = 160;

/**
 * Builds consistent title/description/canonical/Open Graph/Twitter metadata.
 * Child `openGraph`/`twitter` objects replace the parent's wholesale in Next, so
 * every page must set the full object — this helper keeps that in one place.
 */
export function pageMetadata({ title, description, path, type = "website", image, noindex }: PageMetaInput): Metadata {
  const t = truncate(title, TITLE_MAX);
  const d = truncate(description, DESC_MAX);
  const url = absoluteUrl(path);
  // Child openGraph/twitter objects replace the parent's, so the default social image must be set here too.
  const images = [{ url: image ?? absoluteUrl(siteConfig.defaultOgImage), width: 1200, height: 630, alt: t }];
  return {
    title: t,
    description: d,
    alternates: { canonical: url },
    openGraph: {
      type,
      siteName: siteConfig.name,
      locale: siteConfig.locale,
      title: `${t} | ${siteConfig.name}`,
      description: d,
      url,
      images,
    },
    twitter: {
      card: "summary_large_image",
      title: `${t} | ${siteConfig.name}`,
      description: d,
      ...(siteConfig.twitterHandle ? { site: siteConfig.twitterHandle } : {}),
      images: images.map((i) => i.url),
    },
    ...(noindex ? { robots: { index: false, follow: false } } : {}),
  };
}

/** For routes that must never be indexed (auth, dashboard, admin…). */
export const noIndexMetadata: Metadata = {
  robots: { index: false, follow: false, googleBot: { index: false, follow: false } },
};
