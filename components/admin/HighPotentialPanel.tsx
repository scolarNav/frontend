"use client";

import { useCallback, useEffect, useState } from "react";
import { api, ApiError } from "@/lib/api";
import type { CredentialBreakdown, HighPotentialRow, SupportRecord, SupportStatus } from "@/lib/types";
import { Modal } from "@/components/ui/Modal";
import { Skeleton } from "@/components/ui/Skeleton";
import { Alert, EmptyState, ErrorState } from "@/components/ui/States";

interface ListResponse {
  minScore: number;
  page: number;
  pages: number;
  total: number;
  scanned: number;
  bands: { min: number; count: number }[];
  computedAt: string;
  users: HighPotentialRow[];
}

interface DetailResponse {
  user: { _id: string; name: string; email: string; country?: string; plan: string; readiness?: number };
  credential: CredentialBreakdown | null;
  matches: {
    opportunityId: string;
    title: string;
    provider: string;
    deadline: string | null;
    daysLeft: number | null;
    eligibility: "eligible" | "likely" | "at_risk" | "unknown";
    fitScore: number;
    hardGaps: string[];
    coachingTier?: string;
  }[];
  support: SupportRecord | null;
}

const STATUS_LABEL: Record<SupportStatus, string> = {
  identified: "Identified",
  contacted: "Contacted",
  supporting: "Supporting",
  placed: "Won or placed",
  declined: "Declined help",
};
const STATUS_BADGE: Record<SupportStatus, string> = {
  identified: "badge-info",
  contacted: "badge-warn",
  supporting: "badge-brand",
  placed: "badge-ok",
  declined: "",
};
const ELIGIBILITY_BADGE = { eligible: "badge-ok", likely: "badge-info", at_risk: "badge-danger", unknown: "badge-warn" } as const;
const ELIGIBILITY_LABEL = { eligible: "Eligible", likely: "Likely", at_risk: "At risk", unknown: "Unknown" } as const;
const MIN_SCORES = [60, 70, 80, 90];

function Meter({ label, value, max }: { label: string; value: number; max: number }) {
  return (
    <div>
      <div className="flex justify-between text-sm">
        <span className="text-ink-soft">{label}</span>
        <span className="font-semibold tabular-nums text-ink">{value} / {max}</span>
      </div>
      <div className="mt-1 h-2 overflow-hidden rounded-full bg-surface-2" role="presentation">
        <div className="h-full rounded-full bg-forest" style={{ width: `${Math.min(100, (value / max) * 100)}%` }} />
      </div>
    </div>
  );
}

