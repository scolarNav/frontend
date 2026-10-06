import { Paperclip } from "lucide-react";

/** Styled file chooser. The native input stays in the page for keyboard and screen reader use. */
export function FilePicker({
  id,
  accept,
  file,
  onChange,
  disabled,
  label = "Choose a PDF",
}: {
  id: string;
  accept?: string;
  file: File | null;
  onChange: (file: File | null) => void;
  disabled?: boolean;
  label?: string;
}) {
  return (
    <div className="flex flex-wrap items-center gap-3">
      <label
        htmlFor={id}
        className={`btn-secondary btn-sm cursor-pointer focus-within:outline focus-within:outline-2 focus-within:outline-offset-2 focus-within:outline-forest ${
          disabled ? "pointer-events-none opacity-50" : ""
        }`}
      >
        <Paperclip size={16} aria-hidden="true" />
        {label}
        <input
          id={id}
          type="file"
          accept={accept}
          disabled={disabled}
          onChange={(e) => onChange(e.target.files?.[0] ?? null)}
          className="sr-only"
        />
      </label>
      <span className="min-w-0 max-w-xs truncate text-sm text-slate" aria-live="polite">
        {file ? file.name : "No file chosen"}
      </span>
    </div>
  );
}
