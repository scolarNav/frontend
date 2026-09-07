"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { api, ApiError } from "@/lib/api";
import { useAuth } from "@/lib/auth-context";
import { Celebration } from "@/lib/types";

const AWARD_LABELS: Record<string, string> = {
  scholarship: "Scholarship",
  study_program: "Study Programme",
  fellowship: "Fellowship",
  incubator: "Incubator",
  immigration_pathway: "Visa / Pathway",
};

const CONFETTI_CHARS = ["✦", "◆", "★", "✸", "◉", "✿", "⋯", "⬟"];

function ConfettiDot({ style, char }: { style: React.CSSProperties; char: string }) {
  return (
    <span
      aria-hidden
      className="absolute font-mono text-brass/20 select-none pointer-events-none"
      style={style}
    >
      {char}
    </span>
  );
}

export default function WinsPage() {
  const { user } = useAuth();
  const [celebrations, setCelebrations] = useState<Celebration[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function load() {
      try {
        const { celebrations: data } = await api.get<{ celebrations: Celebration[] }>("/celebrations", { auth: false });
        setCelebrations(data);
      } catch (err) {
        setError(err instanceof ApiError ? err.message : "Couldn't load the wins wall.");
      } finally {
        setLoading(false);
      }
    }
    load();
  }, []);

  const featured = celebrations.filter((c) => c.isFeatured);
  const regular = celebrations.filter((c) => !c.isFeatured);

  const confettiItems = Array.from({ length: 18 }, (_, i) => ({
    char: CONFETTI_CHARS[i % CONFETTI_CHARS.length],
    top: `${5 + (i * 17 + (i % 3) * 7) % 85}%`,
    left: `${(i * 23 + (i % 5) * 11) % 96}%`,
    fontSize: `${10 + (i % 4) * 6}px`,
    opacity: 0.15 + (i % 3) * 0.05,
  }));

  return (
    <div className="min-h-screen" style={{ backgroundColor: "#1a2d45" }}>
      {/* Hero */}
      <div className="relative overflow-hidden pt-16 pb-14 px-4 sm:px-6">
        {confettiItems.map((item, i) => (
          <ConfettiDot
            key={i}
            char={item.char}
            style={{
              top: item.top,
              left: item.left,
              fontSize: item.fontSize,
              opacity: item.opacity,
            }}
          />
        ))}

        <div className="relative max-w-2xl mx-auto text-center">
          <p className="font-mono text-xs tracking-widest uppercase text-brass mb-4">The wins wall</p>
          <h1 className="font-display text-4xl sm:text-6xl text-white leading-tight">
            ScolarNav students<br />who made it
          </h1>
          <p className="text-white/60 mt-5 text-base leading-relaxed max-w-lg mx-auto">
            Real people, real wins. Every one of them prepared for this — now they're in.
          </p>
          {user ? (
            <Link
              href="/wins/share"
              className="inline-flex mt-8 px-6 py-3 bg-brass text-white text-sm font-medium hover:opacity-90 transition-opacity"
            >
              Share your win →
            </Link>
          ) : (
            <Link
              href="/register"
              className="inline-flex mt-8 px-6 py-3 bg-white text-navy text-sm font-medium hover:bg-surface transition-colors"
            >
              Join ScolarNav — it's free
            </Link>
          )}
        </div>
      </div>

      <div className="max-w-5xl mx-auto px-4 sm:px-6 pb-20">
        {loading && (
          <div className="flex justify-center py-20">
            <p className="font-mono text-xs text-white/40 uppercase tracking-widest">Loading…</p>
          </div>
        )}
        {error && <p className="text-alert text-sm text-center py-10">{error}</p>}

        {!loading && celebrations.length === 0 && (
          <div className="text-center py-20">
            <p className="text-4xl mb-4">🏆</p>
            <p className="text-white/60 text-base">No wins shared yet — be the first.</p>
            {user && (
              <Link href="/wins/share" className="inline-flex mt-6 px-5 py-2.5 bg-brass text-white text-sm hover:opacity-90 transition-opacity">
                Share your win
              </Link>
            )}
          </div>
        )}

        {/* Featured wins */}
        {featured.length > 0 && (
          <div className="mb-10">
            <p className="font-mono text-xs text-brass uppercase tracking-widest mb-4">Featured</p>
            <div className="grid sm:grid-cols-2 gap-4">
              {featured.map((c) => (
                <CelebrationCard key={c._id} c={c} featured />
              ))}
            </div>
          </div>
        )}

        {/* All wins */}
        {regular.length > 0 && (
          <div>
            {featured.length > 0 && (
              <p className="font-mono text-xs text-white/40 uppercase tracking-widest mb-4">All wins</p>
            )}
            <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {regular.map((c) => (
                <CelebrationCard key={c._id} c={c} />
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function CelebrationCard({ c, featured = false }: { c: Celebration; featured?: boolean }) {
  return (
    <div
      className={`relative overflow-hidden p-5 sm:p-6 flex flex-col gap-3 ${featured ? "sm:p-8" : ""
        }`}
      style={{
        background: featured
          ? "linear-gradient(135deg, rgba(217,119,6,0.15) 0%, rgba(13,27,42,0.9) 60%)"
          : "rgba(255,255,255,0.04)",
        border: featured ? "1px solid rgba(217,119,6,0.4)" : "1px solid rgba(255,255,255,0.08)",
      }}
    >
      {/* Trophy decoration */}
      <span
        aria-hidden
        className="absolute top-3 right-4 text-3xl select-none pointer-events-none opacity-20"
      >
        🏆
      </span>

      {/* Award type badge */}
      <span className="font-mono text-xs text-brass uppercase tracking-widest self-start">
        {AWARD_LABELS[c.awardType] ?? c.awardType}
      </span>

      {/* Scholarship name */}
      <p className={`font-display text-white leading-snug ${featured ? "text-xl sm:text-2xl" : "text-lg"}`}>
        {c.opportunityTitle}
      </p>
      {c.opportunityProvider && (
        <p className="text-white/40 text-xs font-mono">{c.opportunityProvider}</p>
      )}

      {/* Message */}
      <p className="text-white/70 text-sm leading-relaxed flex-1">
        &ldquo;{c.message}&rdquo;
      </p>

      {/* Person */}
      <div className="flex items-center gap-2 pt-2 border-t border-white/10">
        {c.photoUrl ? (
          <img
            src={c.photoUrl}
            alt={c.displayName}
            className="w-8 h-8 rounded-full object-cover shrink-0 ring-1 ring-brass/30"
          />
        ) : (
          <div className="w-8 h-8 rounded-full bg-brass/20 flex items-center justify-center shrink-0">
            <span className="text-xs font-medium text-brass">{c.displayName.charAt(0).toUpperCase()}</span>
          </div>
        )}
        <div>
          <p className="text-white text-sm font-medium leading-none">{c.displayName}</p>
          {c.country && (
            <p className="text-white/40 text-xs font-mono mt-0.5">{c.country}</p>
          )}
        </div>
        <p className="ml-auto text-white/30 text-xs font-mono">
          {new Date(c.createdAt).toLocaleDateString("en-GB", { month: "short", year: "numeric" })}
        </p>
      </div>
    </div>
  );
}
