"use client";

import { Fragment, useCallback, useEffect, useState } from "react";
import { ChevronDown } from "lucide-react";
import { api, ApiError } from "@/lib/api";
import { Skeleton } from "@/components/ui/Skeleton";
import { EmptyState, ErrorState } from "@/components/ui/States";

interface Sums {
  calls: number;
  inputTokens: number;
  outputTokens: number;
  costUSD: number;
}
interface Summary {
  days: number;
  totals: Sums & { cacheReadTokens: number; cacheWriteTokens: number; activeUsers: number };
  byFeature: (Sums & { _id: string })[];
  byModel: (Sums & { _id: string })[];
  byDay: (Sums & { _id: string })[];
  byPlan: Record<string, { users: number; calls: number; costUSD: number }>;
  topUsers: UserRow[];
}
interface UserRow extends Sums {
  _id: string;
  name?: string;
  email?: string;
  plan: string;
  totalTokens?: number;
  lastCallAt?: string;
}
interface UserList {
  users: UserRow[];
  total: number;
  page: number;
  pages: number;
}
interface SessionData {
  user: { name?: string; email?: string; plan: string };
  totals: Sums & { sessions: number };
  sessions: (Sums & {
    start: string;
    end: string;
    features: { feature: string; calls: number; tokens: number; costUSD: number }[];
  })[];
}

const FEATURE_LABELS: Record<string, string> = {
  cv_parse: "CV parsing",
  opportunity_breakdown: "Scholarship breakdown",
  opportunity_enrichment: "Application structure",
  recommendations: "For You matching",
  coaching: "Coaching",
  essay_review: "Essay review",
  reference_letter_review: "Reference letter review",
  referee_briefing: "Referee briefing",
  document_review: "Document review",
  document_suggestion: "Document suggestions",
  readiness: "Readiness score",
  roadmap: "Roadmap",
  mentor_chat: "Mentor chat",
  interview_questions: "Interview questions",
  interview_answer_eval: "Interview answer feedback",
  scraper_date_extract: "Scraper: date extraction",
  scraper_blog_classify: "Scraper: blog filter",
  other: "Other",
};
const label = (f: string) => FEATURE_LABELS[f] ?? f;

const num = (n: number) => Math.round(n).toLocaleString();
const usd = (n: number) => `$${n < 1 ? n.toFixed(4) : n.toFixed(2)}`;
const PERIODS = [7, 30, 90];

function Tile({ title, value, note }: { title: string; value: string; note?: string }) {
  return (
    <div className="case-card p-5">
      <p className="text-sm text-slate">{title}</p>
      <p className="mt-1 font-display text-3xl text-ink">{value}</p>
      {note && <p className="mt-1 text-sm text-slate">{note}</p>}
    </div>
  );
}

function PanelSkeleton() {
  return (
    <div aria-hidden="true" className="mt-8 space-y-6">
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
        {Array.from({ length: 4 }, (_, i) => (
          <Skeleton key={i} className="h-24" />
        ))}
      </div>
      <Skeleton className="h-64" />
      <Skeleton className="h-48" />
    </div>
  );
}

function SessionList({ userId, days }: { userId: string; days: number }) {
  const [data, setData] = useState<SessionData | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let live = true;
    api
      .get<SessionData>(`/admin/ai-usage/users/${userId}/sessions?days=${Math.max(days, 30)}`)
      .then((d) => live && setData(d))
      .catch((e) => live && setError(e instanceof ApiError ? e.message : "Could not load sessions."));
    return () => {
      live = false;
    };
  }, [userId, days]);

  if (error) return <p className="px-4 py-3 text-sm text-danger">{error}</p>;
  if (!data) return <Skeleton className="m-4 h-20" />;
  if (data.sessions.length === 0) return <p className="px-4 py-3 text-sm text-slate">No sessions in this period.</p>;

  return (
    <div className="px-4 py-4">
      <p className="mb-3 text-sm text-slate">
        {data.totals.sessions} session{data.totals.sessions === 1 ? "" : "s"} in the last {Math.max(days, 30)} days. A session is a run of AI calls with no gap longer than 30 minutes.
      </p>
      <ul className="space-y-3">
        {data.sessions.map((s) => {
          const mins = Math.max(1, Math.round((new Date(s.end).getTime() - new Date(s.start).getTime()) / 60000));
          return (
            <li key={s.start} className="rounded-md bg-white p-3">
              <div className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1">
                <p className="text-sm font-semibold text-ink">{new Date(s.start).toLocaleString()}</p>
                <p className="text-sm text-slate">
                  {mins} min · {s.calls} call{s.calls === 1 ? "" : "s"} · {num(s.inputTokens)} in · {num(s.outputTokens)} out ·{" "}
                  <span className="font-semibold text-ink">{usd(s.costUSD)}</span>
                </p>
              </div>
              <div className="mt-2 flex flex-wrap gap-2">
                {s.features.map((f) => (
                  <span key={f.feature} className="badge">
                    {label(f.feature)} ×{f.calls} · {num(f.tokens)} tokens · {usd(f.costUSD)}
                  </span>
                ))}
              </div>
            </li>
          );
        })}
      </ul>
    </div>
  );
}

