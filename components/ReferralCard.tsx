"use client";

import { useEffect, useState } from "react";
import { Check, Copy } from "lucide-react";
import { api } from "@/lib/api";
import { ReferralStats } from "@/lib/types";
import { Skeleton } from "@/components/ui/Skeleton";

function CopyRow({ value, label, copied, onCopy }: { value: string; label: string; copied: boolean; onCopy: () => void }) {
  return (
    <div className="flex items-center gap-2 rounded-lg bg-surface px-3 py-1.5">
      <span className="min-w-0 flex-1 truncate text-sm text-ink">{value}</span>
      <button type="button" onClick={onCopy} className="btn-ghost btn-sm shrink-0 text-forest hover:text-forest-light">
        {copied ? <Check size={14} aria-hidden="true" /> : <Copy size={14} aria-hidden="true" />}
        {copied ? "Copied" : label}
      </button>
    </div>
  );
}

export default function ReferralCard() {
  const [data, setData] = useState<ReferralStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [copied, setCopied] = useState<"code" | "link" | null>(null);

  useEffect(() => {
    api
      .get<ReferralStats>("/referral/me")
      .then(setData)
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  function copy(value: string, type: "code" | "link") {
    navigator.clipboard.writeText(value).then(() => {
      setCopied(type);
      setTimeout(() => setCopied(null), 2000);
    });
  }

  if (loading) {
    return (
      <div className="card card-pad" role="status" aria-label="Loading referral details">
        <Skeleton className="mb-3 h-3 w-24" />
        <Skeleton className="mb-5 h-4 w-56" />
        <div className="space-y-2.5">
          <Skeleton className="h-11" />
          <Skeleton className="h-11" />
        </div>
      </div>
    );
  }

  if (!data) return null;

  const { referralCode, referralLink, stats } = data;

  return (
    <section className="card card-pad" aria-labelledby="referral-heading">
      <div className="mb-4 flex items-start justify-between gap-4">
        <div>
          <h2 id="referral-heading" className="h3">Refer a friend</h2>
          <p className="mt-1 text-sm text-slate">When a friend you invite subscribes, you both get a free month.</p>
        </div>
        {stats.freeMonthsEarned > 0 && (
          <div className="shrink-0 text-right">
            <p className="font-display text-2xl text-ink">{stats.freeMonthsEarned}</p>
            <p className="text-sm text-slate">free month{stats.freeMonthsEarned !== 1 ? "s" : ""} earned</p>
          </div>
        )}
      </div>

      <div className="space-y-2.5">
        <CopyRow value={referralCode} label="Copy code" copied={copied === "code"} onCopy={() => copy(referralCode, "code")} />
        <CopyRow value={referralLink} label="Copy link" copied={copied === "link"} onCopy={() => copy(referralLink, "link")} />
      </div>

      {stats.total > 0 && (
        <dl className="mt-4 flex gap-6 border-t border-rule pt-4">
          <div>
            <dd className="font-display text-xl text-ink">{stats.total}</dd>
            <dt className="text-sm text-slate">invited</dt>
          </div>
          <div>
            <dd className="font-display text-xl text-ink">{stats.rewarded}</dd>
            <dt className="text-sm text-slate">subscribed</dt>
          </div>
          {stats.pending > 0 && (
            <div>
              <dd className="font-display text-xl text-ink">{stats.pending}</dd>
              <dt className="text-sm text-slate">pending</dt>
            </div>
          )}
        </dl>
      )}
    </section>
  );
}
