"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { api, ApiError } from "@/lib/api";
import { useAuth } from "@/lib/auth-context";
import { COUNTRIES } from "@/lib/countries";
import { User, UserProfile } from "@/lib/types";
import PhotoUpload from "@/components/PhotoUpload";

const STUDY_DESTINATIONS = [
  "United Kingdom", "Germany", "Canada", "Sweden", "Netherlands",
  "Australia", "United States", "France", "Norway", "Denmark",
  "Finland", "Switzerland", "Belgium", "Ireland", "New Zealand",
  "Japan", "South Korea", "China", "Austria", "Italy",
];

const STUDY_FIELDS = [
  "Computer Science & IT", "Engineering", "Business & Management", "Economics",
  "Public Health", "Medicine", "Agriculture", "Law", "Education",
  "Social Sciences", "International Relations", "Environmental Science",
  "Finance", "Architecture", "Arts & Humanities", "Journalism & Media",
  "Mathematics & Statistics", "Biology & Life Sciences", "Psychology",
  "Development Studies",
];

const DEGREE_LEVELS = [
  "Undergraduate", "Master's", "PhD", "Postdoc", "Professional", "Not sure yet",
];

const MONTH_YEARS: string[] = [];
(function () {
  const now = new Date();
  for (let i = 2; i <= 36; i++) {
    const d = new Date(now.getFullYear(), now.getMonth() + i, 1);
    MONTH_YEARS.push(d.toLocaleString("en-GB", { month: "long", year: "numeric" }));
  }
})();

function completionSteps(user: User) {
  return [
    { label: "Personal details", done: !!(user.fullName && user.country) },
    { label: "CV uploaded", done: !!user.cvData },
    { label: "Target countries", done: (user.profile?.targetCountries?.length ?? 0) > 0 },
    { label: "Fields of study", done: (user.profile?.targetFields?.length ?? 0) > 0 },
    {
      label: "Test scores",
      done: !!(
        user.profile?.testScores?.ielts ||
        user.profile?.testScores?.toefl ||
        user.profile?.testScores?.gre ||
        user.profile?.testScores?.gmat ||
        user.profile?.testScores?.sat ||
        user.profile?.testScores?.duolingo
      ),
    },
    {
      label: "Study goals",
      done: !!(user.profile?.targetDegreeLevel || user.profile?.targetStartDate),
    },
  ];
}

