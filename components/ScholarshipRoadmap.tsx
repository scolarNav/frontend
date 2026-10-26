"use client";

import { useCallback, useEffect, useState } from "react";
import { CalendarPlus, Check, Copy, Download } from "lucide-react";
import { api, ApiError, downloadFile } from "@/lib/api";
import type { ScholarshipRoadmap as Roadmap, ScholarshipRoadmapStep } from "@/lib/types";
import UpgradePrompt from "@/components/UpgradePrompt";
import PartnerList from "@/components/PartnerList";
import { Alert, EmptyState, ErrorState } from "@/components/ui/States";
import { Skeleton } from "@/components/ui/Skeleton";

function formatDate(iso: string | null): string {
  if (!iso) return "No date yet";
  return new Date(iso + "T00:00:00").toLocaleDateString(undefined, { weekday: "short", day: "numeric", month: "short" });
}

const STATUS_BADGE: Record<ScholarshipRoadmapStep["status"], { label: string; cls: string } | null> = {
  behind: { label: "Behind", cls: "badge-warn" },
  due_soon: { label: "Due soon", cls: "badge-info" },
  upcoming: null,
};

function Switch({ checked, onChange, label, hint, disabled }: { checked: boolean; onChange: (v: boolean) => void; label: string; hint: string; disabled?: boolean }) {
  return (
    <div className="flex items-start justify-between gap-4">
      <div className="min-w-0">
        <p className="text-sm font-semibold text-ink">{label}</p>
        <p className="mt-0.5 text-sm text-slate">{hint}</p>
      </div>
      <button
        type="button"
        role="switch"
        aria-checked={checked}
        aria-label={label}
        disabled={disabled}
        onClick={() => onChange(!checked)}
        className="flex h-11 w-11 shrink-0 items-center justify-center disabled:opacity-50"
      >
        <span className={`relative h-6 w-11 rounded-full transition-colors duration-150 ${checked ? "bg-forest" : "bg-control"}`}>
          <span className={`absolute left-0.5 top-0.5 h-5 w-5 rounded-full bg-white transition-transform duration-150 ${checked ? "translate-x-5" : ""}`} />
        </span>
      </button>
    </div>
  );
}

/**
 * A short, dated plan for one scholarship. It starts from today, skips what the student has already
 * done or learned from their coaching, and shows what is behind schedule. Built by the server with
 * plain code, so it is instant and uses no AI.
 */
