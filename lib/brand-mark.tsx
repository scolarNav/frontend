/** Brand mark drawn with plain JSX so next/og (ImageResponse) can render icons without binary assets. */
export function BrandMark({ size }: { size: number }) {
  return (
    <div
      style={{
        width: size,
        height: size,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        background: "#1a2d45",
        borderRadius: size * 0.22,
        position: "relative",
      }}
    >
      <div style={{ color: "#ffffff", fontSize: size * 0.66, fontWeight: 700, lineHeight: 1, marginTop: -size * 0.02 }}>S</div>
      <div
        style={{
          position: "absolute",
          right: size * 0.16,
          bottom: size * 0.16,
          width: size * 0.17,
          height: size * 0.17,
          borderRadius: size,
          background: "#d3622c",
        }}
      />
    </div>
  );
}
