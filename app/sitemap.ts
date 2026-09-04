import { MetadataRoute } from "next";

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || "https://Apexli.app";
const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000/api";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const staticRoutes: MetadataRoute.Sitemap = [
    { url: SITE_URL, lastModified: new Date(), changeFrequency: "daily", priority: 1 },
    { url: `${SITE_URL}/pricing`, lastModified: new Date(), changeFrequency: "monthly", priority: 0.8 },
    { url: `${SITE_URL}/login`, lastModified: new Date(), changeFrequency: "yearly", priority: 0.4 },
    { url: `${SITE_URL}/register`, lastModified: new Date(), changeFrequency: "yearly", priority: 0.5 },
  ];

  try {
    const res = await fetch(`${API_URL}/opportunities?limit=500`, { next: { revalidate: 3600 } });
    if (!res.ok) return staticRoutes;
    const { opportunities } = await res.json();

    const oppRoutes: MetadataRoute.Sitemap = opportunities.map((o: { _id: string; updatedAt?: string }) => ({
      url: `${SITE_URL}/opportunities/${o._id}`,
      lastModified: o.updatedAt ? new Date(o.updatedAt) : new Date(),
      changeFrequency: "weekly" as const,
      priority: 0.9,
    }));

    return [...staticRoutes, ...oppRoutes];
  } catch {
    return staticRoutes;
  }
}
