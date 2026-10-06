"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Check } from "lucide-react";
import { api, ApiError } from "@/lib/api";
import { useAuth } from "@/lib/auth-context";
import { Alert } from "@/components/ui/States";
import { Chip } from "@/components/ui/Chip";

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

const STEPS = ["Countries", "Subjects", "Your CV"];

export default function OnboardingPage() {
  const router = useRouter();
  const { refreshUser, user, loading: authLoading } = useAuth();
  const [step, setStep] = useState(1);

  useEffect(() => {
    if (!authLoading && user?.isCoach) router.replace("/coaches/dashboard");
  }, [authLoading, user, router]);
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

  return (
    <div className="mx-auto w-full max-w-xl px-4 py-10 sm:py-14">
      {/* Progress: three labelled steps */}
      <ol className="mb-8 grid grid-cols-3 gap-3" aria-label="Setup progress">
        {STEPS.map((label, i) => {
          const n = i + 1;
          const state = n < step ? "done" : n === step ? "current" : "todo";
          return (
            <li key={label} aria-current={state === "current" ? "step" : undefined}>
              <div className={`h-1.5 rounded-full ${state === "todo" ? "bg-rule-strong" : "bg-forest"}`} />
              <p className={`mt-2 text-sm ${state === "current" ? "font-semibold text-ink" : "text-slate"}`}>
                {n}. {label}
              </p>
            </li>
          );
        })}
      </ol>

      <div className="card card-pad sm:p-8">
        {/* Step 1: Target countries */}
        {step === 1 && (
          <div>
            <h1 className="h2">Where do you want to study?</h1>
            <p className="mt-2 text-sm leading-relaxed text-slate">
              Pick the countries you are interested in. We will show scholarships from these countries first. Choose up to 6.
            </p>

            <div className="mt-6 flex flex-wrap gap-2">
              {TARGET_COUNTRIES.map((c) => (
                <Chip key={c} active={targetCountries.includes(c)} onClick={() => setTargetCountries(toggleItem(targetCountries, c, 6))}>
                  {c}
                </Chip>
              ))}
            </div>

            {error && <Alert variant="danger" className="mt-4">{error}</Alert>}

            <div className="mt-8 flex flex-wrap items-center gap-3">
              <button type="button" onClick={saveStep1} disabled={saving} aria-busy={saving} className="btn-primary">
                {saving ? "Saving" : "Continue"}
              </button>
              <button type="button" onClick={() => setStep(2)} className="btn-ghost">
                Skip for now
              </button>
            </div>
          </div>
        )}

        {/* Step 2: Field of study + degree level */}
        {step === 2 && (
          <div>
            <h1 className="h2">What do you want to study?</h1>
            <p className="mt-2 text-sm leading-relaxed text-slate">
              Choose your fields of interest (up to 5) and the degree level you are aiming for.
            </p>

            <div className="mt-6 flex flex-wrap gap-2">
              {STUDY_FIELDS.map((f) => (
                <Chip key={f} active={targetFields.includes(f)} onClick={() => setTargetFields(toggleItem(targetFields, f, 5))}>
                  {f}
                </Chip>
              ))}
            </div>

            <div className="mt-8">
              <p className="label">Target degree level</p>
              <div className="flex flex-wrap gap-2">
                {DEGREE_LEVELS.map((d) => (
                  <Chip key={d.value} active={targetDegreeLevel === d.value} onClick={() => setTargetDegreeLevel(targetDegreeLevel === d.value ? "" : d.value)}>
                    {d.label}
                  </Chip>
                ))}
              </div>
            </div>

            {error && <Alert variant="danger" className="mt-4">{error}</Alert>}

            <div className="mt-8 flex flex-wrap items-center gap-3">
              <button type="button" onClick={saveStep2} disabled={saving} aria-busy={saving} className="btn-primary">
                {saving ? "Saving" : "Continue"}
              </button>
              <button type="button" onClick={() => setStep(3)} className="btn-ghost">
                Skip for now
              </button>
            </div>
          </div>
        )}

        {/* Step 3: Upload CV */}
        {step === 3 && (
          <div>
            <h1 className="h2">Upload your CV</h1>
            <p className="mt-2 text-sm leading-relaxed text-slate">
              Your CV lets us match scholarships to your real background and coach you with specifics instead of generic advice.
            </p>

            <div className="mt-6 rounded-lg bg-surface p-5">
              <p className="text-sm font-semibold text-ink">What your CV unlocks</p>
              <ul className="mt-3 space-y-2.5">
                {[
                  "Scholarship matching scored against your real experience",
                  "A readiness score with specific gaps identified",
                  "Mentor advice that references your actual background",
                  "Mock interview questions tailored to each scholarship",
                ].map((item) => (
                  <li key={item} className="flex items-start gap-2.5 text-sm text-ink-soft">
                    <Check size={16} className="mt-0.5 shrink-0 text-ok" aria-hidden="true" />
                    {item}
                  </li>
                ))}
              </ul>
            </div>

            <div className="mt-8 flex flex-wrap items-center gap-3">
              <Link href="/cv" className="btn-primary">
                Upload CV now
              </Link>
              <button type="button" onClick={finish} className="btn-ghost">
                Skip and continue
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
