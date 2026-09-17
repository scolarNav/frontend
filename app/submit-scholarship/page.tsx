"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { api, ApiError } from "@/lib/api";
import { useAuth } from "@/lib/auth-context";

const TYPES = ["scholarship", "study_program", "immigration_pathway", "incubator", "fellowship"] as const;
const DEGREE_LEVELS = ["undergraduate", "masters", "phd", "postdoc", "professional", "none"] as const;

export default function SubmitScholarshipPage() {
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();

  const [form, setForm] = useState({
    title: "",
    provider: "",
    type: "scholarship",
    country: "",
    region: "",
    fieldsOfStudy: "",
    degreeLevel: "masters",
    deadline: "",
    applicationOpens: "",
    fundingCoverage: "",
    objectives: "",
    eligibilitySummary: "",
    officialUrl: "",
    notes: "",
  });

  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  function set(field: string, value: string) {
    setForm((prev) => ({ ...prev, [field]: value }));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setSubmitting(true);

    try {
      await api.post("/submissions", {
        title: form.title,
        provider: form.provider,
        type: form.type,
        country: form.country,
        region: form.region || undefined,
        fieldsOfStudy: form.fieldsOfStudy.split(",").map((s) => s.trim()).filter(Boolean),
        degreeLevel: form.degreeLevel,
        deadline: form.deadline || undefined,
        applicationOpens: form.applicationOpens || undefined,
        fundingCoverage: form.fundingCoverage || undefined,
        objectives: form.objectives || undefined,
        eligibilitySummary: form.eligibilitySummary || undefined,
        officialUrl: form.officialUrl,
        notes: form.notes || undefined,
      });
      setSuccess(true);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Failed to submit. Please try again.");
    } finally {
      setSubmitting(false);
    }
  }

  if (authLoading) {
    return <p className="max-w-2xl mx-auto px-4 py-20 text-slate font-mono text-sm">Loading…</p>;
  }

  if (!user) {
    return (
      <div className="max-w-2xl mx-auto px-4 py-20 text-center">
        <p className="text-ink-soft mb-4">You need to be logged in to submit a scholarship.</p>
        <button onClick={() => router.push("/login")} className="btn-primary">Log in</button>
      </div>
    );
  }

  if (success) {
    return (
      <div className="max-w-2xl mx-auto px-4 py-20">
        <div className="case-card p-8 text-center space-y-4">
          <div className="w-12 h-12 rounded-full bg-forest/10 flex items-center justify-center mx-auto">
            <svg className="w-6 h-6 text-forest" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            </svg>
          </div>
          <h2 className="font-display text-2xl text-ink">Submission received</h2>
          <p className="text-ink-soft leading-relaxed">
            Thank you — our team will review your submission. Once approved it goes live on the platform and you'll earn a free AI analysis credit.
          </p>
          <div className="flex gap-3 justify-center pt-2">
            <button
              onClick={() => { setSuccess(false); setForm({ title: "", provider: "", type: "scholarship", country: "", region: "", fieldsOfStudy: "", degreeLevel: "masters", deadline: "", applicationOpens: "", fundingCoverage: "", objectives: "", eligibilitySummary: "", officialUrl: "", notes: "" }); }}
              className="border border-rule text-ink-soft px-4 py-2 text-sm hover:border-forest hover:text-forest transition-colors"
            >
              Submit another
            </button>
            <button onClick={() => router.push("/opportunities")} className="bg-forest text-paper px-4 py-2 text-sm hover:bg-forest-light transition-colors">
              Browse scholarships
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto px-4 sm:px-6 py-8 sm:py-14">
      <p className="font-mono text-xs tracking-widest uppercase text-brass">Community</p>
      <h1 className="font-display text-2xl sm:text-4xl text-ink mt-2">Submit a scholarship</h1>
      <p className="text-ink-soft mt-3 leading-relaxed">
        Know of a scholarship we're missing? Submit it here — our team reviews every submission and approved ones go live on the platform. You'll earn a free AI analysis credit for each approved submission.
      </p>

      {error && (
        <div className="mt-5 border border-alert bg-alert/5 px-4 py-3 flex items-start justify-between gap-3">
          <p className="text-alert text-sm">{error}</p>
          <button onClick={() => setError(null)} className="text-alert text-xs shrink-0">✕</button>
        </div>
      )}

      <form onSubmit={handleSubmit} className="mt-8 space-y-6">
        {/* Core info */}
        <div className="space-y-4">
          <h2 className="font-display text-lg text-ink border-b border-rule pb-2">Basic information</h2>

          <div>
            <label className="text-xs font-mono uppercase text-slate block mb-1">Scholarship / opportunity title *</label>
            <input
              required
              value={form.title}
              onChange={(e) => set("title", e.target.value)}
              placeholder="e.g. Chevening Scholarship"
              className="w-full border border-rule px-3 py-2 text-sm bg-transparent focus:border-forest outline-none"
            />
          </div>

          <div className="grid sm:grid-cols-2 gap-4">
            <div>
              <label className="text-xs font-mono uppercase text-slate block mb-1">Provider / organization *</label>
              <input
                required
                value={form.provider}
                onChange={(e) => set("provider", e.target.value)}
                placeholder="e.g. UK Foreign Office"
                className="w-full border border-rule px-3 py-2 text-sm bg-transparent focus:border-forest outline-none"
              />
            </div>
            <div>
              <label className="text-xs font-mono uppercase text-slate block mb-1">Host country *</label>
              <input
                required
                value={form.country}
                onChange={(e) => set("country", e.target.value)}
                placeholder="e.g. United Kingdom"
                className="w-full border border-rule px-3 py-2 text-sm bg-transparent focus:border-forest outline-none"
              />
            </div>
          </div>

          <div className="grid sm:grid-cols-2 gap-4">
            <div>
              <label className="text-xs font-mono uppercase text-slate block mb-1">Type *</label>
              <select
                value={form.type}
                onChange={(e) => set("type", e.target.value)}
                className="w-full border border-rule px-3 py-2 text-sm bg-paper focus:border-forest outline-none"
              >
                {TYPES.map((t) => (
                  <option key={t} value={t}>{t.replace(/_/g, " ")}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="text-xs font-mono uppercase text-slate block mb-1">Degree level *</label>
              <select
                value={form.degreeLevel}
                onChange={(e) => set("degreeLevel", e.target.value)}
                className="w-full border border-rule px-3 py-2 text-sm bg-paper focus:border-forest outline-none"
              >
                {DEGREE_LEVELS.map((d) => (
                  <option key={d} value={d}>{d}</option>
                ))}
              </select>
            </div>
          </div>

          <div>
            <label className="text-xs font-mono uppercase text-slate block mb-1">Fields of study * <span className="normal-case text-slate">(comma-separated)</span></label>
            <input
              required
              value={form.fieldsOfStudy}
              onChange={(e) => set("fieldsOfStudy", e.target.value)}
              placeholder="e.g. Engineering, Sciences, Social Sciences"
              className="w-full border border-rule px-3 py-2 text-sm bg-transparent focus:border-forest outline-none"
            />
          </div>

          <div>
            <label className="text-xs font-mono uppercase text-slate block mb-1">Official URL *</label>
            <input
              required
              type="url"
              value={form.officialUrl}
              onChange={(e) => set("officialUrl", e.target.value)}
              placeholder="https://..."
              className="w-full border border-rule px-3 py-2 text-sm bg-transparent focus:border-forest outline-none"
            />
          </div>
        </div>

        {/* Dates & funding */}
        <div className="space-y-4">
          <h2 className="font-display text-lg text-ink border-b border-rule pb-2">Dates & funding <span className="text-slate text-sm font-sans">(optional)</span></h2>

          <div className="grid sm:grid-cols-2 gap-4">
            <div>
              <label className="text-xs font-mono uppercase text-slate block mb-1">Application opens</label>
              <input
                type="date"
                value={form.applicationOpens}
                onChange={(e) => set("applicationOpens", e.target.value)}
                className="w-full border border-rule px-3 py-2 text-sm bg-transparent focus:border-forest outline-none"
              />
            </div>
            <div>
              <label className="text-xs font-mono uppercase text-slate block mb-1">Deadline</label>
              <input
                type="date"
                value={form.deadline}
                onChange={(e) => set("deadline", e.target.value)}
                className="w-full border border-rule px-3 py-2 text-sm bg-transparent focus:border-forest outline-none"
              />
            </div>
          </div>

          <div>
            <label className="text-xs font-mono uppercase text-slate block mb-1">Funding coverage</label>
            <input
              value={form.fundingCoverage}
              onChange={(e) => set("fundingCoverage", e.target.value)}
              placeholder="e.g. Full tuition + living stipend + flights"
              className="w-full border border-rule px-3 py-2 text-sm bg-transparent focus:border-forest outline-none"
            />
          </div>
        </div>

        {/* Details */}
        <div className="space-y-4">
          <h2 className="font-display text-lg text-ink border-b border-rule pb-2">Details <span className="text-slate text-sm font-sans">(optional but helpful)</span></h2>

          <div>
            <label className="text-xs font-mono uppercase text-slate block mb-1">Objectives / about the programme</label>
            <textarea
              rows={3}
              value={form.objectives}
              onChange={(e) => set("objectives", e.target.value)}
              placeholder="What is this scholarship for? Who funds it? What's its mission?"
              className="w-full border border-rule px-3 py-2 text-sm bg-transparent focus:border-forest outline-none resize-none"
            />
          </div>

          <div>
            <label className="text-xs font-mono uppercase text-slate block mb-1">Eligibility summary</label>
            <textarea
              rows={3}
              value={form.eligibilitySummary}
              onChange={(e) => set("eligibilitySummary", e.target.value)}
              placeholder="Who can apply? Nationality, degree, GPA requirements, etc."
              className="w-full border border-rule px-3 py-2 text-sm bg-transparent focus:border-forest outline-none resize-none"
            />
          </div>

          <div>
            <label className="text-xs font-mono uppercase text-slate block mb-1">Notes for reviewer</label>
            <textarea
              rows={2}
              value={form.notes}
              onChange={(e) => set("notes", e.target.value)}
              placeholder="Anything else our team should know — e.g. how you found it, if it recurs annually, etc."
              className="w-full border border-rule px-3 py-2 text-sm bg-transparent focus:border-forest outline-none resize-none"
              maxLength={1000}
            />
          </div>
        </div>

        <div className="pt-2">
          <button
            type="submit"
            disabled={submitting}
            className="bg-forest text-paper px-6 py-3 text-sm hover:bg-forest-light transition-colors disabled:opacity-60 w-full sm:w-auto"
          >
            {submitting ? "Submitting…" : "Submit for review"}
          </button>
          <p className="text-xs text-slate mt-3">
            Submissions are reviewed by our team before going live. You'll earn 1 AI analysis credit for each approved submission.
          </p>
        </div>
      </form>
    </div>
  );
}
