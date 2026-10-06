"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import Link from "next/link";
import { api, ApiError } from "@/lib/api";
import type { Grant, GrantTag, GrantsResponse } from "@/lib/types";
import { grantPath } from "@/lib/paths";
import PagerLink from "@/components/PagerLink";
import { Alert } from "@/components/ui/States";
import { Chip } from "@/components/ui/Chip";

const TAG_LABELS: Record<GrantTag, string> = {
  africa: "Africa",
  technology: "Technology",
  innovation: "Innovation",
  inclusion: "Inclusion",
  talent: "Talent",
  education: "Education",
  youth: "Youth",
};

const ALL_TAGS = Object.keys(TAG_LABELS) as GrantTag[];

function TagChip({ tag, active, onClick }: { tag: GrantTag; active: boolean; onClick: () => void }) {
  return <Chip active={active} onClick={onClick}>{TAG_LABELS[tag]}</Chip>;
}

function GrantTagPill({ tag }: { tag: GrantTag }) {
  return <span className="badge">{TAG_LABELS[tag] ?? tag}</span>;
}

function grantStatus(grant: Grant): { label: string; badge: string } {
  const now = Date.now();
  const deadlineMs = grant.deadline ? new Date(grant.deadline).getTime() : null;
  const daysLeft = deadlineMs !== null ? Math.ceil((deadlineMs - now) / 86400000) : null;

  if (!grant.isOpen || (daysLeft !== null && daysLeft < 0)) return { label: "Deadline passed", badge: "" };
  if (daysLeft !== null && daysLeft <= 3) return { label: "Closing", badge: "badge-danger" };
  if (daysLeft !== null && daysLeft <= 14) return { label: "Closing soon", badge: "badge-warn" };
  return { label: "Open", badge: "badge-ok" };
}

