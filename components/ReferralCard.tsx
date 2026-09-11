"use client";

import { useEffect, useState } from "react";
import { api } from "@/lib/api";
import { ReferralStats } from "@/lib/types";

export default function ReferralCard() {
  const [data, setData] = useState<ReferralStats | null>(null);
  const [copied, setCopied] = useState<"code" | "link" | null>(null);

  useEffect(() => {
    api
      .get<ReferralStats>("/referral/me")
      .then(setData)
      .catch(() => {});
  }, []);

  function copy(value: string, type: "code" | "link") {
    navigator.clipboard.writeText(value).then(() => {
      setCopied(type);
      setTimeout(() => setCopied(null), 2000);
    });
  }

  if (!data) return null;

  const { referralCode, referralLink, stats } = data;

  return (
    <div className="case-card p-6">
      <div className="flex items-start justify-between gap-4 mb-4">
        <div>
          <p className="text-xs font-mono text-slate uppercase tracking-widest">Refer a friend</p>
          <p className="text-sm text-ink-soft mt-1 leading-snug">
            When a friend you invite subscribes, you both get a free month.
          </p>
        </div>
        {stats.freeMonthsEarned > 0 && (
          <div className="shrink-0 text-right">
            <p className="font-display text-2xl text-ink">{stats.freeMonthsEarned}</p>
            <p className="text-xs font-mono text-slate -mt-0.5">free month{stats.freeMonthsEarned !== 1 ? "s" : ""} earned</p>
          </div>
        )}
      </div>

      {/* Code + link copy */}
      <div className="space-y-2.5">
        <div className="flex items-center gap-2 border border-rule rounded-lg px-3 py-2.5 bg-surface">
          <span className="font-mono text-sm text-ink tracking-widest flex-1">{referralCode}</span>
          <button
            onClick={() => copy(referralCode, "code")}
            className="text-xs font-mono text-forest hover:underline shrink-0"
          >
            {copied === "code" ? "Copied!" : "Copy code"}
          </button>
        </div>
        <div className="flex items-center gap-2 border border-rule rounded-lg px-3 py-2.5 bg-surface">
          <span className="font-mono text-xs text-slate truncate flex-1">{referralLink}</span>
          <button
            onClick={() => copy(referralLink, "link")}
            className="text-xs font-mono text-forest hover:underline shrink-0"
          >
            {copied === "link" ? "Copied!" : "Copy link"}
          </button>
        </div>
      </div>

      {/* Stats row */}
      {stats.total > 0 && (
        <div className="mt-4 flex gap-5 pt-4 border-t border-rule">
          <div>
            <p className="font-display text-xl text-ink">{stats.total}</p>
            <p className="text-xs font-mono text-slate">invited</p>
          </div>
          <div>
            <p className="font-display text-xl text-ink">{stats.rewarded}</p>
            <p className="text-xs font-mono text-slate">subscribed</p>
          </div>
          {stats.pending > 0 && (
            <div>
              <p className="font-display text-xl text-ink">{stats.pending}</p>
              <p className="text-xs font-mono text-slate">pending</p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
