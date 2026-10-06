/**
 * Loading placeholders. They match the layout of the content they stand in for, so the page does not jump
 * when data arrives. All of them pulse softly (opacity only) and honour reduced motion.
 */

export function Skeleton({ className = "" }: { className?: string }) {
  return <div aria-hidden="true" className={`skeleton ${className}`} />;
}

export function SkeletonText({ lines = 3, className = "" }: { lines?: number; className?: string }) {
  return (
    <div aria-hidden="true" className={`space-y-2.5 ${className}`}>
      {Array.from({ length: lines }, (_, i) => (
        <div key={i} className={`skeleton h-4 ${i === lines - 1 && lines > 1 ? "w-2/3" : "w-full"}`} />
      ))}
    </div>
  );
}

export function SkeletonHeader({ withAction = false }: { withAction?: boolean }) {
  return (
    <div aria-hidden="true" className="mb-8 flex items-end justify-between gap-4 sm:mb-10">
      <div className="w-full max-w-md space-y-3">
        <div className="skeleton h-3 w-24" />
        <div className="skeleton h-9 w-3/4" />
        <div className="skeleton h-4 w-full" />
      </div>
      {withAction && <div className="skeleton hidden h-11 w-32 sm:block" />}
    </div>
  );
}

export function SkeletonCard({ className = "" }: { className?: string }) {
  return (
    <div aria-hidden="true" className={`card card-pad ${className}`}>
      <div className="flex items-center justify-between">
        <div className="skeleton h-3 w-28" />
        <div className="skeleton h-5 w-16 rounded-full" />
      </div>
      <div className="skeleton mt-4 h-6 w-4/5" />
      <div className="skeleton mt-2 h-4 w-1/2" />
      <div className="skeleton mt-8 h-4 w-1/3" />
    </div>
  );
}

export function SkeletonGrid({ count = 6 }: { count?: number }) {
  return (
    <div className="card-grid" role="status" aria-label="Loading">
      {Array.from({ length: count }, (_, i) => (
        <SkeletonCard key={i} />
      ))}
    </div>
  );
}

export function SkeletonList({ rows = 4 }: { rows?: number }) {
  return (
    <div className="space-y-3" role="status" aria-label="Loading">
      {Array.from({ length: rows }, (_, i) => (
        <div key={i} aria-hidden="true" className="card card-pad flex items-center gap-4">
          <div className="skeleton h-11 w-11 shrink-0 rounded-full" />
          <div className="min-w-0 flex-1 space-y-2.5">
            <div className="skeleton h-4 w-2/3" />
            <div className="skeleton h-3 w-1/3" />
          </div>
          <div className="skeleton hidden h-8 w-20 sm:block" />
        </div>
      ))}
    </div>
  );
}

export function SkeletonTable({ rows = 6, cols = 4 }: { rows?: number; cols?: number }) {
  return (
    <div className="table-wrap" role="status" aria-label="Loading">
      <div aria-hidden="true" className="min-w-table">
        <div className="flex gap-4 bg-surface-2 px-4 py-3">
          {Array.from({ length: cols }, (_, i) => (
            <div key={i} className="skeleton h-3 flex-1" />
          ))}
        </div>
        {Array.from({ length: rows }, (_, r) => (
          <div key={r} className="flex gap-4 border-t border-rule px-4 py-4">
            {Array.from({ length: cols }, (_, c) => (
              <div key={c} className="skeleton h-4 flex-1" />
            ))}
          </div>
        ))}
      </div>
    </div>
  );
}

/** Whole-page placeholder: header, then a grid of cards. Used by route-level loading files. */
export function SkeletonPage({ variant = "grid" }: { variant?: "grid" | "list" | "detail" | "form" }) {
  return (
    <div className="page" role="status" aria-label="Loading page">
      <SkeletonHeader withAction />
      {variant === "grid" && <SkeletonGrid />}
      {variant === "list" && <SkeletonList />}
      {variant === "form" && (
        <div className="card card-pad max-w-xl space-y-5">
          {Array.from({ length: 4 }, (_, i) => (
            <div key={i} className="space-y-2">
              <div className="skeleton h-3 w-24" />
              <div className="skeleton h-11 w-full" />
            </div>
          ))}
          <div className="skeleton h-11 w-40" />
        </div>
      )}
      {variant === "detail" && (
        <div className="grid gap-10 lg:grid-cols-detail lg:gap-12">
          <div className="space-y-8">
            <SkeletonText lines={5} />
            <SkeletonText lines={4} />
          </div>
          <div className="card card-pad space-y-4">
            <div className="skeleton h-5 w-28" />
            <SkeletonText lines={4} />
            <div className="skeleton h-11 w-full" />
          </div>
        </div>
      )}
    </div>
  );
}
