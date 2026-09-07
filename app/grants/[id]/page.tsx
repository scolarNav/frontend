"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { api, ApiError } from "@/lib/api";
import type { Grant, GrantTag } from "@/lib/types";

const TAG_META: Record<GrantTag, { label: string; color: string }> = {
  africa: { label: "Africa", color: "#D97706" },
  technology: { label: "Technology", color: "#0D6EFD" },
  innovation: { label: "Innovation", color: "#6F42C1" },
  inclusion: { label: "Inclusion", color: "#E91E8C" },
  talent: { label: "Talent", color: "#20C997" },
  education: { label: "Education", color: "#0DCAF0" },
  youth: { label: "Youth", color: "#FD7E14" },
};

function GrantTagPill({ tag }: { tag: GrantTag }) {
  const { label, color } = TAG_META[tag] ?? { label: tag, color: "#64748B" };
  return (
    <span
      className="font-mono text-xs px-2.5 py-1 rounded-full border"
      style={{ color, borderColor: color, backgroundColor: `${color}15` }}
    >
      {label}
    </span>
  );
}

export default function GrantDetailPage() {
  const { id } = useParams<{ id: string }>();
  const [grant, setGrant] = useState<Grant | null>(null);
  const [fullContent, setFullContent] = useState<string | null>(null);
  const [contentLoading, setContentLoading] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!id) return;

    // Load grant metadata first
    api.get<{ grant: Grant }>(`/grants/${id}`, { auth: false })
      .then(({ grant: g }) => {
        setGrant(g);
        // Then fetch full content from the source page
        setContentLoading(true);
        return api.get<{ content: string | null }>(`/grants/${id}/content`, { auth: false });
      })
      .then(({ content }) => {
        setFullContent(content);
      })
      .catch((err) => {
        if (!grant) {
          setError(err instanceof ApiError ? err.message : "Could not load this grant.");
        }
        // Silently fall back to stored description if content fetch fails
      })
      .finally(() => {
        setLoading(false);
        setContentLoading(false);
      });
  }, [id]);

  if (loading) {
    return (
      <main className="max-w-3xl mx-auto px-4 sm:px-6 py-12">
        <div className="animate-pulse space-y-4">
          <div className="h-3 bg-surface rounded w-24" />
          <div className="h-7 bg-surface rounded w-3/4" />
          <div className="h-4 bg-surface rounded w-1/3" />
          <div className="h-px bg-surface my-6" />
          <div className="space-y-2">
            {Array.from({ length: 8 }).map((_, i) => (
              <div key={i} className={`h-4 bg-surface rounded ${i % 3 === 2 ? "w-4/5" : "w-full"}`} />
            ))}
          </div>
        </div>
      </main>
    );
  }

  if (error || !grant) {
    return (
      <main className="max-w-3xl mx-auto px-4 sm:px-6 py-12">
        <Link href="/grants" className="font-mono text-xs text-slate hover:text-ink transition-colors">
          ← Back to Grants
        </Link>
        <div className="case-card p-8 text-center mt-8">
          <p className="text-alert text-sm">{error ?? "Grant not found."}</p>
          <Link href="/grants" className="btn-primary text-sm mt-4 inline-flex">
            Browse all grants
          </Link>
        </div>
      </main>
    );
  }

  const deadlineDate = grant.deadline ? new Date(grant.deadline) : null;
  const isPast = deadlineDate ? deadlineDate < new Date() : false;
  const daysLeft = deadlineDate
    ? Math.ceil((deadlineDate.getTime() - Date.now()) / 86400000)
    : null;

  const scrapedDate = new Date(grant.scrapedAt).toLocaleDateString("en-GB", {
    day: "numeric", month: "long", year: "numeric",
  });

  // Use live-scraped full content if available, otherwise fall back to stored description
  const bodyText = fullContent ?? grant.description;

  return (
    <main className="max-w-3xl mx-auto px-4 sm:px-6 py-12">
      {/* Back */}
      <Link
        href="/grants"
        className="font-mono text-xs text-slate hover:text-ink transition-colors inline-flex items-center gap-1 mb-8"
      >
        ← Back to Grants
      </Link>

      {/* Header */}
      <div className="mb-6">
        <p className="font-mono text-xs tracking-widest uppercase text-brass mb-3">{grant.source}</p>
        <h1 className="font-display text-2xl sm:text-3xl text-ink leading-snug mb-2">
          {grant.title}
        </h1>
        <p className="text-slate text-sm">by {grant.provider}</p>
      </div>

      {/* Meta row */}
      <div className="flex flex-wrap items-center gap-x-6 gap-y-3 py-4 border-y border-rule mb-8">
        {grant.amount && (
          <div className="flex items-center gap-2">
            <span className="font-mono text-xs text-slate uppercase tracking-wide">Amount</span>
            <span className="font-mono text-sm text-slate border border-rule px-2.5 py-1">
              {grant.amount}
            </span>
          </div>
        )}

        {deadlineDate && (
          <div className="flex items-center gap-2">
            <span className="font-mono text-xs text-slate uppercase tracking-wide">Deadline</span>
            <span
              className="font-mono text-sm"
              style={{
                color: isPast
                  ? "#94a3b8"
                  : daysLeft !== null && daysLeft <= 14
                    ? "#d3622c"
                    : "#0F172A",
              }}
            >
              {isPast
                ? `Closed · ${deadlineDate.toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" })}`
                : daysLeft === 0
                  ? "Closes today"
                  : `${daysLeft} day${daysLeft === 1 ? "" : "s"} left · ${deadlineDate.toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" })}`}
            </span>
          </div>
        )}

        {!grant.isOpen && !deadlineDate && (
          <span className="font-mono text-xs text-slate bg-surface border border-rule px-2.5 py-1 rounded-full">
            Closed
          </span>
        )}
      </div>

      {/* Tags */}
      {grant.tags.length > 0 && (
        <div className="flex flex-wrap gap-2 mb-8">
          {grant.tags.map((t) => (
            <GrantTagPill key={t} tag={t} />
          ))}
        </div>
      )}

      {/* Full content */}
      <div className="case-card p-6 mb-8">
        <h2 className="font-display text-base text-ink mb-4">About this grant</h2>

        {contentLoading ? (
          <div className="animate-pulse space-y-2">
            {Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className={`h-4 bg-surface rounded ${i % 3 === 2 ? "w-4/5" : "w-full"}`} />
            ))}
          </div>
        ) : (
          <div className="text-sm text-ink-soft leading-relaxed space-y-4">
            {bodyText
              .split(/\n{2,}/)
              .map((para) => para.trim())
              .filter((para) => para.length > 0)
              .map((para, i) => (
                <p key={i}>{para}</p>
              ))}
          </div>
        )}
      </div>

      {/* CTA */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4">
        <a
          href={grant.url}
          target="_blank"
          rel="noopener noreferrer"
          className="btn-primary inline-flex items-center gap-2"
        >
          View full grant details
          <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
            <path d="M2.5 9.5L9.5 2.5M9.5 2.5H5M9.5 2.5V7" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </a>
        <Link
          href="/grants"
          className="font-mono text-xs text-slate hover:text-ink transition-colors"
        >
          ← Browse all grants
        </Link>
      </div>

      {/* Footer note */}
      <p className="font-mono text-xs text-slate/50 mt-10 pt-6 border-t border-rule">
        Listed from {grant.source} · Added {scrapedDate} · ScholarNav does not verify individual listings — always check the official source before applying.
      </p>
    </main>
  );
}
