"use client";

import Link from "next/link";

/**
 * Pagination control rendered as a real link (crawlable, middle-click friendly) that still
 * navigates client-side on a plain click. Disabled/current states render a non-link element.
 */
export default function PagerLink({
  basePath, target, current, disabled, onGo, className, rel, label, children,
}: {
  basePath: string;
  target: number;
  current: number;
  disabled: boolean;
  onGo: (p: number) => void;
  className: string;
  rel?: string;
  label?: string;
  children: React.ReactNode;
}) {
  const href = target <= 1 ? basePath : `${basePath}?page=${target}`;
  if (disabled || target === current) {
    return (
      <span
        aria-disabled={disabled || undefined}
        aria-current={target === current && !rel ? "page" : undefined}
        className={`${className} ${disabled && target !== current ? "opacity-30" : ""}`}
      >
        {children}
      </span>
    );
  }
  return (
    <Link
      href={href}
      rel={rel}
      aria-label={label}
      className={className}
      onClick={(e) => {
        if (e.metaKey || e.ctrlKey || e.shiftKey || e.button !== 0) return;
        e.preventDefault();
        onGo(target);
      }}
    >
      {children}
    </Link>
  );
}
