import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Page not found",
  robots: { index: false, follow: false },
};

export default function NotFound() {
  return (
    <div className="mx-auto flex min-h-96 max-w-lg flex-col items-center justify-center px-4 py-20 text-center">
      <p className="eyebrow">Error 404</p>
      <h1 className="mt-3 font-display text-4xl text-ink sm:text-5xl">We could not find that page</h1>
      <p className="mt-4 text-ink-soft">
        It may have moved, been removed, or the link may be wrong. Try one of these instead.
      </p>
      <div className="mt-8 flex flex-wrap justify-center gap-3">
        <Link href="/" className="btn-primary">
          Browse opportunities
        </Link>
        <Link href="/countries" className="btn-secondary">
          Country guides
        </Link>
      </div>
    </div>
  );
}
