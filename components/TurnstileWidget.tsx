"use client";

import { useEffect, useRef } from "react";

declare global {
  interface Window {
    turnstile?: {
      render: (el: HTMLElement, opts: Record<string, unknown>) => string;
      remove: (id: string) => void;
    };
  }
}

const SITE_KEY = process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY;
const SCRIPT_SRC = "https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit";

/**
 * Cloudflare Turnstile human check. Renders nothing when NEXT_PUBLIC_TURNSTILE_SITE_KEY is not set,
 * so the forms keep working until the key is added. A token works once: change `resetKey` after a
 * failed submit to get a fresh one.
 */
export default function TurnstileWidget({
  onToken,
  resetKey = 0,
}: {
  onToken: (token: string | null) => void;
  resetKey?: number;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const onTokenRef = useRef(onToken);
  onTokenRef.current = onToken;

  useEffect(() => {
    if (!SITE_KEY || !ref.current) return;
    const el = ref.current;
    let widgetId: string | null = null;
    let cancelled = false;
    onTokenRef.current(null);

    function draw() {
      if (cancelled || !window.turnstile) return;
      widgetId = window.turnstile.render(el, {
        sitekey: SITE_KEY,
        theme: "light",
        callback: (t: string) => onTokenRef.current(t),
        "expired-callback": () => onTokenRef.current(null),
        "error-callback": () => onTokenRef.current(null),
      });
    }

    if (window.turnstile) {
      draw();
    } else {
      let script = document.querySelector<HTMLScriptElement>(`script[src="${SCRIPT_SRC}"]`);
      if (!script) {
        script = document.createElement("script");
        script.src = SCRIPT_SRC;
        script.async = true;
        document.head.appendChild(script);
      }
      script.addEventListener("load", draw);
    }

    return () => {
      cancelled = true;
      if (widgetId && window.turnstile) window.turnstile.remove(widgetId);
    };
  }, [resetKey]);

  if (!SITE_KEY) return null;
  return <div ref={ref} className="min-h-16" aria-label="Human check" />;
}

/** True when the check is switched on, so forms know to wait for a token before submitting. */
export const turnstileEnabled = !!SITE_KEY;
