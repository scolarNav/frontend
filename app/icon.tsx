import { ImageResponse } from "next/og";
import { BrandMark } from "@/lib/brand-mark";

export const size = { width: 32, height: 32 };
export const contentType = "image/png";
// Rendered on request: next/og cannot be prerendered during `next build` on Windows (invalid wasm URL).
export const dynamic = "force-dynamic";

export default function Icon() {
  return new ImageResponse(<BrandMark size={32} />, size);
}