export default function ProfilePage() {
  const { user, loading: authLoading, refreshUser } = useAuth();
  const router = useRouter();

  // Personal details
  const [fullName, setFullName] = useState("");
  const [country, setCountry] = useState("");
  const [savingProfile, setSavingProfile] = useState(false);
  const [profileMsg, setProfileMsg] = useState<{ type: "ok" | "err"; text: string } | null>(null);

  // Study goals
  const [targetCountries, setTargetCountries] = useState<string[]>([]);
  const [targetFields, setTargetFields] = useState<string[]>([]);
  const [targetDegreeLevel, setTargetDegreeLevel] = useState("");
  const [targetStartDate, setTargetStartDate] = useState("");
  const [annualBudgetUSD, setAnnualBudgetUSD] = useState("");
  const [savingGoals, setSavingGoals] = useState(false);
  const [goalsMsg, setGoalsMsg] = useState<{ type: "ok" | "err"; text: string } | null>(null);

  // Test scores
  const [ielts, setIelts] = useState("");
  const [toefl, setToefl] = useState("");
  const [gre, setGre] = useState("");
  const [gmat, setGmat] = useState("");
  const [sat, setSat] = useState("");
  const [duolingo, setDuolingo] = useState("");
  const [savingScores, setSavingScores] = useState(false);
  const [scoresMsg, setScoresMsg] = useState<{ type: "ok" | "err"; text: string } | null>(null);

  // Password
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [savingPassword, setSavingPassword] = useState(false);
  const [passwordMsg, setPasswordMsg] = useState<{ type: "ok" | "err"; text: string } | null>(null);

  useEffect(() => {
    if (!authLoading && !user) router.push("/login");
  }, [authLoading, user, router]);

  useEffect(() => {
    if (!user) return;
    setFullName(user.fullName);
    setCountry(user.country || "");

    const p = user.profile;
    if (p) {
      setTargetCountries(p.targetCountries ?? []);
      setTargetFields(p.targetFields ?? []);
      setTargetDegreeLevel(p.targetDegreeLevel ?? "");
      setTargetStartDate(p.targetStartDate ?? "");
      setAnnualBudgetUSD(p.annualBudgetUSD ? String(p.annualBudgetUSD) : "");
      setIelts(p.testScores?.ielts ? String(p.testScores.ielts) : "");
      setToefl(p.testScores?.toefl ? String(p.testScores.toefl) : "");
      setGre(p.testScores?.gre ? String(p.testScores.gre) : "");
      setGmat(p.testScores?.gmat ? String(p.testScores.gmat) : "");
      setSat(p.testScores?.sat ? String(p.testScores.sat) : "");
      setDuolingo(p.testScores?.duolingo ? String(p.testScores.duolingo) : "");
    }
  }, [user]);

  function toggleCountry(c: string) {
    setTargetCountries((prev) =>
      prev.includes(c) ? prev.filter((x) => x !== c) : [...prev, c]
    );
  }

  function toggleField(f: string) {
    setTargetFields((prev) =>
      prev.includes(f) ? prev.filter((x) => x !== f) : [...prev, f]
    );
  }

  function msgBox(msg: { type: "ok" | "err"; text: string }) {
    return (
      <p
        className={`text-sm font-mono ${msg.type === "ok" ? "text-slate" : "text-alert"
          }`}
      >
        {msg.text}
      </p>
    );
  }

  async function handleSaveProfile(e: React.FormEvent) {
    e.preventDefault();
    setSavingProfile(true);
    setProfileMsg(null);
    try {
      await api.patch<{ user: User }>("/auth/profile", { fullName, country });
      await refreshUser();
      setProfileMsg({ type: "ok", text: "Saved." });
    } catch (err) {
      setProfileMsg({ type: "err", text: err instanceof ApiError ? err.message : "Couldn't save." });
    } finally {
      setSavingProfile(false);
    }
  }

  async function handleSaveGoals(e: React.FormEvent) {
    e.preventDefault();
    setSavingGoals(true);
    setGoalsMsg(null);
    try {
      const profile: Partial<UserProfile> = {
        targetCountries,
        targetFields,
        targetDegreeLevel: targetDegreeLevel || undefined,
        targetStartDate: targetStartDate || undefined,
        annualBudgetUSD: annualBudgetUSD ? Number(annualBudgetUSD) : undefined,
      };
      await api.patch("/profile/questionnaire", profile);
      await refreshUser();
      setGoalsMsg({ type: "ok", text: "Study goals saved." });
    } catch (err) {
      setGoalsMsg({ type: "err", text: err instanceof ApiError ? err.message : "Couldn't save." });
    } finally {
      setSavingGoals(false);
    }
  }

  async function handleSaveScores(e: React.FormEvent) {
    e.preventDefault();
    setSavingScores(true);
    setScoresMsg(null);
    try {
      const profile: Partial<UserProfile> = {
        testScores: {
          ielts: ielts ? Number(ielts) : undefined,
          toefl: toefl ? Number(toefl) : undefined,
          gre: gre ? Number(gre) : undefined,
          gmat: gmat ? Number(gmat) : undefined,
          sat: sat ? Number(sat) : undefined,
          duolingo: duolingo ? Number(duolingo) : undefined,
        },
      };
      await api.patch("/profile/questionnaire", profile);
      await refreshUser();
      setScoresMsg({ type: "ok", text: "Test scores saved." });
    } catch (err) {
      setScoresMsg({ type: "err", text: err instanceof ApiError ? err.message : "Couldn't save." });
    } finally {
      setSavingScores(false);
    }
  }

  async function handleChangePassword(e: React.FormEvent) {
    e.preventDefault();
    setSavingPassword(true);
    setPasswordMsg(null);
    try {
      await api.patch("/auth/profile", { currentPassword, newPassword });
      setCurrentPassword("");
      setNewPassword("");
      setPasswordMsg({ type: "ok", text: "Password changed." });
    } catch (err) {
      setPasswordMsg({ type: "err", text: err instanceof ApiError ? err.message : "Couldn't change password." });
    } finally {
      setSavingPassword(false);
    }
  }

  if (authLoading) return <p className="max-w-2xl mx-auto px-4 py-20 text-slate font-mono text-sm">Loading…</p>;
  if (!user) return null;

  const isPro = user.subscription?.plan === "pro" && user.subscription?.status === "active";
  const countryName = COUNTRIES.find((c) => c.code === user.country)?.name;
  const steps = completionSteps(user);
  const doneCount = steps.filter((s) => s.done).length;
  const completionPct = Math.round((doneCount / steps.length) * 100);

  async function handlePhotoChange(url: string) {
    try {
      await api.patch("/profile/photo", { photoUrl: url });
      await refreshUser();
    } catch {
      // PhotoUpload component shows its own error
    }
  }

  return (
    <div className="max-w-2xl mx-auto px-4 sm:px-6 py-10 sm:py-16">
      <div className="flex items-center gap-5 mb-6">
        <PhotoUpload
          currentUrl={user.photoUrl}
          onChange={handlePhotoChange}
          size={80}
        />
        <div>
          <h1 className="font-display text-3xl text-ink">{user.fullName}</h1>
          <p className="text-ink-soft mt-0.5 text-sm">
            A complete profile means more tailored results across every feature.
          </p>
        </div>
      </div>

      {/* Completion meter */}
      <div className="case-card p-5 mt-6">
        <div className="flex items-center justify-between mb-2">
          <p className="text-sm font-medium text-ink">Profile completeness</p>
          <span className="font-mono text-sm text-forest">{completionPct}%</span>
        </div>
        <div className="h-2 bg-rule rounded-full overflow-hidden mb-4">
          <div
            className="h-full bg-forest rounded-full transition-all duration-500"
            style={{ width: `${completionPct}%` }}
          />
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
          {steps.map(({ label, done }) => (
            <div key={label} className="flex items-center gap-2 text-xs">
              <span className={done ? "text-forest" : "text-rule-strong"}>
                {done ? "✓" : "○"}
              </span>
              <span className={done ? "text-ink-soft" : "text-slate"}>{label}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Plan */}
      <div className="case-card p-5 mt-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <p className="text-xs font-mono uppercase text-slate tracking-widest">Plan</p>
          <p className="font-medium text-ink mt-1">
            {isPro ? "Pro" : "Free"}
            {isPro && user.subscription.currentPeriodEnd && (
              <span className="text-xs text-slate font-mono ml-2 font-normal">
                renews {new Date(user.subscription.currentPeriodEnd).toLocaleDateString()}
              </span>
            )}
          </p>
        </div>
        {isPro ? (
          <Link href="/pricing" className="text-sm text-forest hover:underline">Manage billing →</Link>
        ) : (
          <Link href="/pricing" className="btn-primary text-sm px-4 py-2">Upgrade to Pro</Link>
        )}
      </div>

      {/* Personal details */}
      <form onSubmit={handleSaveProfile} className="mt-10 space-y-5">
        <h2 className="font-display text-xl text-ink border-b border-rule pb-3">Personal details</h2>

        <div>
          <label className="block text-sm font-medium text-ink mb-1.5">Full name</label>
          <input required value={fullName} onChange={(e) => setFullName(e.target.value)} className="input" />
        </div>
        <div>
          <label className="block text-sm font-medium text-ink mb-1.5">Email</label>
          <input value={user.email} disabled className="input" />
          <p className="text-xs text-slate mt-1.5">Email cannot be changed.</p>
        </div>
        <div>
          <label className="block text-sm font-medium text-ink mb-1.5">Home country</label>
          <select required value={country} onChange={(e) => setCountry(e.target.value)} className="input">
            <option value="">Select…</option>
            {COUNTRIES.map((c) => (
              <option key={c.code} value={c.code}>{c.name}</option>
            ))}
          </select>
          {countryName && (
            <p className="text-xs text-slate mt-1.5">
              Payment: {user.subscription?.gateway === "paystack" ? "Paystack" : country ? "Stripe" : "—"} · {countryName}
            </p>
          )}
        </div>
        {profileMsg && msgBox(profileMsg)}
        <button type="submit" disabled={savingProfile} className="btn-primary">
          {savingProfile ? "Saving…" : "Save details"}
        </button>
      </form>

      {/* Study goals */}
      <form onSubmit={handleSaveGoals} className="mt-10 space-y-6">
        <div className="border-b border-rule pb-3">
          <h2 className="font-display text-xl text-ink">Study goals</h2>
          <p className="text-xs text-slate mt-1">
            Used to tailor your Roadmap, Readiness Score, and mentor answers.
          </p>
        </div>

        <div>
          <label className="block text-sm font-medium text-ink mb-3">
            Where do you want to study?{" "}
            <span className="text-slate font-normal">(select all that apply)</span>
          </label>
          <div className="flex flex-wrap gap-2">
            {STUDY_DESTINATIONS.map((c) => (
              <button
                key={c}
                type="button"
                onClick={() => toggleCountry(c)}
                className={`text-sm px-3 py-1.5 border rounded-md transition-colors ${targetCountries.includes(c)
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
            What do you want to study?{" "}
            <span className="text-slate font-normal">(select all that apply)</span>
          </label>
          <div className="flex flex-wrap gap-2">
            {STUDY_FIELDS.map((f) => (
              <button
                key={f}
                type="button"
                onClick={() => toggleField(f)}
                className={`text-sm px-3 py-1.5 border rounded-md transition-colors ${targetFields.includes(f)
                    ? "bg-forest text-white border-forest"
                    : "border-rule text-ink-soft hover:border-forest hover:text-forest"
                  }`}
              >
                {f}
              </button>
            ))}
          </div>
          {targetFields.length === 0 && (
            <p className="text-xs text-slate mt-2">Select your field to unlock field-matched scholarship recommendations.</p>
          )}
        </div>

        <div className="grid sm:grid-cols-2 gap-5">
          <div>
            <label className="block text-sm font-medium text-ink mb-1.5">Target degree level</label>
            <select
              value={targetDegreeLevel}
              onChange={(e) => setTargetDegreeLevel(e.target.value)}
              className="input"
            >
              <option value="">Select…</option>
              {DEGREE_LEVELS.map((d) => <option key={d} value={d}>{d}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-ink mb-1.5">Target start date</label>
            <select
              value={targetStartDate}
              onChange={(e) => setTargetStartDate(e.target.value)}
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
              min={0}
              value={annualBudgetUSD}
              onChange={(e) => setAnnualBudgetUSD(e.target.value)}
              placeholder="e.g. 15000"
              className="input"
            />
            <p className="text-xs text-slate mt-1.5">How much can you spend per year? Helps filter opportunities.</p>
          </div>
        </div>

        {goalsMsg && msgBox(goalsMsg)}
        <button type="submit" disabled={savingGoals} className="btn-primary">
          {savingGoals ? "Saving…" : "Save study goals"}
        </button>
      </form>

      {/* Test scores */}
      <form onSubmit={handleSaveScores} className="mt-10 space-y-5">
        <div className="border-b border-rule pb-3">
          <h2 className="font-display text-xl text-ink">Test scores</h2>
          <p className="text-xs text-slate mt-1">
            Leave blank if you haven't taken a test yet. Used to calculate your Readiness Score and tailor mentor advice.
          </p>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
          {[
            { key: "ielts", label: "IELTS", val: ielts, set: setIelts, placeholder: "e.g. 7.0", step: "0.5", min: "0", max: "9" },
            { key: "toefl", label: "TOEFL iBT", val: toefl, set: setToefl, placeholder: "e.g. 100", step: "1", min: "0", max: "120" },
            { key: "gre", label: "GRE", val: gre, set: setGre, placeholder: "e.g. 320", step: "1", min: "260", max: "340" },
            { key: "gmat", label: "GMAT", val: gmat, set: setGmat, placeholder: "e.g. 650", step: "10", min: "200", max: "800" },
            { key: "sat", label: "SAT", val: sat, set: setSat, placeholder: "e.g. 1300", step: "10", min: "400", max: "1600" },
            { key: "duolingo", label: "Duolingo English", val: duolingo, set: setDuolingo, placeholder: "e.g. 120", step: "5", min: "10", max: "160" },
          ].map(({ key, label, val, set, placeholder, step, min, max }) => (
            <div key={key}>
              <label className="block text-xs font-mono text-slate uppercase tracking-wider mb-1.5">{label}</label>
              <input
                type="number"
                value={val}
                onChange={(e) => set(e.target.value)}
                placeholder={placeholder}
                step={step}
                min={min}
                max={max}
                className="input"
              />
            </div>
          ))}
        </div>

        {scoresMsg && msgBox(scoresMsg)}
        <button type="submit" disabled={savingScores} className="btn-primary">
          {savingScores ? "Saving…" : "Save test scores"}
        </button>
      </form>

      {/* CV section */}
      <div className="mt-10 case-card p-5">
        <div className="flex items-start justify-between gap-4">
          <div>
            <h2 className="font-display text-xl text-ink">Your CV</h2>
            <p className="text-xs text-slate mt-1">
              Your CV provides the richest context — education, experience, skills, and languages — used across all features.
            </p>
          </div>
          <Link href="/cv" className="btn-secondary text-sm shrink-0">
            {user.cvData ? "Update CV" : "Upload CV"} →
          </Link>
        </div>
        {user.cvData ? (
          <div className="mt-3 flex items-center gap-2">
            <span className="text-forest text-sm">✓</span>
            <span className="text-sm text-ink-soft">
              CV parsed ·{" "}
              {user.cvData.parsedAt
                ? new Date(user.cvData.parsedAt).toLocaleDateString()
                : "date unknown"}
            </span>
          </div>
        ) : (
          <p className="mt-3 text-sm text-brass">No CV uploaded yet — this is the single biggest thing you can do to improve your experience.</p>
        )}
      </div>

      {/* Security */}
      <form onSubmit={handleChangePassword} className="mt-10 space-y-5">
        <h2 className="font-display text-xl text-ink border-b border-rule pb-3">Change Password</h2>
        <div>
          <label className="block text-sm font-medium text-ink mb-1.5">Current Password</label>
          <input type="password" required value={currentPassword} onChange={(e) => setCurrentPassword(e.target.value)} className="input" placeholder="••••••••" />
        </div>
        <div>
          <label className="block text-sm font-medium text-ink mb-1.5">New Password</label>
          <input type="password" required minLength={8} value={newPassword} onChange={(e) => setNewPassword(e.target.value)} className="input" placeholder="At least 8 characters" />
        </div>
        {passwordMsg && msgBox(passwordMsg)}
        <button type="submit" disabled={savingPassword} className="btn-primary">
          {savingPassword ? "Updating…" : "Update Password"}
        </button>
      </form>
    </div>
  );
}
