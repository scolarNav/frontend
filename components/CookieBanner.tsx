"use client";

import { useEffect, useState } from "react";
import Link from "next/link";

const STORAGE_KEY = "scholarnav_cookie_consent";

type ConsentValue = "all" | "essential";

export default function CookieBanner() {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    try {
      if (!localStorage.getItem(STORAGE_KEY)) setVisible(true);
    } catch {
      setVisible(true);
    }
  }, []);

  function accept(level: ConsentValue) {
    try {
      localStorage.setItem(STORAGE_KEY, level);
    } catch {
      /* storage blocked: the choice just applies to this visit */
    }
    setVisible(false);
  }

  if (!visible) return null;

  return (
    <div className="fixed inset-x-0 bottom-0 z-40 px-4 pb-4 sm:px-6 sm:pb-6" role="region" aria-label="Cookie consent">
      <div className="mx-auto flex max-w-3xl animate-rise-in flex-col gap-4 rounded-xl bg-white p-5 shadow-raised sm:flex-row sm:items-center">
        <div className="min-w-0 flex-1">
          <p className="text-sm font-semibold text-ink">We use cookies</p>
          <p className="mt-1 text-sm leading-relaxed text-ink-soft">
            Essential cookies keep you signed in and make the site work. With your consent we also use optional cookies to improve your experience. See our{" "}
            <Link href="/privacy" className="font-semibold text-forest hover:underline">
              Privacy Policy
            </Link>
            .
          </p>
        </div>

        <div className="flex shrink-0 gap-2">
          <button type="button" onClick={() => accept("essential")} className="btn-secondary btn-sm min-h-touch">
            Essential only
          </button>
          <button type="button" onClick={() => accept("all")} className="btn-primary btn-sm min-h-touch">
            Accept all
          </button>
        </div>
      </div>
    </div>
  );
}
