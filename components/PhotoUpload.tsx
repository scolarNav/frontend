"use client";

import { useRef, useState } from "react";

const API_BASE = process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000/api";

interface Props {
  currentUrl?: string;
  onChange: (url: string) => void;
  /** Display size in px â€” defaults to 80 */
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
      const token = typeof window !== "undefined" ? localStorage.getItem("ScholarNav_token") : null;
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

  const initials = "?";
  const ringClass = dark ? "border-white/20" : "border-rule";
  const textClass = dark ? "text-white/40" : "text-slate";
  const bgClass = dark ? "bg-white/10" : "bg-canvas";

  return (
    <div className="flex flex-col items-start gap-2">
      <button
        type="button"
        onClick={() => inputRef.current?.click()}
        className={`relative rounded-full border-2 ${ringClass} overflow-hidden shrink-0 group`}
        style={{ width: size, height: size }}
        title="Click to upload photo"
      >
        {preview ? (
          <img src={preview} alt="Profile photo" className="w-full h-full object-cover" />
        ) : (
          <div className={`w-full h-full flex items-center justify-center ${bgClass} ${textClass} font-display`} style={{ fontSize: size * 0.35 }}>
            {initials}
          </div>
        )}
        <div className="absolute inset-0 flex items-center justify-center bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity rounded-full">
          <span className="text-white text-xs font-mono">{uploading ? "â€¦" : "Upload"}</span>
        </div>
      </button>

      <input
        ref={inputRef}
        type="file"
        accept="image/jpeg,image/png,image/webp,image/gif"
        className="sr-only"
        onChange={handleFile}
      />

      <p className={`text-xs font-mono ${textClass}`}>
        {uploading ? "Uploadingâ€¦" : "JPEG, PNG or WebP Â· max 512 KB"}
      </p>

      {error && <p className="text-xs text-alert">{error}</p>}
    </div>
  );
}
