"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { api, ApiError } from "@/lib/api";
import { useAuth } from "@/lib/auth-context";

const TARGET_COUNTRIES = [
  "United Kingdom", "United States", "Germany", "Canada", "Australia",
  "Netherlands", "Sweden", "France", "Japan", "South Korea",
  "Norway", "Denmark", "Switzerland", "Belgium", "Ireland",
  "New Zealand", "Finland", "Austria", "Italy", "China",
];

const STUDY_FIELDS = [
  "Computer Science & IT", "Engineering", "Business & Management",
  "Economics", "Medicine & Health Sciences", "Public Health",
  "Law", "Agriculture", "Education", "Social Sciences",
  "Environmental Science", "Architecture", "Arts & Design",
  "Humanities", "International Relations", "Finance",
  "Development Studies", "Journalism & Media", "Mathematics",
  "Public Policy",
];

const DEGREE_LEVELS = [
  { value: "undergraduate", label: "Undergraduate (Bachelor's)" },
  { value: "masters", label: "Master's / Postgraduate" },
  { value: "phd", label: "PhD / Doctoral" },
  { value: "postdoc", label: "Postdoctoral" },
  { value: "professional", label: "Professional / Executive" },
];

export default function OnboardingPage() {
  const router = useRouter();
  const { refreshUser } = useAuth();
  const [step, setStep] = useState(1);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Step 1 state
  const [targetCountries, setTargetCountries] = useState<string[]>([]);

  // Step 2 state
  const [targetFields, setTargetFields] = useState<string[]>([]);
  const [targetDegreeLevel, setTargetDegreeLevel] = useState("");

  function toggleItem<T>(list: T[], item: T, max: number): T[] {
    return list.includes(item)
      ? list.filter((x) => x !== item)
      : list.length < max
      ? [...list, item]
      : list;
  }

  async function saveStep1() {
    setSaving(true);
    setError(null);
    try {
      await api.patch("/profile/questionnaire", { targetCountries });
      setStep(2);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Couldn't save. Try again.");
    } finally {
      setSaving(false);
    }
  }

  async function saveStep2() {
    setSaving(true);
    setError(null);
    try {
      await api.patch("/profile/questionnaire", { targetFields, targetDegreeLevel });
      setStep(3);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Couldn't save. Try again.");
    } finally {
      setSaving(false);
    }
  }

  async function finish() {
    await refreshUser();
    router.push("/cv");
  }

  const progress = Math.round((step / 3) * 100);

  return (
    <div className="min-h-[80vh] flex items-center justify-center px-6 py-16">
      <div className="w-full max-w-lg">
        {/* Progress bar */}
        <div className="mb-8">
          <div className="flex items-center justify-between mb-2">
            <p className="font-mono text-xs text-slate uppercase tracking-widest">Step {step} of 3</p>
            <p className="font-mono text-xs text-slate">{progress}%</p>
          </div>
          <div className="h-1 bg-rule rounded-full overflow-hidden">
            <div
              className="h-full rounded-full transition-all duration-500"
              style={{ width: `${progress}%`, background: "#d3622c" }}
            />
          </div>
        </div>

        {/* Step 1: Target countries */}
        {step === 1 && (
          <div>
            <h1 className="font-display text-3xl text-ink">Where do you want to study?</h1>
            <p className="text-ink-soft mt-2 text-sm leading-relaxed">
              Select countries you're interested in. We'll prioritise scholarships from these countries in your feed. Pick up to 6.
            </p>

            <div className="mt-6 flex flex-wrap gap-2">
              {TARGET_COUNTRIES.map((c) => {
                const active = targetCountries.includes(c);
                return (
                  <button
                    key={c}
                    onClick={() => setTargetCountries(toggleItem(targetCountries, c, 6))}
                    className="px-3 py-1.5 rounded-full text-sm font-medium border transition-all"
                    style={
                      active
                        ? { background: "#d3622c", color: "#fff", borderColor: "#d3622c" }
                        : { background: "#fff", color: "#475569", borderColor: "#e2e8f0" }
                    }
                  >
                    {c}
                  </button>
                );
              })}
            </div>

            {error && <p className="text-alert text-sm mt-4">{error}</p>}

            <div className="mt-8 flex items-center gap-3">
              <button
                onClick={saveStep1}
                disabled={saving}
                className="btn-primary"
              >
                {saving ? "Saving…" : "Next →"}
              </button>
              <button
                onClick={() => setStep(2)}
                className="text-sm text-slate hover:text-ink transition-colors"
              >
                Skip for now
              </button>
            </div>
          </div>
        )}

        {/* Step 2: Field of study + degree level */}
        {step === 2 && (
          <div>
            <h1 className="font-display text-3xl text-ink">What do you want to study?</h1>
            <p className="text-ink-soft mt-2 text-sm leading-relaxed">
              Select your fields of interest and target degree level. Pick up to 5 fields.
            </p>

            <div className="mt-6 flex flex-wrap gap-2">
              {STUDY_FIELDS.map((f) => {
                const active = targetFields.includes(f);
                return (
                  <button
                    key={f}
                    onClick={() => setTargetFields(toggleItem(targetFields, f, 5))}
                    className="px-3 py-1.5 rounded-full text-sm font-medium border transition-all"
                    style={
                      active
                        ? { background: "#d3622c", color: "#fff", borderColor: "#d3622c" }
                        : { background: "#fff", color: "#475569", borderColor: "#e2e8f0" }
                    }
                  >
                    {f}
                  </button>
                );
              })}
            </div>

            <div className="mt-6">
              <label className="block text-sm font-medium text-ink mb-2">Target degree level</label>
              <div className="flex flex-wrap gap-2">
                {DEGREE_LEVELS.map((d) => {
                  const active = targetDegreeLevel === d.value;
                  return (
                    <button
                      key={d.value}
                      onClick={() => setTargetDegreeLevel(active ? "" : d.value)}
                      className="px-3 py-1.5 rounded-full text-sm font-medium border transition-all"
                      style={
                        active
                          ? { background: "#1a2d45", color: "#fff", borderColor: "#1a2d45" }
                          : { background: "#fff", color: "#475569", borderColor: "#e2e8f0" }
                      }
                    >
                      {d.label}
                    </button>
                  );
                })}
              </div>
            </div>

            {error && <p className="text-alert text-sm mt-4">{error}</p>}

            <div className="mt-8 flex items-center gap-3">
              <button
                onClick={saveStep2}
                disabled={saving}
                className="btn-primary"
              >
                {saving ? "Saving…" : "Next →"}
              </button>
              <button
                onClick={() => setStep(3)}
                className="text-sm text-slate hover:text-ink transition-colors"
              >
                Skip for now
              </button>
            </div>
          </div>
        )}

        {/* Step 3: Upload CV */}
        {step === 3 && (
          <div>
            <h1 className="font-display text-3xl text-ink">Upload your CV</h1>
            <p className="text-ink-soft mt-2 text-sm leading-relaxed">
              Your CV unlocks personalised matching, readiness scoring, and AI coaching tailored to your actual background — not generic advice.
            </p>

            <div className="mt-6 space-y-3">
              <div className="case-card p-5">
                <p className="font-medium text-ink text-sm">What your CV unlocks:</p>
                <ul className="mt-3 space-y-2">
                  {[
                    "Scholarship matching scored against your real experience",
                    "Readiness score with specific gaps identified",
                    "Mentor advice that references your actual background",
                    "Mock interview questions tailored to each scholarship",
                  ].map((item) => (
                    <li key={item} className="flex items-start gap-2 text-sm text-ink-soft">
                      <span className="text-green-600 mt-0.5 shrink-0">✓</span>
                      {item}
                    </li>
                  ))}
                </ul>
              </div>
            </div>

            <div className="mt-8 flex items-center gap-3">
              <Link href="/cv" className="btn-primary">
                Upload CV now →
              </Link>
              <button
                onClick={finish}
                className="text-sm text-slate hover:text-ink transition-colors"
              >
                Skip — go to dashboard
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
