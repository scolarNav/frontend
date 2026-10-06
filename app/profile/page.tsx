"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { api, ApiError } from "@/lib/api";
import { useAuth } from "@/lib/auth-context";
import { COUNTRIES } from "@/lib/countries";
import { User, UserProfile } from "@/lib/types";
import PhotoUpload from "@/components/PhotoUpload";
import { Alert } from "@/components/ui/States";
import { CircleCheck, Circle } from "lucide-react";
import { PageHeader } from "@/components/ui/PageHeader";
import { SkeletonPage } from "@/components/ui/Skeleton";
import { Chip } from "@/components/ui/Chip";

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
  const { user, loading: authLoading, refreshUser, logout } = useAuth();
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

  // Delete account
  const [showDeleteZone, setShowDeleteZone] = useState(false);
  const [deletePassword, setDeletePassword] = useState("");
  const [deleteConfirm, setDeleteConfirm] = useState("");
  const [deleting, setDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);

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
    return <Alert variant={msg.type === "ok" ? "ok" : "danger"}>{msg.text}</Alert>;
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

  async function handleDeleteAccount(e: React.FormEvent) {
    e.preventDefault();
    if (deleteConfirm !== "DELETE") {
      setDeleteError("Type DELETE exactly to confirm.");
      return;
    }
    setDeleting(true);
    setDeleteError(null);
    try {
      await api.delete("/auth/account", deletePassword ? { password: deletePassword } : undefined);
      logout();
      router.push("/");
    } catch (err) {
      setDeleteError(err instanceof ApiError ? err.message : "Deletion failed. Please try again.");
      setDeleting(false);
    }
  }

  if (authLoading) return <SkeletonPage variant="form" />;
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

  const scoreFields = [
    { key: "ielts", label: "IELTS", val: ielts, set: setIelts, placeholder: "e.g. 7.0", step: "0.5", min: "0", max: "9" },
    { key: "toefl", label: "TOEFL iBT", val: toefl, set: setToefl, placeholder: "e.g. 100", step: "1", min: "0", max: "120" },
    { key: "gre", label: "GRE", val: gre, set: setGre, placeholder: "e.g. 320", step: "1", min: "260", max: "340" },
    { key: "gmat", label: "GMAT", val: gmat, set: setGmat, placeholder: "e.g. 650", step: "10", min: "200", max: "800" },
    { key: "sat", label: "SAT", val: sat, set: setSat, placeholder: "e.g. 1300", step: "10", min: "400", max: "1600" },
    { key: "duolingo", label: "Duolingo English", val: duolingo, set: setDuolingo, placeholder: "e.g. 120", step: "5", min: "10", max: "160" },
  ];

  return (
    <div className="page-narrow">
      <PageHeader
        eyebrow="Account"
        title="Profile"
        description="A complete profile means more tailored results across every feature."
      />

      <div className="space-y-6">
        {/* Identity and completeness */}
        <section className="card card-pad">
          <div className="flex items-center gap-5">
            <PhotoUpload currentUrl={user.photoUrl} onChange={handlePhotoChange} size={80} />
            <div className="min-w-0">
              <p className="h3 truncate">{user.fullName}</p>
              <p className="truncate text-sm text-slate">{user.email}</p>
            </div>
          </div>

          <div className="mt-6">
            <div className="mb-2 flex items-center justify-between">
              <p className="text-sm font-semibold text-ink">Profile completeness</p>
              <span className="text-sm font-semibold text-forest">{completionPct}%</span>
            </div>
            <div className="h-2 overflow-hidden rounded-full bg-surface-2" role="progressbar" aria-valuenow={completionPct} aria-valuemin={0} aria-valuemax={100} aria-label="Profile completeness">
              <div className="h-full rounded-full bg-forest transition-all duration-500" style={{ width: `${completionPct}%` }} />
            </div>
            <ul className="mt-4 grid grid-cols-2 gap-x-4 gap-y-2 sm:grid-cols-3">
              {steps.map(({ label, done }) => (
                <li key={label} className="flex items-center gap-2 text-sm">
                  {done ? (
                    <CircleCheck size={16} className="shrink-0 text-ok" aria-hidden="true" />
                  ) : (
                    <Circle size={16} className="shrink-0 text-control" aria-hidden="true" />
                  )}
                  <span className={done ? "text-ink-soft" : "text-slate"}>
                    {label}
                    <span className="sr-only">{done ? " (done)" : " (not done)"}</span>
                  </span>
                </li>
              ))}
            </ul>
          </div>
        </section>

        {/* Plan */}
        <section className="card card-pad flex flex-col justify-between gap-3 sm:flex-row sm:items-center">
          <div>
            <p className="eyebrow">Plan</p>
            <p className="mt-1 font-semibold text-ink">
              {isPro ? "Pro" : "Free"}
              {isPro && user.subscription.currentPeriodEnd && (
                <span className="ml-2 text-sm font-normal text-slate">
                  renews {new Date(user.subscription.currentPeriodEnd).toLocaleDateString()}
                </span>
              )}
            </p>
          </div>
          {isPro ? (
            <Link href="/pricing" className="btn-secondary">Manage billing</Link>
          ) : (
            <Link href="/pricing" className="btn-primary">Upgrade to Pro</Link>
          )}
        </section>

        {/* Personal details */}
        <form onSubmit={handleSaveProfile} className="card card-pad space-y-5">
          <h2 className="h3">Personal details</h2>

          <div>
            <label htmlFor="p-name" className="label">Full name</label>
            <input id="p-name" required autoComplete="name" value={fullName} onChange={(e) => setFullName(e.target.value)} className="input" />
          </div>
          <div>
            <label htmlFor="p-email" className="label">Email</label>
            <input id="p-email" value={user.email} disabled className="input" />
            <p className="help">Email cannot be changed.</p>
          </div>
          <div>
            <label htmlFor="p-country" className="label">Home country</label>
            <select id="p-country" required value={country} onChange={(e) => setCountry(e.target.value)} className="input">
              <option value="">Select your country</option>
              {COUNTRIES.map((c) => (
                <option key={c.code} value={c.code}>{c.name}</option>
              ))}
            </select>
            {countryName && (
              <p className="help">
                Payment: {user.subscription?.gateway === "paystack" ? "Paystack" : country ? "Stripe" : "not set"} · {countryName}
              </p>
            )}
          </div>
          {profileMsg && msgBox(profileMsg)}
          <button type="submit" disabled={savingProfile} aria-busy={savingProfile} className="btn-primary">
            {savingProfile ? "Saving" : "Save details"}
          </button>
        </form>

        {/* Study goals */}
        <form onSubmit={handleSaveGoals} className="card card-pad space-y-6">
          <div>
            <h2 className="h3">Study goals</h2>
            <p className="help">Used to tailor your roadmap, readiness score and mentor answers.</p>
          </div>

          <fieldset>
            <legend className="label">
              Where do you want to study? <span className="font-normal text-slate">(select all that apply)</span>
            </legend>
            <div className="mt-2 flex flex-wrap gap-2">
              {STUDY_DESTINATIONS.map((c) => (
                <Chip key={c} active={targetCountries.includes(c)} onClick={() => toggleCountry(c)}>{c}</Chip>
              ))}
            </div>
          </fieldset>

          <fieldset>
            <legend className="label">
              What do you want to study? <span className="font-normal text-slate">(select all that apply)</span>
            </legend>
            <div className="mt-2 flex flex-wrap gap-2">
              {STUDY_FIELDS.map((f) => (
                <Chip key={f} active={targetFields.includes(f)} onClick={() => toggleField(f)}>{f}</Chip>
              ))}
            </div>
            {targetFields.length === 0 && <p className="help">Select your field to unlock field-matched recommendations.</p>}
          </fieldset>

          <div className="grid gap-5 sm:grid-cols-2">
            <div>
              <label htmlFor="p-level" className="label">Target degree level</label>
              <select id="p-level" value={targetDegreeLevel} onChange={(e) => setTargetDegreeLevel(e.target.value)} className="input">
                <option value="">Select a level</option>
                {DEGREE_LEVELS.map((d) => <option key={d} value={d}>{d}</option>)}
              </select>
            </div>
            <div>
              <label htmlFor="p-start" className="label">Target start date</label>
              <select id="p-start" value={targetStartDate} onChange={(e) => setTargetStartDate(e.target.value)} className="input">
                <option value="">Select a month</option>
                {MONTH_YEARS.map((m) => <option key={m} value={m}>{m}</option>)}
              </select>
            </div>
            <div>
              <label htmlFor="p-budget" className="label">Annual budget (USD)</label>
              <input
                id="p-budget"
                type="number"
                inputMode="numeric"
                min={0}
                value={annualBudgetUSD}
                onChange={(e) => setAnnualBudgetUSD(e.target.value)}
                placeholder="e.g. 15000"
                className="input"
              />
              <p className="help">How much can you spend per year? Helps filter opportunities.</p>
            </div>
          </div>

          {goalsMsg && msgBox(goalsMsg)}
          <button type="submit" disabled={savingGoals} aria-busy={savingGoals} className="btn-primary">
            {savingGoals ? "Saving" : "Save study goals"}
          </button>
        </form>

        {/* Test scores */}
        <form onSubmit={handleSaveScores} className="card card-pad space-y-5">
          <div>
            <h2 className="h3">Test scores</h2>
            <p className="help">Leave blank if you have not taken a test yet. Used for your readiness score and mentor advice.</p>
          </div>

          <div className="grid grid-cols-2 gap-4 sm:grid-cols-3">
            {scoreFields.map(({ key, label, val, set, placeholder, step, min, max }) => (
              <div key={key}>
                <label htmlFor={`score-${key}`} className="label">{label}</label>
                <input
                  id={`score-${key}`}
                  type="number"
                  inputMode="decimal"
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
          <button type="submit" disabled={savingScores} aria-busy={savingScores} className="btn-primary">
            {savingScores ? "Saving" : "Save test scores"}
          </button>
        </form>

        {/* CV */}
        <section className="card card-pad">
          <div className="flex flex-col items-start justify-between gap-4 sm:flex-row">
            <div>
              <h2 className="h3">Your CV</h2>
              <p className="help">Your CV gives the richest context: education, experience, skills and languages. It is used across all features.</p>
            </div>
            <Link href="/cv" className="btn-secondary shrink-0">
              {user.cvData ? "Update CV" : "Upload CV"}
            </Link>
          </div>
          {user.cvData ? (
            <p className="mt-4 flex items-center gap-2 text-sm text-ink-soft">
              <CircleCheck size={16} className="text-ok" aria-hidden="true" />
              CV parsed on {user.cvData.parsedAt ? new Date(user.cvData.parsedAt).toLocaleDateString() : "an unknown date"}
            </p>
          ) : (
            <Alert variant="warn" className="mt-4">No CV uploaded yet. It is the single biggest thing you can do to improve your results.</Alert>
          )}
        </section>

        {/* Security */}
        <form onSubmit={handleChangePassword} className="card card-pad space-y-5">
          <h2 className="h3">Change password</h2>
          <div>
            <label htmlFor="pw-current" className="label">Current password</label>
            <input id="pw-current" type="password" required autoComplete="current-password" value={currentPassword} onChange={(e) => setCurrentPassword(e.target.value)} className="input" />
          </div>
          <div>
            <label htmlFor="pw-new" className="label">New password</label>
            <input id="pw-new" type="password" required minLength={8} autoComplete="new-password" value={newPassword} onChange={(e) => setNewPassword(e.target.value)} className="input" placeholder="At least 8 characters" />
          </div>
          {passwordMsg && msgBox(passwordMsg)}
          <button type="submit" disabled={savingPassword} aria-busy={savingPassword} className="btn-primary">
            {savingPassword ? "Updating" : "Update password"}
          </button>
        </form>

        {/* Danger zone */}
        <section className="card card-pad">
          <h2 className="h3 text-danger">Delete account</h2>
          <p className="help max-w-prose">
            Deleting your account permanently removes your profile, CV, applications and all associated data. This cannot be undone.
          </p>

          {!showDeleteZone ? (
            <button type="button" onClick={() => setShowDeleteZone(true)} className="btn-secondary mt-4 text-danger">
              Delete my account
            </button>
          ) : (
            <form onSubmit={handleDeleteAccount} className="mt-5 space-y-5 rounded-lg bg-danger-soft p-5">
              <p className="text-sm font-semibold text-ink">Confirm account deletion</p>

              <div>
                <label htmlFor="del-pw" className="label">
                  Password <span className="font-normal text-slate">(leave blank if you signed in with Google)</span>
                </label>
                <input id="del-pw" type="password" value={deletePassword} onChange={(e) => setDeletePassword(e.target.value)} className="input" autoComplete="current-password" />
              </div>

              <div>
                <label htmlFor="del-confirm" className="label">
                  Type <span className="font-semibold text-danger">DELETE</span> to confirm
                </label>
                <input id="del-confirm" type="text" value={deleteConfirm} onChange={(e) => setDeleteConfirm(e.target.value)} className="input" placeholder="DELETE" autoComplete="off" />
              </div>

              {deleteError && <Alert variant="danger">{deleteError}</Alert>}

              <div className="flex flex-wrap items-center gap-3">
                <button type="submit" disabled={deleting || deleteConfirm !== "DELETE"} aria-busy={deleting} className="btn-danger">
                  {deleting ? "Deleting" : "Permanently delete account"}
                </button>
                <button
                  type="button"
                  onClick={() => { setShowDeleteZone(false); setDeletePassword(""); setDeleteConfirm(""); setDeleteError(null); }}
                  className="btn-ghost"
                >
                  Cancel
                </button>
              </div>
            </form>
          )}
        </section>
      </div>
    </div>
  );
}
