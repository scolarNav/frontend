/** Text wordmark: a square monogram plus the product name. Replaces the raster logo, which was illegible on the navy header. */
export default function Wordmark({ onDark = false }: { onDark?: boolean }) {
  return (
    <span className="inline-flex items-center gap-2.5">
      <span
        aria-hidden="true"
        className={`flex h-8 w-8 items-center justify-center rounded-lg font-display text-lg font-semibold leading-none ${
          onDark ? "bg-white text-navy" : "bg-navy text-white"
        }`}
      >
        S
      </span>
      <span className={`font-display text-xl font-semibold leading-none ${onDark ? "text-white" : "text-ink"}`}>ScolarNav</span>
    </span>
  );
}