export default function ScholarshipRoadmap({ opportunityId }: { opportunityId: string }) {
  const [data, setData] = useState<Roadmap | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [upgrade, setUpgrade] = useState(false);
  const [attempt, setAttempt] = useState(0);
  const [savingKey, setSavingKey] = useState<string | null>(null);
  const [prefError, setPrefError] = useState<string | null>(null);
  const [feedUrl, setFeedUrl] = useState<{ url: string; googleCalendarAdd: string } | null>(null);
  const [feedBusy, setFeedBusy] = useState(false);
  const [copied, setCopied] = useState(false);
  const [downloading, setDownloading] = useState(false);

  const load = useCallback(() => {
    return api
      .get<Roadmap>(`/applications/${opportunityId}/roadmap`)
      .then((d) => {
        setData(d);
        setError(null);
      })
      .catch((e) => {
        if (e instanceof ApiError && e.message.startsWith("UPGRADE_REQUIRED")) setUpgrade(true);
        else setError(e instanceof ApiError ? e.message : "Could not load your roadmap.");
      });
  }, [opportunityId]);

  useEffect(() => {
    setData(null);
    setUpgrade(false);
    load();
  }, [load, attempt]);

  async function markDone(key: string) {
    setSavingKey(key);
    setPrefError(null);
    try {
      await api.patch(`/applications/${opportunityId}/roadmap`, { step: { key, done: true } });
      await load();
    } catch (e) {
      setPrefError(e instanceof ApiError ? e.message : "Could not save that change.");
    } finally {
      setSavingKey(null);
    }
  }

  async function setPref(body: { remindersEnabled?: boolean; calendarEnabled?: boolean }) {
    if (!data) return;
    setPrefError(null);
    const before = data.prefs;
    setData({ ...data, prefs: { ...before, ...body } });
    try {
      await api.patch(`/applications/${opportunityId}/roadmap`, body);
    } catch (e) {
      setData((d) => (d ? { ...d, prefs: before } : d));
      setPrefError(e instanceof ApiError ? e.message : "Could not save that change.");
    }
  }

  async function getFeed(rotate = false) {
    setFeedBusy(true);
    setPrefError(null);
    try {
      setFeedUrl(await api.post<{ url: string; googleCalendarAdd: string }>("/calendar/feed", { rotate }));
      setCopied(false);
    } catch (e) {
      setPrefError(e instanceof ApiError ? e.message : "Could not create your calendar link.");
    } finally {
      setFeedBusy(false);
    }
  }

  async function copyFeed() {
    if (!feedUrl) return;
    try {
      await navigator.clipboard.writeText(feedUrl.url);
      setCopied(true);
    } catch {
      setPrefError("Could not copy. Select the link and copy it by hand.");
    }
  }

  async function downloadIcs() {
    setDownloading(true);
    setPrefError(null);
    try {
      await downloadFile(`/applications/${opportunityId}/roadmap.ics`, "scolarnav-roadmap.ics");
    } catch (e) {
      setPrefError(e instanceof ApiError ? e.message : "Could not download the calendar file.");
    } finally {
      setDownloading(false);
    }
  }

  if (upgrade) return <UpgradePrompt feature="roadmap" />;
  if (error) return <ErrorState title="Your roadmap did not load" message={error} onRetry={() => setAttempt((n) => n + 1)} />;
  if (!data) return <Skeleton className="h-72" />;

  const { window: w, steps, covered } = data;

  if (w.state === "closed") {
    return <EmptyState title="This deadline has passed" description={data.headline} />;
  }

  return (
    <section className="card card-pad space-y-8" aria-labelledby="roadmap-heading">
      <div>
        <p className="eyebrow">Your plan from today</p>
        <h2 id="roadmap-heading" className="h2 mt-1">Roadmap</h2>
        <p className="mt-2 max-w-prose text-sm leading-relaxed text-ink-soft">{data.headline}</p>

        {w.percentElapsed !== null && w.state === "open" && (
          <div className="mt-4">
            <div
              className="h-2 overflow-hidden rounded-full bg-surface-2"
              role="progressbar"
              aria-valuenow={w.percentElapsed}
              aria-valuemin={0}
              aria-valuemax={100}
              aria-label="Share of the application window used"
            >
              <div className="h-full rounded-full bg-forest" style={{ width: `${w.percentElapsed}%` }} />
            </div>
            <p className="mt-1.5 text-sm text-slate">
              {w.percentElapsed}% of the application window used
              {w.deadline ? `, closes ${formatDate(w.deadline)}` : ""}
            </p>
          </div>
        )}
      </div>

      {covered.length > 0 && (
        <details className="group">
          <summary className="flex min-h-touch cursor-pointer list-none items-center gap-2 text-sm font-semibold text-forest">
            <Check size={16} aria-hidden="true" />
            {covered.length} step{covered.length === 1 ? "" : "s"} already covered
          </summary>
          <ul className="mt-2 space-y-1.5">
            {covered.map((c) => (
              <li key={c.key} className="text-sm text-ink-soft">
                {c.title} <span className="text-slate">{c.how === "coaching" ? "(covered by your coaching)" : "(done)"}</span>
              </li>
            ))}
          </ul>
        </details>
      )}

      {steps.length === 0 ? (
        <Alert variant="ok">Nothing left on your list. Keep your confirmation safe after you submit.</Alert>
      ) : (
        <ol className="divide-y divide-rule">
          {steps.map((s) => {
            const badge = STATUS_BADGE[s.status];
            return (
              <li key={s.key} className="flex gap-3 py-4 first:pt-0">
                <button
                  type="button"
                  role="checkbox"
                  aria-checked={false}
                  aria-label={`Mark done: ${s.title}`}
                  onClick={() => markDone(s.key)}
                  disabled={savingKey === s.key}
                  aria-busy={savingKey === s.key}
                  className="flex h-11 w-11 shrink-0 items-center justify-center rounded-md hover:bg-surface-2 disabled:opacity-60"
                >
                  <span className="h-5 w-5 rounded border-2 border-control bg-white" />
                </button>
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <p className="font-semibold text-ink">{s.title}</p>
                    {badge && <span className={`badge ${badge.cls}`}>{badge.label}</span>}
                  </div>
                  <p className="mt-0.5 text-sm text-ink-soft">{s.detail}</p>
                  <p className="mt-1 flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-slate">
                    <span>
                      {s.dueDate ? "Aim for " : ""}
                      <span className="font-semibold text-ink">{formatDate(s.dueDate)}</span>
                    </span>
                    {s.addToGoogleCalendar && (
                      <a
                        href={s.addToGoogleCalendar}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex min-h-touch items-center gap-1 font-semibold text-forest hover:underline"
                      >
                        <CalendarPlus size={14} aria-hidden="true" />
                        Add to Google Calendar
                      </a>
                    )}
                  </p>
                </div>
              </li>
            );
          })}
        </ol>
      )}

      {data.partners.length > 0 && <PartnerList partners={data.partners} heading="Language test preparation" />}

      <div className="space-y-5 border-t border-rule pt-6">
        <h3 className="h3">Reminders and calendar</h3>
        <Switch
          checked={data.prefs.remindersEnabled}
          onChange={(v) => setPref({ remindersEnabled: v })}
          label="Email reminders"
          hint="One email a day at most, only when a step is behind or due within 2 days."
        />
        <Switch
          checked={data.prefs.calendarEnabled}
          onChange={(v) => setPref({ calendarEnabled: v })}
          label="Keep my calendar in sync"
          hint="Adds this plan to your personal calendar link, so dates move when your plan does."
        />

        <div className="flex flex-wrap gap-3">
          <button type="button" onClick={downloadIcs} disabled={downloading} aria-busy={downloading} className="btn-secondary">
            <Download size={16} aria-hidden="true" />
            {downloading ? "Preparing file" : "Download calendar file"}
          </button>
          <button type="button" onClick={() => getFeed(false)} disabled={feedBusy} aria-busy={feedBusy} className="btn-secondary">
            {feedBusy ? "Creating link" : "Get my calendar link"}
          </button>
        </div>

        {feedUrl && (
          <div className="rounded-lg bg-surface p-4">
            <label htmlFor="feed-url" className="label">Your private calendar link</label>
            <div className="flex flex-wrap gap-2">
              <input id="feed-url" readOnly value={feedUrl.url} onFocus={(e) => e.currentTarget.select()} className="input min-w-0 flex-1" />
              <button type="button" onClick={copyFeed} className="btn-secondary shrink-0">
                <Copy size={16} aria-hidden="true" />
                {copied ? "Copied" : "Copy"}
              </button>
            </div>
            <p className="help">
              In Google Calendar, open Other calendars, choose From URL and paste this link. Anyone with the link can see your dates, so keep it private.
            </p>
            <div className="mt-3 flex flex-wrap gap-4">
              <a href={feedUrl.googleCalendarAdd} target="_blank" rel="noopener noreferrer" className="inline-flex min-h-touch items-center text-sm font-semibold text-forest hover:underline">
                Open in Google Calendar
              </a>
              <button type="button" onClick={() => getFeed(true)} disabled={feedBusy} className="inline-flex min-h-touch items-center text-sm font-semibold text-danger hover:underline disabled:opacity-50">
                Replace link (old one stops working)
              </button>
            </div>
          </div>
        )}

        {prefError && <Alert variant="danger">{prefError}</Alert>}
      </div>
    </section>
  );
}
