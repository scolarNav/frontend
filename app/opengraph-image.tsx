import { ImageResponse } from "next/og";
import { OG_SIZE, OgCard } from "@/lib/og-card";
import { siteConfig } from "@/lib/site";

export const alt = `${siteConfig.name} — ${siteConfig.tagline}`;
export const size = OG_SIZE;
export const contentType = "image/png";
// Rendered on request: next/og cannot be prerendered during `next build` on Windows (invalid wasm URL).
export const dynamic = "force-dynamic";

export default function OpengraphImage() {
  return new ImageResponse(
    <OgCard eyebrow="Scholarships · Fellowships · Programs" title="Study abroad. Without the guesswork." subtitle="Opportunities matched to your CV, with a personal application strategy." />,
    size
  );
}
