import type { Metadata } from "next";
import Link from "next/link";
import { notFound, permanentRedirect } from "next/navigation";
import Breadcrumbs from "@/components/Breadcrumbs";
import GrantBody from "@/components/GrantBody";
import { JsonLd, breadcrumbJsonLd, type Crumb } from "@/lib/jsonld";
import { fetchGrant, fetchGrantList, formatDate } from "@/lib/opportunities";
import { grantPath, parseGrantParam } from "@/lib/paths";
import { pageMetadata } from "@/lib/seo";
import { SHOW_GRANTS } from "@/lib/site";
import type { Grant, GrantTag } from "@/lib/types";

export const revalidate = 3600;

const TAG_META: Record<GrantTag, { label: string; color: string }> = {
  africa: { label: "Africa", color: "#92400e" },
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

async function loadGrant(param: string): Promise<Grant | null> {
  const id = parseGrantParam(param);
  return id ? fetchGrant(id) : null;
}

const shortDate = (iso: string) =>
  new Date(iso).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric", timeZone: "Africa/Lagos" });

export async function generateMetadata({ params }: { params: { id: string } }): Promise<Metadata> {
  const grant = SHOW_GRANTS ? await loadGrant(params.id) : null;
  if (!grant) return { title: "Grant not found", robots: { index: false, follow: false } };
  return pageMetadata({
    title: grant.title,
    // grant.description is scraped and usually already states the deadline, so no prefix is added.
    description: grant.description,
    path: grantPath(grant),
    type: "article",
  });
}

export default async function GrantDetailPage({ params }: { params: { id: string } }) {
  const grant = SHOW_GRANTS ? await loadGrant(params.id) : null;
  if (!grant) notFound();

  const path = grantPath(grant);
  if (decodeURIComponent(params.id) !== path.replace("/grants/", "")) permanentRedirect(path);

  const open = await fetchGrantList(1, 6).catch(() => null);
  const related = (open?.grants ?? []).filter((g) => g._id !== grant._id).slice(0, 5);

  const crumbs: Crumb[] = [
    { name: "Home", path: "/" },
    { name: "Startup Grants", path: "/grants" },
    { name: grant.title, path },
  ];

  const deadlineDate = grant.deadline ? new Date(grant.deadline) : null;
  const isPast = deadlineDate ? deadlineDate < new Date() : false;
  const daysLeft = deadlineDate ? Math.ceil((deadlineDate.getTime() - Date.now()) / 86400000) : null;

  return (
    <>
      <JsonLd data={breadcrumbJsonLd(crumbs)} />
      <div className="max-w-3xl mx-auto px-4 sm:px-6 py-12">
        <Breadcrumbs crumbs={crumbs} />

        {/* Header */}
        <div className="mb-6">
          <p className="font-mono text-xs tracking-widest uppercase text-brass mb-3">{grant.source}</p>
          <h1 className="font-display text-2xl sm:text-3xl text-ink leading-snug mb-2">{grant.title}</h1>
          <p className="text-slate text-sm">by {grant.provider}</p>
        </div>

        {/* Meta row */}
        <div className="flex flex-wrap items-center gap-x-6 gap-y-3 py-4 border-y border-rule mb-8">
          {grant.amount && (
            <div className="flex items-center gap-2">
              <span className="font-mono text-xs text-slate uppercase tracking-wide">Amount</span>
              <span className="font-mono text-sm text-slate border border-rule px-2.5 py-1">{grant.amount}</span>
            </div>
          )}

          {deadlineDate && (
            <div className="flex items-center gap-2">
              <span className="font-mono text-xs text-slate uppercase tracking-wide">Deadline</span>
              <span
                className="font-mono text-sm"
                style={{ color: isPast ? "#94a3b8" : daysLeft !== null && daysLeft <= 14 ? "#b8501f" : "#0F172A" }}
              >
                {isPast
                  ? `Closed · ${shortDate(grant.deadline!)}`
                  : daysLeft === 0
                    ? "Closes today"
                    : `${daysLeft} day${daysLeft === 1 ? "" : "s"} left · ${shortDate(grant.deadline!)}`}
              </span>
            </div>
          )}

          {!grant.isOpen && !deadlineDate && (
            <span className="font-mono text-xs text-slate bg-surface border border-rule px-2.5 py-1 rounded-full">Closed</span>
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
          <GrantBody grantId={grant._id} description={grant.description} />
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
            <svg width="12" height="12" viewBox="0 0 12 12" fill="none" aria-hidden="true">
              <path d="M2.5 9.5L9.5 2.5M9.5 2.5H5M9.5 2.5V7" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </a>
          <Link href="/grants" className="font-mono text-xs text-slate hover:text-ink transition-colors">
            ← Browse all grants
          </Link>
        </div>

        {(isPast || !grant.isOpen) && (
          <p role="status" className="case-card p-4 text-sm text-ink-soft mt-8">
            <strong className="text-ink">This grant is closed{grant.deadline ? ` (deadline ${formatDate(grant.deadline)})` : ""}.</strong>{" "}
            Funders often reopen calls each year. See grants that are open now below.
          </p>
        )}

        {related.length > 0 && (
          <aside aria-label="Open grants" className="mt-10">
            <h2 className="font-display text-xl text-ink border-b border-rule pb-2 mb-3">More open grants</h2>
            <ul className="space-y-2">
              {related.map((g) => (
                <li key={g._id}>
                  <Link href={grantPath(g)} className="text-sm text-forest hover:underline">{g.title}</Link>
                  <span className="text-xs text-slate"> — {g.provider}</span>
                </li>
              ))}
            </ul>
          </aside>
        )}

        {/* Footer note */}
        <p className="font-mono text-xs text-slate/50 mt-10 pt-6 border-t border-rule">
          Listed from {grant.source} · Added {formatDate(grant.scrapedAt)} · ScolarNav does not verify individual listings — always check the official source before applying.
        </p>
      </div>
    </>
  );
}