function GrantCard({ grant }: { grant: Grant }) {
  const deadlineDate = grant.deadline ? new Date(grant.deadline) : null;
  const daysLeft = deadlineDate
    ? Math.ceil((deadlineDate.getTime() - Date.now()) / 86400000)
    : null;
  const sc = grantStatus(grant);
  const isPast = daysLeft !== null && daysLeft < 0;

  return (
    <div className="card-interactive flex flex-col gap-3 p-5">
      {/* Header: title + amount */}
      <div className="flex items-start justify-between gap-3">
        <div className="flex-1 min-w-0">
          {/* Status badge */}
          <span className={`badge mb-1.5 ${sc.badge}`}>{sc.label}</span>
          <Link
            href={grantPath(grant)}
            className="block font-display text-base text-ink hover:text-forest transition-colors line-clamp-2 leading-snug"
          >
            {grant.title}
          </Link>
          <p className="text-xs text-slate mt-0.5">{grant.provider}</p>
        </div>
        {grant.amount && (
          <span className="badge shrink-0 whitespace-nowrap">
            {grant.amount}
          </span>
        )}
      </div>

      <p className="text-sm text-ink-soft leading-relaxed line-clamp-3">{grant.description}</p>

      <div className="flex flex-wrap gap-1.5">
        {grant.tags.map((t) => (
          <GrantTagPill key={t} tag={t} />
        ))}
      </div>

      {/* Footer: deadline + actions */}
      <div className="flex items-center justify-between pt-2 border-t border-rule">
        <div className="flex flex-col gap-0.5">
          {deadlineDate && !isPast && daysLeft !== null && (
            <span className={`text-sm font-semibold ${daysLeft <= 14 ? "text-warn" : "text-slate"}`}>
              {daysLeft <= 0
                ? "Closes today"
                : daysLeft === 1
                  ? "1 day left"
                  : `${daysLeft} days left`}
            </span>
          )}
          {deadlineDate && (
            <span className={`text-sm text-slate${isPast ? " line-through" : ""}`}>
              {isPast ? "Closed " : "Closes "}
              {deadlineDate.toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" })}
            </span>
          )}
          {!deadlineDate && grant.isOpen && (
            <span className="text-sm text-slate">Deadline not listed</span>
          )}
        </div>

        <div className="flex items-center gap-3">
          <Link
            href={grantPath(grant)}
            className="font-mono text-xs text-ink-soft hover:text-ink transition-colors"
          >
            Details →
          </Link>
          <a
            href={grant.url}
            target="_blank"
            rel="noopener noreferrer"
            className="font-mono text-xs text-forest hover:underline flex items-center gap-1"
          >
            Apply
            <svg width="10" height="10" viewBox="0 0 10 10" fill="none">
              <path d="M2 8L8 2M8 2H4M8 2V6" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </a>
        </div>
      </div>
    </div>
  );
}

function SkeletonCard() {
  return (
    <div className="case-card p-5 flex flex-col gap-3 animate-pulse">
      <div className="h-4 bg-surface rounded w-3/4" />
      <div className="h-3 bg-surface rounded w-1/3" />
      <div className="h-3 bg-surface rounded w-full" />
      <div className="h-3 bg-surface rounded w-5/6" />
      <div className="flex gap-2">
        <div className="h-5 bg-surface rounded-full w-16" />
        <div className="h-5 bg-surface rounded-full w-20" />
      </div>
    </div>
  );
}

export default function GrantsExplorer({ initial }: { initial: GrantsResponse | null }) {
  const [grants, setGrants] = useState<Grant[]>(initial?.grants ?? []);
  const [total, setTotal] = useState(initial?.total ?? 0);
  const [lastScrapedAt, setLastScrapedAt] = useState<string | null>(initial?.lastScrapedAt ?? null);
  // The server already rendered this view; skip the first client fetch when nothing has changed.
  const skipInitialLoad = useRef(!!initial);
  const [loading, setLoading] = useState(!initial);
  const [error, setError] = useState<string | null>(null);
  const [activeTag, setActiveTag] = useState<GrantTag | null>(null);
  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [page, setPage] = useState(initial?.page ?? 1);
  const [pages, setPages] = useState(initial?.pages ?? 1);

  useEffect(() => {
    const t = setTimeout(() => setDebouncedSearch(search), 400);
    return () => clearTimeout(t);
  }, [search]);

  const filtersMounted = useRef(false);
  useEffect(() => {
    // Don't reset the server-selected page on first mount.
    if (!filtersMounted.current) { filtersMounted.current = true; return; }
    setPage(1);
  }, [activeTag, debouncedSearch]);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams({ page: String(page), limit: "24" });
      if (activeTag) params.set("tag", activeTag);
      if (debouncedSearch.trim()) params.set("q", debouncedSearch.trim());

      const data = await api.get<GrantsResponse>(`/grants?${params}`, { auth: false });
      setGrants(data.grants);
      setTotal(data.total);
      setPages(data.pages);
      setLastScrapedAt(data.lastScrapedAt);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Couldn't load grants. Please try again.");
    } finally {
      setLoading(false);
    }
  }, [activeTag, debouncedSearch, page]);

  useEffect(() => {
    if (skipInitialLoad.current) {
      skipInitialLoad.current = false;
      return;
    }
    load();
  }, [load]);

  function toggleTag(tag: GrantTag) {
    setActiveTag((t) => (t === tag ? null : tag));
  }

  const timeSince = lastScrapedAt
    ? (() => {
      const mins = Math.floor((Date.now() - new Date(lastScrapedAt).getTime()) / 60000);
      if (mins < 60) return `${mins}m ago`;
      const hrs = Math.floor(mins / 60);
      if (hrs < 24) return `${hrs}h ago`;
      return `${Math.floor(hrs / 24)}d ago`;
    })()
    : null;

  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 py-10">
      <div className="mb-8">
        <p className="font-mono text-xs tracking-widest uppercase text-warn mb-2">Live listings</p>
        <h1 className="h1">Startup Grants</h1>
        <p className="text-ink-soft text-base max-w-2xl leading-relaxed">
          Grants and funding opportunities for startups working in technology, inclusion, innovation,
          talent development, and African markets, refreshed automatically every 8 hours.
        </p>
        {timeSince && (
          <p className="text-xs text-slate mt-2 font-mono">Last refreshed {timeSince}</p>
        )}
      </div>

      {/* Search */}
      <div className="relative mb-5">
        <svg
          className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate"
          width="16"
          height="16"
          viewBox="0 0 16 16"
          fill="none"
        >
          <circle cx="6.5" cy="6.5" r="4.5" stroke="currentColor" strokeWidth="1.5" />
          <path d="M10 10l3 3" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
        </svg>
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search grants by keyword..."
          className="w-full pl-10 pr-4 py-3 border border-rule rounded-xl bg-white text-sm text-ink placeholder:text-slate focus:outline-none focus:ring-2 focus:ring-forest/30 transition"
        />
      </div>

      {/* Tag filters */}
      <div className="flex flex-wrap gap-2 mb-7">
        {ALL_TAGS.map((tag) => (
          <TagChip
            key={tag}
            tag={tag}
            active={activeTag === tag}
            onClick={() => toggleTag(tag)}
          />
        ))}
        {activeTag && (
          <button
            onClick={() => setActiveTag(null)}
            className="btn-ghost btn-sm"
          >
            Clear ×
          </button>
        )}
      </div>

      {/* Results count */}
      {!loading && !error && (
        <p className="text-xs text-slate font-mono mb-4">
          {total === 0 ? "No grants found" : `${total} open grant${total !== 1 ? "s" : ""}`}
          {activeTag ? ` tagged "${TAG_LABELS[activeTag]}"` : ""}
          {debouncedSearch ? ` matching "${debouncedSearch}"` : ""}
        </p>
      )}

      {/* Error */}
      {error && (
        <div className="case-card p-6 text-center">
          <Alert variant="danger" className="mb-3">{error}</Alert>
          <button onClick={load} className="btn-primary text-sm">
            Try again
          </button>
        </div>
      )}

      {/* Grid */}
      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {Array.from({ length: 9 }).map((_, i) => (
            <SkeletonCard key={i} />
          ))}
        </div>
      ) : !error && grants.length === 0 ? (
        <div className="case-card p-10 text-center">
          <p className="font-display text-xl text-ink mb-2">No grants found</p>
          <p className="text-ink-soft text-sm">
            {activeTag || debouncedSearch
              ? "Try removing filters or searching with different keywords."
              : "Grant listings are updated automatically every 8 hours. Check back soon."}
          </p>
          {(activeTag || debouncedSearch) && (
            <button
              onClick={() => { setActiveTag(null); setSearch(""); }}
              className="btn-primary text-sm mt-4"
            >
              Clear filters
            </button>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {grants.map((g) => (
            <GrantCard key={g._id} grant={g} />
          ))}
        </div>
      )}

      {/* Pagination */}
      {pages > 1 && !loading && !error && (
        <nav aria-label="Pagination" className="flex items-center justify-center gap-3 mt-8">
          <PagerLink basePath="/grants" target={page - 1} current={page} disabled={page <= 1} onGo={setPage} className="btn-secondary btn-sm" rel="prev">
            ← Previous
          </PagerLink>
          <span className="text-sm text-slate">
            Page {page} of {pages}
          </span>
          <PagerLink basePath="/grants" target={page + 1} current={page} disabled={page >= pages} onGo={setPage} className="btn-secondary btn-sm" rel="next">
            Next →
          </PagerLink>
        </nav>
      )}

      {grants.length > 0 && !loading && (
        <p className="text-xs text-slate/60 text-center mt-10 font-mono">
          Aggregated from OpportunityDesk, FundsForNGOs, OpportunitiesForAfricans, Youthop.
          ScolarNav does not endorse or verify individual listings.
        </p>
      )}
    </div>
  );
}
