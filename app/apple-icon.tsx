import { ImageResponse } from "next/og";
import { BrandMark } from "@/lib/brand-mark";

export const size = { width: 180, height: 180 };
export const contentType = "image/png";
// Rendered on request: next/og cannot be prerendered during `next build` on Windows (invalid wasm URL).
export const dynamic = "force-dynamic";

export default function AppleIcon() {
  return new ImageResponse(<BrandMark size={180} />, size);
}
