import { Check } from "lucide-react";

/** Toggle chip for multi-select lists. Selection shows as fill plus a check mark, not colour alone. */
export function Chip({ active, onClick, children }: { active: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      className={`inline-flex min-h-touch items-center gap-1.5 rounded-full px-4 text-sm font-medium transition-colors ${
        active ? "bg-navy text-white" : "bg-white text-ink-soft ring-1 ring-inset ring-control hover:bg-surface-2"
      }`}
    >
      {active && <Check size={14} aria-hidden="true" />}
      {children}
    </button>
  );
}
