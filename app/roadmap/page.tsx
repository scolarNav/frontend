"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { api, ApiError } from "@/lib/api";
import { useAuth } from "@/lib/auth-context";
import { Roadmap, UserProfile } from "@/lib/types";
import UpgradePrompt from "@/components/UpgradePrompt";

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

  if (authLoading || loading) {
    return <p className="max-w-3xl mx-auto px-6 py-20 text-slate font-mono text-sm">Loading your roadmap…</p>;
  }
  if (!user) return null;

  const isPro = user.subscription?.plan === "pro" &&
    (user.subscription?.status === "active" || user.subscription?.status === "trialing");

  if (!isPro) {
    return (
      <div className="max-w-2xl mx-auto px-6 py-16">
        <h1 className="font-display text-4xl text-ink">My Roadmap</h1>
        <p className="text-ink-soft mt-2 text-lg">Your week-by-week plan to get scholarship-ready.</p>
        <UpgradePrompt feature="roadmap" />
      </div>
    );
  }

  if (showForm) {
    return (
      <div className="max-w-2xl mx-auto px-6 py-14">
        <h1 className="font-display text-4xl text-ink mb-3">Build your plan</h1>
        <p className="text-ink-soft mb-10">
          Answer a few questions and we'll generate a week-by-week scholarship roadmap built around your goals, timeline, and target countries.
        </p>

        {error && <p className="text-alert text-sm mb-4">{error}</p>}

        <div className="space-y-8">
          <div>
            <label className="block text-sm font-medium text-ink mb-3">
              Which countries are you targeting? <span className="text-slate font-normal">(select all that apply)</span>
            </label>
            <div className="flex flex-wrap gap-2">
              {COUNTRIES.map((c) => (
                <button
                  key={c}
                  type="button"
                  onClick={() => toggleCountry(c)}
                  className={`text-sm px-3 py-1.5 border rounded-md transition-colors ${
                    form.targetCountries.includes(c)
                      ? "bg-forest text-white border-forest"
                      : "border-rule text-ink-soft hover:border-forest hover:text-forest"
                  }`}
                >
                  {c}
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-ink mb-3">
              What do you want to study? <span className="text-slate font-normal">(select all that apply)</span>
            </label>
            <div className="flex flex-wrap gap-2">
              {STUDY_FIELDS.map((f) => (
                <button
                  key={f}
                  type="button"
                  onClick={() => toggleField(f)}
                  className={`text-sm px-3 py-1.5 border rounded-md transition-colors ${
                    form.targetFields.includes(f)
                      ? "bg-forest text-white border-forest"
                      : "border-rule text-ink-soft hover:border-forest hover:text-forest"
                  }`}
                >
                  {f}
                </button>
              ))}
            </div>
          </div>

          <div className="grid sm:grid-cols-2 gap-5">
            <div>
              <label className="block text-sm font-medium text-ink mb-1.5">Target degree level</label>
              <select
                value={form.targetDegreeLevel}
                onChange={(e) => setForm((f) => ({ ...f, targetDegreeLevel: e.target.value }))}
                className="input"
              >
                <option value="">Select…</option>
                {DEGREE_LEVELS.map((d) => <option key={d} value={d}>{d}</option>)}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-ink mb-1.5">Target start date</label>
              <select
                value={form.targetStartDate}
                onChange={(e) => setForm((f) => ({ ...f, targetStartDate: e.target.value }))}
                className="input"
              >
                <option value="">Select…</option>
                {MONTH_YEARS.map((m) => <option key={m} value={m}>{m}</option>)}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-ink mb-1.5">Annual budget (USD)</label>
              <input
                type="number"
                value={form.annualBudgetUSD}
                onChange={(e) => setForm((f) => ({ ...f, annualBudgetUSD: e.target.value }))}
                placeholder="e.g. 15000"
                className="input"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-ink mb-3">Language test scores <span className="text-slate font-normal">(leave blank if not taken)</span></label>
            <div className="grid grid-cols-3 gap-4">
              {[
                { key: "ielts", label: "IELTS", placeholder: "e.g. 7.0" },
                { key: "toefl", label: "TOEFL iBT", placeholder: "e.g. 100" },
                { key: "gre", label: "GRE", placeholder: "e.g. 320" },
              ].map(({ key, label, placeholder }) => (
                <div key={key}>
                  <label className="block text-xs text-slate font-mono mb-1">{label}</label>
                  <input
                    type="number"
                    value={form[key as keyof typeof form] as string}
                    onChange={(e) => setForm((f) => ({ ...f, [key]: e.target.value }))}
                    placeholder={placeholder}
                    className="input"
                  />
                </div>
              ))}
            </div>
          </div>

          <button
            onClick={saveAndGenerate}
            disabled={generating}
            className="btn-primary w-full"
          >
            {generating ? "Building your roadmap…" : "Generate my roadmap"}
          </button>
        </div>
      </div>
    );
  }

  if (!roadmap) return null;

  return (
    <div className="max-w-3xl mx-auto px-6 py-14">
      <div className="flex items-start justify-between mb-2">
        <p className="font-mono text-xs tracking-widest uppercase text-slate">My Roadmap</p>
        <button
          onClick={() => setShowForm(true)}
          className="text-xs text-forest font-mono hover:underline"
        >
          Update goals →
        </button>
      </div>
      <h1 className="font-display text-4xl text-ink mb-4">{roadmap.title}</h1>
      <p className="text-ink-soft leading-relaxed mb-6">{roadmap.overview}</p>

      {/* Progress bar */}
      {(() => {
        const totalTasks = roadmap.weeks.reduce((sum, w) => sum + w.tasks.length, 0);
        const doneTasks = completedTasks.size;
        const pct = totalTasks > 0 ? Math.round((doneTasks / totalTasks) * 100) : 0;
        return (
          <div className="mb-10">
            <div className="flex items-center justify-between mb-1.5">
              <p className="text-xs font-mono text-slate">{doneTasks} of {totalTasks} tasks done</p>
              <p className="text-xs font-mono text-forest">{pct}%</p>
            </div>
            <div className="h-1.5 bg-rule rounded-full overflow-hidden">
              <div className="h-full bg-forest rounded-full transition-all duration-500" style={{ width: `${pct}%` }} />
            </div>
          </div>
        );
      })()}

      <div className="space-y-0">
        {roadmap.weeks.map((week, i) => {
          const weekDone = week.tasks.every((_, j) => completedTasks.has(`${week.week}-${j}`));
          return (
            <div key={week.week} className="flex gap-5">
              {/* Timeline spine */}
              <div className="flex flex-col items-center">
                <div className={`w-8 h-8 rounded-full flex items-center justify-center font-mono text-xs shrink-0 z-10 transition-colors ${weekDone ? "bg-forest text-white" : "bg-white border-2 border-forest text-forest"}`}>
                  {weekDone ? "✓" : week.week}
                </div>
                {i < roadmap.weeks.length - 1 && (
                  <div className="w-0.5 flex-1 bg-rule my-1" />
                )}
              </div>

              {/* Content */}
              <div className="pb-8 flex-1">
                <p className={`font-display text-lg ${weekDone ? "text-slate line-through" : "text-ink"}`}>{week.label}</p>
                {week.milestone && (
                  <p className="text-xs font-mono text-brass mt-0.5 mb-2">
                    Milestone: {week.milestone}
                  </p>
                )}
                <ul className="mt-2 space-y-2">
                  {week.tasks.map((task, j) => {
                    const taskKey = `${week.week}-${j}`;
                    const isDone = completedTasks.has(taskKey);
                    const isToggling = togglingTask === taskKey;
                    return (
                      <li key={j} className="flex items-start gap-2.5">
                        <button
                          type="button"
                          onClick={() => toggleTask(taskKey)}
                          disabled={isToggling}
                          className={`mt-0.5 w-4 h-4 shrink-0 rounded border transition-colors flex items-center justify-center ${
                            isDone
                              ? "bg-forest border-forest text-white"
                              : "border-rule hover:border-forest"
                          }`}
                          aria-label={isDone ? "Mark incomplete" : "Mark complete"}
                        >
                          {isDone && <span className="text-white text-xs leading-none">✓</span>}
                        </button>
                        <span className={`text-sm leading-snug ${isDone ? "text-slate line-through" : "text-ink-soft"}`}>
                          {task}
                        </span>
                      </li>
                    );
                  })}
                </ul>
              </div>
            </div>
          );
        })}
      </div>

      <p className="text-xs text-slate font-mono mt-8">
        Generated {new Date(roadmap.generatedAt).toLocaleDateString()} · Based on your profile and CV
      </p>
    </div>
  );
}
