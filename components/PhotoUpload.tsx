"use client";

import { useRef, useState } from "react";
import { Camera } from "lucide-react";
import { Spinner } from "@/components/ui/Spinner";

const API_BASE = process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000/api";

interface Props {
  currentUrl?: string;
  onChange: (url: string) => void;
  /** Display size in px — defaults to 80 */
  size?: number;
  /** Dark-background variant (for the wins form) */
  dark?: boolean;
}

export default function PhotoUpload({ currentUrl, onChange, size = 80, dark = false }: Props) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [preview, setPreview] = useState<string | undefined>(currentUrl);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 512 * 1024) {
      setError("Photo must be under 512 KB. Please resize or compress it first.");
      return;
    }

    setError(null);
    setUploading(true);

    // Optimistic preview
    const localUrl = URL.createObjectURL(file);
    setPreview(localUrl);

    try {
      const token = typeof window !== "undefined" ? localStorage.getItem("ScolarNav_token") : null;
      const formData = new FormData();
      formData.append("photo", file);

      const res = await fetch(`${API_BASE}/upload/photo`, {
        method: "POST",
        headers: token ? { Authorization: `Bearer ${token}` } : {},
        body: formData,
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || "Upload failed.");
      }

      const { url } = await res.json();
      setPreview(url);
      onChange(url);
    } catch (err: any) {
      setError(err.message ?? "Upload failed.");
      setPreview(currentUrl);
    } finally {
      setUploading(false);
      URL.revokeObjectURL(localUrl);
      if (inputRef.current) inputRef.current.value = "";
    }
  }

  const textClass = dark ? "text-white/70" : "text-slate";

  return (
    <div className="flex items-center gap-4">
      <button
        type="button"
        onClick={() => inputRef.current?.click()}
        disabled={uploading}
        aria-label={preview ? "Change photo" : "Upload photo"}
        className="group relative shrink-0 overflow-hidden rounded-full bg-surface-2"
        style={{ width: size, height: size }}
      >
        {preview ? (
          <img src={preview} alt="Your photo" className="h-full w-full object-cover" />
        ) : (
          <span className={`flex h-full w-full items-center justify-center ${textClass}`}>
            <Camera size={Math.round(size * 0.32)} aria-hidden="true" />
          </span>
        )}
        <span
          className={`absolute inset-0 flex items-center justify-center bg-ink/55 text-white transition-opacity ${
            uploading ? "opacity-100" : "opacity-0 group-hover:opacity-100 group-focus-visible:opacity-100"
          }`}
        >
          {uploading ? <Spinner size="sm" label="Uploading photo" /> : <Camera size={20} aria-hidden="true" />}
        </span>
      </button>

      <input
        ref={inputRef}
        type="file"
        accept="image/jpeg,image/png,image/webp,image/gif"
        className="sr-only"
        tabIndex={-1}
        onChange={handleFile}
      />

      <div className="min-w-0">
        <p className={`text-sm ${textClass}`}>{uploading ? "Uploading" : "JPEG, PNG or WebP, up to 512 KB"}</p>
        {error && <p className="mt-1 text-sm text-danger" role="alert">{error}</p>}
      </div>
    </div>
  );
}
