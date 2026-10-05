import { absoluteUrl, siteConfig } from "./site";

/** Minimal typed shapes for the schema.org types we emit. Only real schema.org properties. */
type Thing = { "@type": string; [key: string]: unknown };
export type JsonLdNode = Thing & { "@context"?: "https://schema.org" };

/** Renders one or more JSON-LD nodes in the server HTML. */
export function JsonLd({ data }: { data: JsonLdNode | JsonLdNode[] }) {
  const nodes = (Array.isArray(data) ? data : [data]).map((n) => ({ "@context": "https://schema.org", ...n }));
  const json = JSON.stringify(nodes.length === 1 ? nodes[0] : nodes)
    // prevent "</script>" or "<!--" in record text from terminating the tag
    .replace(/</g, "\u003c");
  return <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: json }} />;
}

export function organizationJsonLd(): JsonLdNode {
  return {
    "@type": "Organization",
    "@id": absoluteUrl("/#organization"),
    name: siteConfig.name,
    url: absoluteUrl("/"),
    logo: absoluteUrl(siteConfig.logoPath),
    description: siteConfig.description,
    ...(siteConfig.sameAs.length ? { sameAs: siteConfig.sameAs } : {}),
  };
}

/** No SearchAction: the site's search box is client-side state, not a crawlable /search?q= URL. */
export function websiteJsonLd(): JsonLdNode {
  return {
    "@type": "WebSite",
    "@id": absoluteUrl("/#website"),
    name: siteConfig.name,
    url: absoluteUrl("/"),
    description: siteConfig.description,
    inLanguage: "en",
    publisher: { "@id": absoluteUrl("/#organization") },
  };
}

export interface Crumb {
  name: string;
  path: string;
}

export function breadcrumbJsonLd(crumbs: Crumb[]): JsonLdNode {
  return {
    "@type": "BreadcrumbList",
    itemListElement: crumbs.map((c, i) => ({
      "@type": "ListItem",
      position: i + 1,
      name: c.name,
      item: absoluteUrl(c.path),
    })),
  };
}

export function itemListJsonLd(items: { name: string; path: string }[]): JsonLdNode {
  return {
    "@type": "ItemList",
    itemListElement: items.map((it, i) => ({
      "@type": "ListItem",
      position: i + 1,
      url: absoluteUrl(it.path),
      name: it.name,
    })),
  };
}
