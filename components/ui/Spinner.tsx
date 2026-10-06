/** Spinning ring. Announces itself to screen readers; pass `label` to say what is loading. */
export function Spinner({ size = "md", label = "Loading" }: { size?: "sm" | "md" | "lg"; label?: string }) {
  const sizeClass = size === "sm" ? "spinner-sm" : size === "lg" ? "spinner-lg" : "";
  return (
    <span role="status" className={`spinner ${sizeClass}`}>
      <span className="sr-only">{label}</span>
    </span>
  );
}

/** Thin indeterminate bar for long waits where the length is unknown (for example AI generation). */
export function ProgressBar({ label = "Working" }: { label?: string }) {
  return (
    <div role="progressbar" aria-label={label} aria-busy="true" className="progress-track">
      <div className="progress-bar" />
    </div>
  );
}
