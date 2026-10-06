import { Spinner } from "./Spinner";

/** Centred spinner with a short message, for waits where there is no layout to imitate. */
export function PageLoader({ label = "Loading", fullScreen = false }: { label?: string; fullScreen?: boolean }) {
  return (
    <div
      className={`flex flex-col items-center justify-center gap-4 px-4 text-center ${fullScreen ? "min-h-screen" : "min-h-[40vh]"}`}
      aria-live="polite"
    >
      <Spinner size="lg" label={label} />
      <p className="text-sm text-slate">{label}</p>
    </div>
  );
}
