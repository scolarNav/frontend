"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { api } from "@/lib/api";
import { useAuth } from "@/lib/auth-context";
import type { Opportunity } from "@/lib/types";
import { Skeleton } from "@/components/ui/Skeleton";

function daysUntil(iso?: string): number | null {
  if (!iso) return null;
  return Math.ceil((new Date(iso).getTime() - Date.now()) / 86400000);
}

/** Saved scholarships with a link to each one's dated roadmap. */
export default function SavedScholarshipPlans() {
  const { user } = useAuth();
  const [opps, setOpps] = useState<Opportunity[] | null>(null);

  useEffect(() => {
    if (!user) return;
    const saved = user.savedOpportunities.filter((s) => !["rejected", "withdrawn"].includes(s.status)).slice(0, 12);
    if (saved.length === 0) {
      setOpps([]);
      return;
    }
    Promise.all(
      saved.map((s) =>
        api.get<{ opportunity: Opportunity }>(`/opportunities/${s.opportunity}`, { auth: false }).then((r) => r.opportunity).catch(() => null)
      )
    ).then((rows) => setOpps(rows.filter((o): o is Opportunity => !!o && !(daysUntil(o.deadline) !== null && daysUntil(o.deadline)! < 0))));
  }, [user]);

  if (opps === null) return <Skeleton className="mb-10 h-32" />;

  return (
    <section className="mb-10" aria-labelledby="plans-heading">
      <h2 id="plans-heading" className="h3">Plans for your saved scholarships</h2>
      <p className="mt-1 max-w-prose text-sm text-slate">
        Each plan starts from today, skips what you have already done and flags what is behind.
      </p>
      {opps.length === 0 ? (
        <p className="mt-4 text-sm text-ink-soft">
          Save a scholarship to get a dated plan for it.{" "}
          <Link href="/" className="font-semibold text-forest hover:underline">Browse scholarships</Link>
        </p>
      ) : (
        <ul className="mt-4 space-y-2">
          {opps.map((o) => {
            const left = daysUntil(o.deadline);
            return (
              <li key={o._id}>
                <Link href={`/applications/${o._id}#roadmap`} className="card-interactive flex min-h-touch items-center justify-between gap-3 p-4">
                  <span className="min-w-0">
                    <span className="block truncate text-sm font-semibold text-ink">{o.title}</span>
                    <span className="mt-0.5 block text-sm text-slate">
                      {left === null ? "No deadline listed" : left === 0 ? "Closes today" : `${left} day${left === 1 ? "" : "s"} left`}
                    </span>
                  </span>
                  <span className="inline-flex shrink-0 items-center gap-1 text-sm font-semibold text-forest">
                    Open plan
                    <ArrowRight size={16} aria-hidden="true" />
                  </span>
                </Link>
              </li>
            );
          })}
        </ul>
      )}
    </section>
  );
}
