"use client";

import { useState } from "react";
import { ExternalLink } from "lucide-react";
import { api } from "@/lib/api";
import type { Partner } from "@/lib/types";

const KIND_LABEL: Record<Partner["kind"], string> = {
  prep_centre: "Prep centre",
  test_body: "Test provider",
  online_course: "Online course",
  other: "Partner",
};

/**
 * Prep centres and test providers for a language test the student still needs.
 * The click is logged through the API so the visit can be credited, then the partner opens in a new tab.
 */
export default function PartnerList({ partners, heading = "Prepare with a partner" }: { partners: Partner[]; heading?: string }) {
  const [opening, setOpening] = useState<string | null>(null);
  const [failed, setFailed] = useState<string | null>(null);

  if (partners.length === 0) return null;

  async function open(p: Partner) {
    setOpening(p._id);
    setFailed(null);
    // Open the tab inside the click so the browser does not treat it as a blocked popup.
    const tab = window.open("about:blank", "_blank");
    try {
      const params = new URL(p.goPath, "http://x").searchParams;
      const { url } = await api.post<{ url: string }>(`/partners/${p._id}/click`, {
        test: params.get("test") ?? undefined,
        src: params.get("src") ?? undefined,
        opp: params.get("opp") ?? undefined,
      });
      if (tab) tab.location.href = url;
      else window.location.href = url;
    } catch {
      tab?.close();
      setFailed(p._id);
    } finally {
      setOpening(null);
    }
  }

  return (
    <section aria-labelledby="partners-heading">
      <h3 id="partners-heading" className="h3">{heading}</h3>
      <ul className="mt-3 space-y-3">
        {partners.map((p) => (
          <li key={p._id} className="rounded-lg bg-surface p-4">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div className="min-w-0">
                <p className="font-semibold text-ink">{p.name}</p>
                <p className="mt-0.5 text-sm text-slate">
                  {KIND_LABEL[p.kind]}
                  {p.tests.length > 0 && ` · ${p.tests.map((t) => t.toUpperCase()).join(", ")}`}
                  {p.deliveryModes.length > 0 && ` · ${p.deliveryModes.map((m) => (m === "online" ? "Online" : "In person")).join(" and ")}`}
                </p>
              </div>
              <button
                type="button"
                onClick={() => open(p)}
                disabled={opening === p._id}
                aria-busy={opening === p._id}
                className="btn-secondary shrink-0"
              >
                {opening === p._id ? "Opening" : "Visit site"}
                <ExternalLink size={14} className="ml-1.5" aria-hidden="true" />
              </button>
            </div>
            {p.description && <p className="mt-2 text-sm leading-relaxed text-ink-soft">{p.description}</p>}
            {(p.priceNote || p.discountCode) && (
              <p className="mt-2 text-sm text-ink-soft">
                {p.priceNote}
                {p.priceNote && p.discountCode ? " · " : ""}
                {p.discountCode && (
                  <span>
                    Code <span className="font-semibold text-ink">{p.discountCode}</span>
                    {p.discountNote ? ` (${p.discountNote})` : ""}
                  </span>
                )}
              </p>
            )}
            {p.sponsored && <p className="mt-2 text-xs text-slate">Partner link. ScolarNav may earn a commission at no cost to you.</p>}
            {failed === p._id && <p role="alert" className="mt-2 text-sm text-danger">Could not open this partner. Please try again.</p>}
          </li>
        ))}
      </ul>
    </section>
  );
}
