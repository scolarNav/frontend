"use client";

import { useEffect } from "react";
import Link from "next/link";
import { ErrorState } from "@/components/ui/States";

/** Route-level error boundary: a plain explanation, a retry, and a way home. */
export default function Error({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <div className="page-narrow">
      <ErrorState
        title="This page hit a problem"
        message="We could not load this page. Try again, or go back to the home page."
        onRetry={reset}
        action={
          <Link href="/" className="btn-secondary">
            Back to home
          </Link>
        }
      />
    </div>
  );
}