export default function AiUsagePanel() {
  const [days, setDays] = useState(30);
  const [summary, setSummary] = useState<Summary | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [dailyAsTable, setDailyAsTable] = useState(false);

  const [users, setUsers] = useState<UserList | null>(null);
  const [usersLoading, setUsersLoading] = useState(false);
  const [page, setPage] = useState(1);
  const [sort, setSort] = useState<"cost" | "tokens" | "calls">("cost");
  const [q, setQ] = useState("");
  const [query, setQuery] = useState("");
  const [open, setOpen] = useState<string | null>(null);

  const loadSummary = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      setSummary(await api.get<Summary>(`/admin/ai-usage/summary?days=${days}`));
    } catch (e) {
      setError(e instanceof ApiError ? e.message : "Could not load AI usage.");
    } finally {
      setLoading(false);
    }
  }, [days]);

  const loadUsers = useCallback(async () => {
    setUsersLoading(true);
    try {
      const params = new URLSearchParams({ days: String(days), page: String(page), sort });
      if (query) params.set("q", query);
      setUsers(await api.get<UserList>(`/admin/ai-usage/users?${params.toString()}`));
    } catch {
      setUsers(null);
    } finally {
      setUsersLoading(false);
    }
  }, [days, page, sort, query]);

  useEffect(() => {
    loadSummary();
  }, [loadSummary]);
  useEffect(() => {
    loadUsers();
  }, [loadUsers]);

  if (loading && !summary) return <PanelSkeleton />;
  if (error && !summary) return <div className="mt-8"><ErrorState title="AI usage did not load" message={error} onRetry={loadSummary} /></div>;
  if (!summary) return null;

  const t = summary.totals;
  const empty = t.calls === 0;
  const maxFeatureCost = Math.max(...summary.byFeature.map((f) => f.costUSD), 0.000001);
  const maxDay = Math.max(...summary.byDay.map((d) => d.costUSD), 0.000001);
  const cacheShare = t.inputTokens + t.cacheReadTokens > 0 ? (t.cacheReadTokens / (t.inputTokens + t.cacheReadTokens + t.cacheWriteTokens)) * 100 : 0;

  return (
    <div className="mt-8 space-y-8">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="max-w-xl text-sm text-slate">
          Token counts come from the usage figures Anthropic returns on each call. Cost uses the list price for the model that handled the call.
        </p>
        <div role="group" aria-label="Period" className="flex gap-2">
          {PERIODS.map((p) => (
            <button
              key={p}
              type="button"
              aria-pressed={days === p}
              onClick={() => {
                setDays(p);
                setPage(1);
                setOpen(null);
              }}
              className={`min-h-touch rounded-md px-4 text-sm font-semibold transition-colors duration-150 ${
                days === p ? "bg-navy text-white" : "bg-white text-ink-soft hover:bg-surface-2"
              }`}
            >
              {p} days
            </button>
          ))}
        </div>
      </div>

      {empty ? (
        <EmptyState
          title="No AI calls recorded yet"
          description="Usage is recorded from the moment this version of the server goes live. Use a feature once and it will appear here."
        />
      ) : (
        <>
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
            <Tile title={`Spend, last ${summary.days} days`} value={usd(t.costUSD)} note={`${usd(t.costUSD / Math.max(t.calls, 1))} per call`} />
            <Tile title="AI calls" value={num(t.calls)} />
            <Tile title="Input tokens" value={num(t.inputTokens)} note={`${num(t.cacheReadTokens)} served from cache`} />
            <Tile title="Output tokens" value={num(t.outputTokens)} note={`${usd(t.costUSD / Math.max(t.activeUsers, 1))} per active user`} />
          </div>
          {cacheShare > 0 && (
            <p className="text-sm text-slate">Cache reads are {cacheShare.toFixed(0)}% of all input tokens in this period.</p>
          )}

          <section aria-labelledby="ai-by-feature">
            <h2 id="ai-by-feature" className="h3 mb-3">Cost by feature</h2>
            <div className="case-card overflow-x-auto">
              <table className="w-full min-w-table text-left text-sm">
                <thead>
                  <tr className="border-b border-rule text-slate">
                    <th scope="col" className="px-4 py-3 font-semibold">Feature</th>
                    <th scope="col" className="px-4 py-3 text-right font-semibold">Calls</th>
                    <th scope="col" className="px-4 py-3 text-right font-semibold">Avg input</th>
                    <th scope="col" className="px-4 py-3 text-right font-semibold">Avg output</th>
                    <th scope="col" className="px-4 py-3 text-right font-semibold">Avg cost</th>
                    <th scope="col" className="px-4 py-3 font-semibold">Total cost</th>
                  </tr>
                </thead>
                <tbody>
                  {summary.byFeature.map((f) => (
                    <tr key={f._id} className="border-b border-rule last:border-0">
                      <th scope="row" className="px-4 py-3 font-medium text-ink">{label(f._id)}</th>
                      <td className="px-4 py-3 text-right">{num(f.calls)}</td>
                      <td className="px-4 py-3 text-right">{num(f.inputTokens / f.calls)}</td>
                      <td className="px-4 py-3 text-right">{num(f.outputTokens / f.calls)}</td>
                      <td className="px-4 py-3 text-right">{usd(f.costUSD / f.calls)}</td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-3">
                          <div className="h-2 w-24 shrink-0 overflow-hidden rounded-full bg-surface-2" aria-hidden="true">
                            <div className="h-full rounded-full bg-navy-raised" style={{ width: `${(f.costUSD / maxFeatureCost) * 100}%` }} />
                          </div>
                          <span className="font-semibold text-ink">{usd(f.costUSD)}</span>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>

          <section aria-labelledby="ai-by-day">
            <div className="mb-3 flex items-center justify-between gap-3">
              <h2 id="ai-by-day" className="h3">Daily spend</h2>
              <button type="button" onClick={() => setDailyAsTable((v) => !v)} className="min-h-touch text-sm font-semibold text-forest underline">
                {dailyAsTable ? "Show chart" : "Show table"}
              </button>
            </div>
            <div className="case-card p-5">
              {dailyAsTable ? (
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-sm">
                    <thead>
                      <tr className="text-slate">
                        <th scope="col" className="py-2 pr-4 font-semibold">Day</th>
                        <th scope="col" className="py-2 pr-4 text-right font-semibold">Calls</th>
                        <th scope="col" className="py-2 pr-4 text-right font-semibold">Tokens</th>
                        <th scope="col" className="py-2 text-right font-semibold">Cost</th>
                      </tr>
                    </thead>
                    <tbody>
                      {[...summary.byDay].reverse().map((d) => (
                        <tr key={d._id} className="border-t border-rule">
                          <th scope="row" className="py-2 pr-4 font-medium text-ink">{d._id}</th>
                          <td className="py-2 pr-4 text-right">{num(d.calls)}</td>
                          <td className="py-2 pr-4 text-right">{num(d.inputTokens + d.outputTokens)}</td>
                          <td className="py-2 text-right">{usd(d.costUSD)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : (
                <div className="flex h-32 items-end gap-1" role="img" aria-label={`Daily spend for the last ${summary.days} days. Highest day ${usd(maxDay)}.`}>
                  {summary.byDay.map((d) => (
                    <div
                      key={d._id}
                      className="min-w-0 flex-1 rounded-t-sm bg-navy-raised"
                      style={{ height: `${Math.max(3, (d.costUSD / maxDay) * 100)}%` }}
                      title={`${d._id}: ${usd(d.costUSD)}, ${num(d.calls)} calls, ${num(d.inputTokens + d.outputTokens)} tokens`}
                    />
                  ))}
                </div>
              )}
            </div>
          </section>

          <section aria-labelledby="ai-by-plan" className="grid gap-4 sm:grid-cols-2">
            <div>
              <h2 id="ai-by-plan" className="h3 mb-3">Spend by plan</h2>
              <div className="case-card divide-y divide-rule">
                {Object.entries(summary.byPlan).map(([plan, v]) => (
                  <div key={plan} className="flex items-center justify-between gap-3 px-4 py-3 text-sm">
                    <span className="font-medium capitalize text-ink">{plan}</span>
                    <span className="text-slate">
                      {v.users} user{v.users === 1 ? "" : "s"} · {num(v.calls)} calls ·{" "}
                      <span className="font-semibold text-ink">{usd(v.costUSD)}</span> ({usd(v.costUSD / Math.max(v.users, 1))} each)
                    </span>
                  </div>
                ))}
                {Object.keys(summary.byPlan).length === 0 && <p className="px-4 py-3 text-sm text-slate">No signed-in usage yet.</p>}
              </div>
            </div>
            <div>
              <h2 className="h3 mb-3">Spend by model</h2>
              <div className="case-card divide-y divide-rule">
                {summary.byModel.map((m) => (
                  <div key={m._id} className="flex items-center justify-between gap-3 px-4 py-3 text-sm">
                    <span className="min-w-0 truncate font-medium text-ink">{m._id}</span>
                    <span className="shrink-0 text-slate">
                      {num(m.calls)} calls · <span className="font-semibold text-ink">{usd(m.costUSD)}</span>
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </section>
        </>
      )}

      <section aria-labelledby="ai-by-user">
        <h2 id="ai-by-user" className="h3 mb-3">Usage by user</h2>
        <form
          className="mb-3 flex flex-wrap items-end gap-3"
          onSubmit={(e) => {
            e.preventDefault();
            setPage(1);
            setQuery(q.trim());
          }}
        >
          <div className="min-w-0 flex-1 sm:max-w-xs">
            <label htmlFor="ai-user-search" className="mb-1 block text-sm font-medium text-ink">Search by name or email</label>
            <input id="ai-user-search" type="search" value={q} onChange={(e) => setQ(e.target.value)} className="input" />
          </div>
          <div>
            <label htmlFor="ai-user-sort" className="mb-1 block text-sm font-medium text-ink">Sort by</label>
            <select
              id="ai-user-sort"
              value={sort}
              onChange={(e) => {
                setSort(e.target.value as typeof sort);
                setPage(1);
              }}
              className="input"
            >
              <option value="cost">Cost</option>
              <option value="tokens">Tokens</option>
              <option value="calls">Calls</option>
            </select>
          </div>
          <button type="submit" className="btn-secondary">Search</button>
        </form>

        {usersLoading && !users ? (
          <Skeleton className="h-40" />
        ) : !users || users.users.length === 0 ? (
          <p className="case-card p-5 text-sm text-slate">{query ? "No users match that search." : "No per-user usage recorded in this period."}</p>
        ) : (
          <>
            <div className="case-card overflow-x-auto">
              <table className="w-full min-w-table text-left text-sm">
                <thead>
                  <tr className="border-b border-rule text-slate">
                    <th scope="col" className="px-4 py-3 font-semibold">User</th>
                    <th scope="col" className="px-4 py-3 font-semibold">Plan</th>
                    <th scope="col" className="px-4 py-3 text-right font-semibold">Calls</th>
                    <th scope="col" className="px-4 py-3 text-right font-semibold">Input</th>
                    <th scope="col" className="px-4 py-3 text-right font-semibold">Output</th>
                    <th scope="col" className="px-4 py-3 text-right font-semibold">Cost</th>
                    <th scope="col" className="px-4 py-3"><span className="sr-only">Sessions</span></th>
                  </tr>
                </thead>
                <tbody>
                  {users.users.map((u) => {
                    const isOpen = open === u._id;
                    return (
                      <Fragment key={u._id}>
                        <tr className="border-b border-rule">
                          <th scope="row" className="px-4 py-3 font-medium text-ink">
                            <span className="block max-w-56 truncate">{u.name || "Unknown user"}</span>
                            <span className="block max-w-56 truncate text-sm font-normal text-slate">{u.email}</span>
                          </th>
                          <td className="px-4 py-3 capitalize">{u.plan}</td>
                          <td className="px-4 py-3 text-right">{num(u.calls)}</td>
                          <td className="px-4 py-3 text-right">{num(u.inputTokens)}</td>
                          <td className="px-4 py-3 text-right">{num(u.outputTokens)}</td>
                          <td className="px-4 py-3 text-right font-semibold text-ink">{usd(u.costUSD)}</td>
                          <td className="px-2 py-1 text-right">
                            <button
                              type="button"
                              aria-expanded={isOpen}
                              aria-label={`${isOpen ? "Hide" : "Show"} sessions for ${u.name || u.email || "this user"}`}
                              onClick={() => setOpen(isOpen ? null : u._id)}
                              className="inline-flex h-11 w-11 items-center justify-center rounded-md text-slate transition-colors duration-150 hover:bg-surface-2"
                            >
                              <ChevronDown size={16} aria-hidden="true" className={`transition-transform duration-150 ${isOpen ? "rotate-180" : ""}`} />
                            </button>
                          </td>
                        </tr>
                        {isOpen && (
                          <tr className="border-b border-rule bg-surface">
                            <td colSpan={7} className="p-0">
                              <SessionList userId={u._id} days={days} />
                            </td>
                          </tr>
                        )}
                      </Fragment>
                    );
                  })}
                </tbody>
              </table>
            </div>
            {users.pages > 1 && (
              <div className="mt-3 flex items-center justify-between gap-3 text-sm text-slate">
                <span>Page {users.page} of {users.pages} · {users.total} users</span>
                <div className="flex gap-2">
                  <button type="button" disabled={page <= 1} onClick={() => setPage((p) => p - 1)} className="btn-secondary btn-sm">Previous</button>
                  <button type="button" disabled={page >= users.pages} onClick={() => setPage((p) => p + 1)} className="btn-secondary btn-sm">Next</button>
                </div>
              </div>
            )}
          </>
        )}
      </section>
    </div>
  );
}
