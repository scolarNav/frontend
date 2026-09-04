"use client";

import { useEffect, useState } from "react";
import Link from "next/link";

const STORAGE_KEY = "apexli_cookie_consent";

type ConsentValue = "all" | "essential";

export default function CookieBanner() {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (!stored) setVisible(true);
  }, []);

  function accept(level: ConsentValue) {
    localStorage.setItem(STORAGE_KEY, level);
    setVisible(false);
  }

  if (!visible) return null;

  return (
    <div
      className="fixed bottom-0 left-0 right-0 z-50 px-4 pb-4 sm:px-6 sm:pb-6"
      role="dialog"
      aria-label="Cookie consent"
      aria-live="polite"
    >
      <div className="max-w-3xl mx-auto case-card p-5 shadow-lg flex flex-col sm:flex-row gap-4 sm:items-center">
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium text-ink">We use cookies</p>
          <p className="text-xs text-ink-soft mt-1 leading-relaxed">
            We use essential cookies to keep you logged in and make the platform work.
            With your consent, we also use optional cookies to improve your experience.
            See our{" "}
            <Link href="/privacy" className="text-forest hover:underline">
              Privacy Policy
            </Link>{" "}
            for details.
          </p>
        </div>

        <div className="flex gap-2 shrink-0">
          <button
            onClick={() => accept("essential")}
            className="btn-secondary text-xs py-2 px-4 whitespace-nowrap"
          >
            Essential only
          </button>
          <button
            onClick={() => accept("all")}
            className="btn-primary text-xs py-2 px-4 whitespace-nowrap"
          >
            Accept all
          </button>
        </div>
      </div>
    </div>
  );
}
