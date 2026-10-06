"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { api, ApiError } from "@/lib/api";
import { useAuth } from "@/lib/auth-context";
import { Roadmap, UserProfile } from "@/lib/types";
import UpgradePrompt from "@/components/UpgradePrompt";
import { Alert } from "@/components/ui/States";
import { Check } from "lucide-react";
import { PageHeader } from "@/components/ui/PageHeader";
import { SkeletonPage } from "@/components/ui/Skeleton";
import { ProgressBar } from "@/components/ui/Spinner";
import { Chip } from "@/components/ui/Chip";

const DEGREE_LEVELS = ["Undergraduate", "Master's", "PhD", "Postdoc", "Professional", "Not sure yet"];
const COUNTRIES = [
  "United Kingdom", "Germany", "Canada", "Sweden", "Netherlands",
  "Australia", "United States", "France", "Japan", "China",
  "Norway", "Denmark", "Finland", "Switzerland", "Belgium",
];

const STUDY_FIELDS = [
  "Computer Science & IT", "Engineering", "Business & Management", "Economics",
  "Public Health", "Medicine", "Agriculture", "Law", "Education",
  "Social Sciences", "International Relations", "Environmental Science",
  "Finance", "Architecture", "Arts & Humanities", "Journalism & Media",
  "Mathematics & Statistics", "Biology & Life Sciences", "Psychology",
  "Development Studies",
];

const MONTH_YEARS: string[] = [];
(function buildOptions() {
  const now = new Date();
  for (let i = 3; i <= 30; i++) {
    const d = new Date(now.getFullYear(), now.getMonth() + i, 1);
    MONTH_YEARS.push(d.toLocaleString("en-GB", { month: "long", year: "numeric" }));
  }
})();

