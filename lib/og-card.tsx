import { BrandMark } from "./brand-mark";

export const OG_SIZE = { width: 1200, height: 630 };

interface OgCardProps {
  eyebrow: string;
  title: string;
  /** e.g. funder / host */
  subtitle?: string;
  /** e.g. "Deadline: 12 March 2026" */
  footnote?: string;
}

/** 1200x630 social card. Rendered by next/og, so only flexbox layout and inline styles. */
export function OgCard({ eyebrow, title, subtitle, footnote }: OgCardProps) {
  const shown = title.length > 140 ? `${title.slice(0, 137).trimEnd()}…` : title;
  const fontSize = title.length > 90 ? 52 : title.length > 55 ? 62 : 74;
  return (
    <div
      style={{
        width: "100%",
        height: "100%",
        display: "flex",
        flexDirection: "column",
        justifyContent: "space-between",
        background: "#f8f6f2",
        padding: "64px 72px",
        borderLeft: "20px solid #d3622c",
      }}
    >
      <div style={{ display: "flex", alignItems: "center", gap: 20 }}>
        <BrandMark size={64} />
        <div style={{ display: "flex", fontSize: 34, fontWeight: 700, color: "#1a2d45" }}>ScolarNav</div>
        <div style={{ display: "flex", marginLeft: "auto", fontSize: 24, letterSpacing: 3, textTransform: "uppercase", color: "#64748B" }}>
          {eyebrow}
        </div>
      </div>

      <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
        <div style={{ display: "flex", fontSize, fontWeight: 700, lineHeight: 1.08, color: "#0f172a" }}>{shown}</div>
        {subtitle ? <div style={{ display: "flex", fontSize: 36, color: "#334155" }}>{subtitle}</div> : null}
      </div>

      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", fontSize: 28 }}>
        <div style={{ display: "flex", color: "#d3622c", fontWeight: 700 }}>{footnote ?? ""}</div>
        <div style={{ display: "flex", color: "#64748B" }}>www.scolarnav.com</div>
      </div>
    </div>
  );
}
