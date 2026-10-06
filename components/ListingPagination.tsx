import Link from "next/link";

/** Crawlable pagination: real links, canonical-friendly (?page=N only). */
export default function ListingPagination({ basePath, page, pages, firstHref }: { basePath: string; page: number; pages: number; firstHref?: string }) {
  if (pages <= 1) return null;
  const href = (p: number) => (p === 1 ? (firstHref ?? basePath) : `${basePath}?page=${p}`);
  const nums = Array.from({ length: pages }, (_, i) => i + 1).filter((p) => p === 1 || p === pages || Math.abs(p - page) <= 2);
  return (
    <nav aria-label="Pagination" className="mt-10 flex flex-wrap items-center justify-center gap-2">
      {page > 1 && (
        <Link href={href(page - 1)} rel="prev" className="btn-secondary btn-sm">Previous</Link>
      )}
      {nums.map((p, i) => (
        <span key={p} className="contents">
          {i > 0 && p - nums[i - 1] > 1 && <span className="px-1 text-sm text-slate" aria-hidden="true">…</span>}
          <Link
            href={href(p)}
            aria-current={p === page ? "page" : undefined}
            aria-label={`Page ${p}`}
            className={`inline-flex h-11 w-11 items-center justify-center rounded-md text-sm font-semibold transition-colors ${
              p === page ? "bg-forest text-white" : "bg-white text-ink-soft ring-1 ring-inset ring-control hover:bg-surface-2"
            }`}
          >
            {p}
          </Link>
        </span>
      ))}
      {page < pages && (
        <Link href={href(page + 1)} rel="next" className="btn-secondary btn-sm">Next</Link>
      )}
    </nav>
  );
}