export default function RoadmapPage() {
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();

  const [roadmap, setRoadmap] = useState<Roadmap | null>(null);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [completedTasks, setCompletedTasks] = useState<Set<string>>(new Set());
  const [togglingTask, setTogglingTask] = useState<string | null>(null);

  const [form, setForm] = useState<{
    targetCountries: string[];
    targetFields: string[];
    targetDegreeLevel: string;
    targetStartDate: string;
    annualBudgetUSD: string;
    ielts: string;
    toefl: string;
    gre: string;
  }>({
    targetCountries: [],
    targetFields: [],
    targetDegreeLevel: "",
    targetStartDate: "",
    annualBudgetUSD: "",
    ielts: "",
    toefl: "",
    gre: "",
  });

  useEffect(() => {
    if (!authLoading && !user) router.push("/login");
  }, [authLoading, user, router]);

  useEffect(() => {
    if (!user) return;
    if (user.roadmapCache) {
      setRoadmap(user.roadmapCache);
      setCompletedTasks(new Set(user.roadmapCache.completedTasks ?? []));
      setLoading(false);
    } else {
      api.get<{ roadmap: Roadmap | null }>("/profile/roadmap")
        .then(({ roadmap: r }) => {
          setRoadmap(r);
          if (r) setCompletedTasks(new Set(r.completedTasks ?? []));
          setShowForm(!r);
        })
        .catch(() => setShowForm(true))
        .finally(() => setLoading(false));
    }
  }, [user]);

  async function toggleTask(taskKey: string) {
    const wasCompleted = completedTasks.has(taskKey);
    // Optimistic update — tick immediately so the UI feels instant
    setCompletedTasks((prev) => {
      const next = new Set(prev);
      if (wasCompleted) next.delete(taskKey);
      else next.add(taskKey);
      return next;
    });
    setTogglingTask(taskKey);
    try {
      const { completedTasks: updated } = await api.patch<{ completedTasks: string[] }>(
        "/profile/roadmap/tasks",
        { taskKey }
      );
      setCompletedTasks(new Set(updated));
    } catch {
      // Revert optimistic update on failure
      setCompletedTasks((prev) => {
        const next = new Set(prev);
        if (wasCompleted) next.add(taskKey);
        else next.delete(taskKey);
        return next;
      });
    } finally {
      setTogglingTask(null);
    }
  }

  function toggleCountry(c: string) {
    setForm((f) => ({
      ...f,
      targetCountries: f.targetCountries.includes(c)
        ? f.targetCountries.filter((x) => x !== c)
        : [...f.targetCountries, c],
    }));
  }

  function toggleField(f: string) {
    setForm((prev) => ({
      ...prev,
      targetFields: prev.targetFields.includes(f)
        ? prev.targetFields.filter((x) => x !== f)
        : [...prev.targetFields, f],
    }));
  }

  async function saveAndGenerate() {
    if (!form.targetCountries.length) {
      setError("Select at least one target country.");
      return;
    }
    setGenerating(true);
    setError(null);
    try {
      const profile: Partial<UserProfile> = {
        targetCountries: form.targetCountries,
        targetFields: form.targetFields,
        targetDegreeLevel: form.targetDegreeLevel || undefined,
        targetStartDate: form.targetStartDate || undefined,
        annualBudgetUSD: form.annualBudgetUSD ? Number(form.annualBudgetUSD) : undefined,
        testScores: {
          ielts: form.ielts ? Number(form.ielts) : undefined,
          toefl: form.toefl ? Number(form.toefl) : undefined,
          gre: form.gre ? Number(form.gre) : undefined,
        },
      };

      await api.patch("/profile/questionnaire", profile);
      const { roadmap: r } = await api.post<{ roadmap: Roadmap }>("/profile/roadmap");
      setRoadmap(r);
      setShowForm(false);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Couldn't generate roadmap.");
    } finally {
      setGenerating(false);
    }
  }

  if (authLoading || loading) return <SkeletonPage variant="list" />;
  if (!user) return null;

  const isPro = user.subscription?.plan === "pro" &&
    (user.subscription?.status === "active" || user.subscription?.status === "trialing");

  if (!isPro) {
    return (
      <div className="page-narrow">
        <PageHeader eyebrow="Pro" title="My roadmap" description="Your week-by-week plan to get scholarship-ready." />
        <UpgradePrompt feature="roadmap" />
      </div>
    );
  }

  if (showForm) {
    return (
      <div className="page-narrow">
        <PageHeader
          eyebrow="My roadmap"
          title="Build your plan"
          description="Answer a few questions and we will generate a week-by-week scholarship roadmap built around your goals, timeline and target countries."
        />

        {error && <Alert variant="danger" className="mb-4">{error}</Alert>}

        <div className="card card-pad space-y-8">
          <fieldset>
            <legend className="label">
              Which countries are you targeting? <span className="font-normal text-slate">(select all that apply)</span>
            </legend>
            <div className="mt-2 flex flex-wrap gap-2">
              {COUNTRIES.map((c) => (
                <Chip key={c} active={form.targetCountries.includes(c)} onClick={() => toggleCountry(c)}>{c}</Chip>
              ))}
            </div>
          </fieldset>

          <fieldset>
            <legend className="label">
              What do you want to study? <span className="font-normal text-slate">(select all that apply)</span>
            </legend>
            <div className="mt-2 flex flex-wrap gap-2">
              {STUDY_FIELDS.map((f) => (
                <Chip key={f} active={form.targetFields.includes(f)} onClick={() => toggleField(f)}>{f}</Chip>
              ))}
            </div>
          </fieldset>

          <div className="grid gap-5 sm:grid-cols-2">
            <div>
              <label htmlFor="rm-level" className="label">Target degree level</label>
              <select
                id="rm-level"
                value={form.targetDegreeLevel}
                onChange={(e) => setForm((f) => ({ ...f, targetDegreeLevel: e.target.value }))}
                className="input"
              >
                <option value="">Select a level</option>
                {DEGREE_LEVELS.map((d) => <option key={d} value={d}>{d}</option>)}
              </select>
            </div>

            <div>
              <label htmlFor="rm-start" className="label">Target start date</label>
              <select
                id="rm-start"
                value={form.targetStartDate}
                onChange={(e) => setForm((f) => ({ ...f, targetStartDate: e.target.value }))}
                className="input"
              >
                <option value="">Select a month</option>
                {MONTH_YEARS.map((m) => <option key={m} value={m}>{m}</option>)}
              </select>
            </div>

            <div>
              <label htmlFor="rm-budget" className="label">Annual budget (USD)</label>
              <input
                id="rm-budget"
                type="number"
                inputMode="numeric"
                value={form.annualBudgetUSD}
                onChange={(e) => setForm((f) => ({ ...f, annualBudgetUSD: e.target.value }))}
                placeholder="e.g. 15000"
                className="input"
              />
            </div>
          </div>

          <fieldset>
            <legend className="label">
              Language test scores <span className="font-normal text-slate">(leave blank if not taken)</span>
            </legend>
            <div className="mt-2 grid grid-cols-3 gap-4">
              {[
                { key: "ielts", label: "IELTS", placeholder: "e.g. 7.0" },
                { key: "toefl", label: "TOEFL iBT", placeholder: "e.g. 100" },
                { key: "gre", label: "GRE", placeholder: "e.g. 320" },
              ].map(({ key, label, placeholder }) => (
                <div key={key}>
                  <label htmlFor={`rm-${key}`} className="help !mt-0 mb-1 block">{label}</label>
                  <input
                    id={`rm-${key}`}
                    type="number"
                    inputMode="decimal"
                    value={form[key as keyof typeof form] as string}
                    onChange={(e) => setForm((f) => ({ ...f, [key]: e.target.value }))}
                    placeholder={placeholder}
                    className="input"
                  />
                </div>
              ))}
            </div>
          </fieldset>

          <div>
            <button type="button" onClick={saveAndGenerate} disabled={generating} aria-busy={generating} className="btn-primary btn-block">
              {generating ? "Building your roadmap" : "Generate my roadmap"}
            </button>
            {generating && (
              <div className="mt-4">
                <ProgressBar label="Building your roadmap" />
                <p className="mt-2 text-center text-sm text-slate">Planning your weeks. Please keep this page open.</p>
              </div>
            )}
          </div>
        </div>
      </div>
    );
  }

  if (!roadmap) return null;

  const totalTasks = roadmap.weeks.reduce((sum, w) => sum + w.tasks.length, 0);
  const doneTasks = completedTasks.size;
  const pct = totalTasks > 0 ? Math.round((doneTasks / totalTasks) * 100) : 0;

  return (
    <div className="page-narrow">
      <PageHeader
        eyebrow="My roadmap"
        title={roadmap.title}
        description={roadmap.overview}
        actions={<button type="button" onClick={() => setShowForm(true)} className="btn-secondary">Update goals</button>}
      />

      <section className="card card-pad mb-10" aria-label="Roadmap progress">
        <div className="mb-2 flex items-center justify-between">
          <p className="text-sm text-ink-soft">{doneTasks} of {totalTasks} tasks done</p>
          <p className="text-sm font-semibold text-forest">{pct}%</p>
        </div>
        <div className="h-2 overflow-hidden rounded-full bg-surface-2" role="progressbar" aria-valuenow={pct} aria-valuemin={0} aria-valuemax={100} aria-label="Roadmap progress">
          <div className="h-full rounded-full bg-forest transition-all duration-500" style={{ width: `${pct}%` }} />
        </div>
      </section>

      <ol>
        {roadmap.weeks.map((week, i) => {
          const weekDone = week.tasks.every((_, j) => completedTasks.has(`${week.week}-${j}`));
          return (
            <li key={week.week} className="flex gap-4 sm:gap-5">
              {/* Timeline spine */}
              <div className="flex flex-col items-center">
                <div
                  className={`z-10 flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-sm font-semibold transition-colors ${
                    weekDone ? "bg-forest text-white" : "bg-white text-forest ring-2 ring-inset ring-forest"
                  }`}
                >
                  {weekDone ? <Check size={16} aria-hidden="true" /> : week.week}
                  {weekDone && <span className="sr-only">Week {week.week} complete</span>}
                </div>
                {i < roadmap.weeks.length - 1 && <div className="my-1 w-0.5 flex-1 bg-rule-strong" />}
              </div>

              {/* Content */}
              <div className="min-w-0 flex-1 pb-8">
                <h2 className={`font-display text-lg ${weekDone ? "text-slate line-through" : "text-ink"}`}>{week.label}</h2>
                {week.milestone && <p className="mb-2 mt-0.5 text-sm font-medium text-warn">Milestone: {week.milestone}</p>}
                <ul className="mt-2 space-y-1">
                  {week.tasks.map((task, j) => {
                    const taskKey = `${week.week}-${j}`;
                    const isDone = completedTasks.has(taskKey);
                    const isToggling = togglingTask === taskKey;
                    return (
                      <li key={j}>
                        <button
                          type="button"
                          role="checkbox"
                          aria-checked={isDone}
                          onClick={() => toggleTask(taskKey)}
                          disabled={isToggling}
                          className="flex min-h-touch w-full items-start gap-3 rounded-md px-2 py-2.5 text-left transition-colors hover:bg-surface-2 disabled:opacity-60"
                        >
                          <span
                            className={`mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded border-2 transition-colors ${
                              isDone ? "border-forest bg-forest text-white" : "border-control bg-white"
                            }`}
                          >
                            {isDone && <Check size={14} aria-hidden="true" />}
                          </span>
                          <span className={`text-sm leading-snug ${isDone ? "text-slate line-through" : "text-ink-soft"}`}>{task}</span>
                        </button>
                      </li>
                    );
                  })}
                </ul>
              </div>
            </li>
          );
        })}
      </ol>

      <p className="mt-4 text-sm text-slate">
        Generated {new Date(roadmap.generatedAt).toLocaleDateString()} from your profile and CV.
      </p>
    </div>
  );
}
