import { absoluteUrl } from "@/lib/site";
import { sitemapIds, sitemapIndexXml, XML_HEADERS } from "@/lib/sitemap-data";

// Sitemap index. Next 14's native sitemap.ts cannot emit an index or run without the API at build time,
// so sitemaps are route handlers: this index plus /sitemap/<n>.xml chunks of at most 10,000 URLs each.
// Always rendered from live data; the API fetches underneath are cached for an hour and tag-revalidated.
export const dynamic = "force-dynamic";

export async function GET() {
  const ids = await sitemapIds();
  return new Response(sitemapIndexXml(ids.map((id) => absoluteUrl(`/sitemap/${id}.xml`))), { headers: XML_HEADERS });
}