function DetailDialog({ userId, onClose, onChanged }: { userId: string; onClose: () => void; onChanged: () => void }) {
  const [data, setData] = useState<DetailResponse | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [status, setStatus] = useState<SupportStatus>("identified");
  const [note, setNote] = useState("");
  const [resLabel, setResLabel] = useState("");
  const [resUrl, setResUrl] = useState("");
  const [nextStep, setNextStep] = useState("");
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setError(null);
    try {
      const d = await api.get<DetailResponse>(`/admin/high-potential/${userId}`);
      setData(d);
      setStatus(d.support?.status ?? "identified");
      setNextStep(d.support?.nextStepAt ? d.support.nextStepAt.slice(0, 10) : "");
    } catch (e) {
      setError(e instanceof ApiError ? e.message : "Could not load this student.");
    }
  }, [userId]);

  useEffect(() => {
    load();
  }, [load]);

  async function save() {
    setSaving(true);
    setSaveError(null);
    try {
      await api.put(`/admin/high-potential/${userId}/support`, {
        status,
        note: note.trim() || undefined,
        resource: resLabel.trim() ? { label: resLabel.trim(), url: resUrl.trim() || undefined } : undefined,
        nextStepAt: nextStep ? new Date(nextStep + "T09:00:00").toISOString() : null,
      });
      setNote("");
      setResLabel("");
      setResUrl("");
      await load();
      onChanged();
    } catch (e) {
      setSaveError(e instanceof ApiError ? e.message : "Could not save.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <Modal open onClose={onClose} title={data ? data.user.name : "Student"}>
      {error ? (
        <ErrorState title="Student did not load" message={error} onRetry={load} />
      ) : !data ? (
        <Skeleton className="h-64" />
      ) : (
        <div className="space-y-6">
          <p className="text-sm text-slate">
            {data.user.email} · {data.user.country ?? "Country not set"} · {data.user.plan} plan
          </p>

          {data.credential && (
            <section aria-labelledby="hp-cred" className="space-y-3">
              <h3 id="hp-cred" className="h3">Credentials: {data.credential.score} of 100</h3>
              <Meter label="Academics" value={data.credential.academics} max={30} />
              <Meter label="Language and tests" value={data.credential.languageAndTests} max={20} />
              <Meter label="Work experience" value={data.credential.experience} max={20} />
              <Meter label="Leadership and service" value={data.credential.leadershipAndService} max={15} />
              <Meter label="Certifications and extras" value={data.credential.extras} max={10} />
              {data.credential.gaps.length > 0 && (
                <div>
                  <p className="text-sm font-semibold text-ink">Where help would count most</p>
                  <ul className="mt-1 list-disc pl-5 text-sm text-ink-soft">
                    {data.credential.gaps.map((g) => <li key={g}>{g}</li>)}
                  </ul>
                </div>
              )}
            </section>
          )}

          <section aria-labelledby="hp-matches" className="space-y-2">
            <h3 id="hp-matches" className="h3">Saved scholarships, best fit first</h3>
            {data.matches.length === 0 ? (
              <p className="text-sm text-slate">No open saved scholarships.</p>
            ) : (
              <ul className="space-y-2">
                {data.matches.slice(0, 6).map((m) => (
                  <li key={m.opportunityId} className="rounded-lg bg-surface p-3">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <p className="text-sm font-semibold text-ink">{m.title}</p>
                      <span className={`badge ${ELIGIBILITY_BADGE[m.eligibility]}`}>{ELIGIBILITY_LABEL[m.eligibility]} · {m.fitScore}</span>
                    </div>
                    <p className="mt-0.5 text-sm text-slate">
                      {m.provider}
                      {m.daysLeft !== null ? ` · ${m.daysLeft} day${m.daysLeft === 1 ? "" : "s"} left` : ""}
                      {m.coachingTier ? ` · coaching says ${m.coachingTier}` : ""}
                    </p>
                    {m.hardGaps.length > 0 && <p className="mt-0.5 text-sm text-danger">Not met: {m.hardGaps.join("; ")}</p>}
                  </li>
                ))}
              </ul>
            )}
          </section>

          <section aria-labelledby="hp-support" className="space-y-4 border-t border-rule pt-6">
            <h3 id="hp-support" className="h3">Confidential support</h3>
            <p className="text-sm text-slate">Only admins can see this. The student is never shown these notes.</p>

            {data.support && (data.support.notes.length > 0 || data.support.resourcesShared.length > 0) && (
              <div className="space-y-3">
                {data.support.notes.map((n, i) => (
                  <p key={i} className="rounded-lg bg-surface p-3 text-sm text-ink-soft">
                    {n.text} <span className="block text-xs text-slate">{new Date(n.at).toLocaleDateString()}</span>
                  </p>
                ))}
                {data.support.resourcesShared.length > 0 && (
                  <ul className="list-disc pl-5 text-sm text-ink-soft">
                    {data.support.resourcesShared.map((r, i) => (
                      <li key={i}>
                        {r.url ? <a href={r.url} target="_blank" rel="noopener noreferrer" className="font-semibold text-forest hover:underline">{r.label}</a> : r.label}
                        <span className="text-slate"> · shared {new Date(r.sharedAt).toLocaleDateString()}</span>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            )}

            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <label htmlFor="hp-status" className="label">Status</label>
                <select id="hp-status" value={status} onChange={(e) => setStatus(e.target.value as SupportStatus)} className="input">
                  {(Object.keys(STATUS_LABEL) as SupportStatus[]).map((s) => <option key={s} value={s}>{STATUS_LABEL[s]}</option>)}
                </select>
              </div>
              <div>
                <label htmlFor="hp-next" className="label">Next step by <span className="font-normal text-slate">(optional)</span></label>
                <input id="hp-next" type="date" value={nextStep} onChange={(e) => setNextStep(e.target.value)} className="input" />
              </div>
            </div>
            <div>
              <label htmlFor="hp-note" className="label">Private note <span className="font-normal text-slate">(optional)</span></label>
              <textarea id="hp-note" rows={2} maxLength={2000} value={note} onChange={(e) => setNote(e.target.value)} className="textarea !min-h-0" />
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <label htmlFor="hp-res" className="label">Resource or introduction shared <span className="font-normal text-slate">(optional)</span></label>
                <input id="hp-res" maxLength={200} value={resLabel} onChange={(e) => setResLabel(e.target.value)} className="input" />
              </div>
              <div>
                <label htmlFor="hp-url" className="label">Link <span className="font-normal text-slate">(optional)</span></label>
                <input id="hp-url" type="url" value={resUrl} onChange={(e) => setResUrl(e.target.value)} className="input" />
              </div>
            </div>
            {saveError && <Alert variant="danger">{saveError}</Alert>}
            <button type="button" onClick={save} disabled={saving} aria-busy={saving} className="btn-primary">
              {saving ? "Saving" : "Save support record"}
            </button>
          </section>
        </div>
      )}
    </Modal>
  );
}

export default function HighPotentialPanel() {
  const [minScore, setMinScore] = useState(70);
  const [status, setStatus] = useState("");
  const [q, setQ] = useState("");
  const [query, setQuery] = useState("");
  const [page, setPage] = useState(1);
  const [data, setData] = useState<ListResponse | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams({ minScore: String(minScore), page: String(page) });
      if (query) params.set("q", query);
      if (status) params.set("status", status);
      setData(await api.get<ListResponse>(`/admin/high-potential?${params.toString()}`));
    } catch (e) {
      setError(e instanceof ApiError ? e.message : "Could not load students.");
    } finally {
      setLoading(false);
    }
  }, [minScore, page, query, status]);

  useEffect(() => {
    load();
  }, [load]);

  return (
    <div className="mt-8 space-y-6">
      <p className="max-w-2xl text-sm text-slate">
        Students whose CV and test scores look strongest on paper, so the team can offer extra help quietly. The score comes from grades, language tests, work, leadership and certifications, nudged by their AI coaching verdict. It says how strong they look, not whether they will win.
      </p>

      <div className="flex flex-wrap items-end gap-4">
        <div role="group" aria-label="Minimum score" className="flex gap-2">
          {MIN_SCORES.map((m) => (
            <button
              key={m}
              type="button"
              aria-pressed={minScore === m}
              onClick={() => { setMinScore(m); setPage(1); }}
              className={`min-h-touch rounded-md px-4 text-sm font-semibold transition-colors duration-150 ${minScore === m ? "bg-navy text-white" : "bg-white text-ink-soft hover:bg-surface-2"}`}
            >
              {m}+
              {data && <span className="ml-1.5 font-normal opacity-80">({data.bands.find((b) => b.min === m)?.count ?? 0})</span>}
            </button>
          ))}
        </div>
        <div>
          <label htmlFor="hp-filter-status" className="sr-only">Support status</label>
          <select id="hp-filter-status" value={status} onChange={(e) => { setStatus(e.target.value); setPage(1); }} className="input">
            <option value="">Any support status</option>
            <option value="none">Not yet reached</option>
            {(Object.keys(STATUS_LABEL) as SupportStatus[]).map((s) => <option key={s} value={s}>{STATUS_LABEL[s]}</option>)}
          </select>
        </div>
        <form
          className="flex gap-2"
          onSubmit={(e) => { e.preventDefault(); setQuery(q.trim()); setPage(1); }}
          role="search"
        >
          <label htmlFor="hp-search" className="sr-only">Search by name or email</label>
          <input id="hp-search" type="search" value={q} onChange={(e) => setQ(e.target.value)} placeholder="Name or email" className="input" />
          <button type="submit" className="btn-secondary">Search</button>
        </form>
      </div>

      {error ? (
        <ErrorState title="Students did not load" message={error} onRetry={load} />
      ) : loading && !data ? (
        <Skeleton className="h-64" />
      ) : data && data.users.length === 0 ? (
        <EmptyState title="Nobody at this level yet" description="Lower the minimum score, or wait for more students to upload a CV and add test scores." />
      ) : data ? (
        <>
          <div className="table-wrap">
            <table className="table">
              <thead>
                <tr>
                  <th scope="col">Student</th>
                  <th scope="col">Score</th>
                  <th scope="col">Strengths</th>
                  <th scope="col">Support</th>
                  <th scope="col"><span className="sr-only">Open</span></th>
                </tr>
              </thead>
              <tbody>
                {data.users.map((u) => (
                  <tr key={u.userId}>
                    <td>
                      <p className="font-semibold text-ink">{u.name}</p>
                      <p className="text-slate">{u.email}</p>
                      <p className="text-slate">{u.country ?? "Country not set"} · {u.plan}</p>
                    </td>
                    <td className="whitespace-nowrap">
                      <p className="font-display text-2xl tabular-nums text-ink">{u.rankScore}</p>
                      {u.coachingTier && <p className="text-xs capitalize text-slate">coaching: {u.coachingTier}</p>}
                    </td>
                    <td>
                      <ul className="list-disc space-y-0.5 pl-4">
                        {u.credential.highlights.slice(0, 3).map((h) => <li key={h}>{h}</li>)}
                      </ul>
                    </td>
                    <td>
                      {u.support ? <span className={`badge ${STATUS_BADGE[u.support.status]}`}>{STATUS_LABEL[u.support.status]}</span> : <span className="text-slate">Not yet reached</span>}
                    </td>
                    <td>
                      <button type="button" onClick={() => setOpen(u.userId)} className="btn-secondary btn-sm" aria-label={`Open ${u.name}`}>Open</button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="flex items-center justify-between gap-3">
            <p className="text-sm text-slate">
              {data.total} student{data.total === 1 ? "" : "s"} · scanned {data.scanned} CVs · updated {new Date(data.computedAt).toLocaleTimeString()}
            </p>
            <div className="flex gap-2">
              <button type="button" onClick={() => setPage((p) => Math.max(1, p - 1))} disabled={page <= 1} className="btn-secondary btn-sm">Previous</button>
              <span className="flex items-center px-2 text-sm text-slate">Page {data.page} of {data.pages}</span>
              <button type="button" onClick={() => setPage((p) => p + 1)} disabled={page >= data.pages} className="btn-secondary btn-sm">Next</button>
            </div>
          </div>
        </>
      ) : null}

      {open && <DetailDialog userId={open} onClose={() => setOpen(null)} onChanged={load} />}
    </div>
  );
}
