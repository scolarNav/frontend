import Link from "next/link";

/** Crawlable pagination: real links, canonical-friendly (?page=N only). */
export default function ListingPagination({ basePath, page, pages }: { basePath: string; page: number; pages: number }) {
  if (pages <= 1) return null;
  const href = (p: number) => (p === 1 ? basePath : `${basePath}?page=${p}`);
  const nums = Array.from({ length: pages }, (_, i) => i + 1).filter((p) => p === 1 || p === pages || Math.abs(p - page) <= 2);
  return (
    <nav aria-label="Pagination" className="mt-10 flex flex-wrap items-center justify-center gap-2">
      {page > 1 && (
        <Link href={href(page - 1)} rel="prev" className="btn-secondary text-sm px-4 py-2">← Prev</Link>
      )}
      {nums.map((p, i) => (
        <span key={p} className="contents">
          {i > 0 && p - nums[i - 1] > 1 && <span className="text-slate font-mono text-sm px-1">…</span>}
          <Link
            href={href(p)}
            aria-current={p === page ? "page" : undefined}
            aria-label={`Page ${p}`}
            className={`w-9 h-9 inline-flex items-center justify-center text-sm font-mono rounded-md transition-colors ${
              p === page ? "bg-forest text-white" : "border border-rule text-ink-soft hover:border-forest hover:text-forest"
            }`}
          >
            {p}
          </Link>
        </span>
      ))}
      {page < pages && (
        <Link href={href(page + 1)} rel="next" className="btn-secondary text-sm px-4 py-2">Next →</Link>
      )}
    </nav>
  );
}
