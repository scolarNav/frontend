"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { api, ApiError } from "@/lib/api";
import { useAuth } from "@/lib/auth-context";
import PhotoUpload from "@/components/PhotoUpload";

const AWARD_TYPES = [
  { value: "scholarship", label: "Scholarship" },
  { value: "study_program", label: "Study Programme" },
  { value: "fellowship", label: "Fellowship" },
  { value: "incubator", label: "Incubator" },
  { value: "immigration_pathway", label: "Visa / Pathway" },
];

export default function ShareWinPage() {
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();

  const [form, setForm] = useState({
    displayName: "",
    opportunityTitle: "",
    opportunityProvider: "",
    awardType: "scholarship",
    message: "",
    photoUrl: "",
  });
  const [submitting, setSubmitting] = useState(false);
  const [done, setDone] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!authLoading && !user) router.push("/login");
  }, [authLoading, user, router]);

  useEffect(() => {
    if (user) {
      setForm((prev) => ({ ...prev, displayName: user.fullName.split(" ")[0] }));
    }
  }, [user]);

  // Pre-fill from awarded saved opportunity if only one
  useEffect(() => {
    if (!user) return;
    const awarded = user.savedOpportunities?.filter((s) => s.status === "awarded") ?? [];
    if (awarded.length === 1) {
      setForm((prev) => ({ ...prev, opportunityTitle: (awarded[0] as any).opportunityTitle ?? "" }));
    }
  }, [user]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    setError(null);
    try {
      await api.post("/celebrations", form);
      setDone(true);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Couldn't submit right now. Please try again.");
    } finally {
      setSubmitting(false);
    }
  }

  if (authLoading) return null;

  if (done) {
    return (
      <div className="min-h-[70vh] flex items-center justify-center px-4" style={{ backgroundColor: "#1a2d45" }}>
        <div className="text-center max-w-sm">
          <p className="text-5xl mb-4">🎉</p>
          <h1 className="font-display text-3xl text-white">Congratulations!</h1>
          <p className="text-white/60 mt-3 leading-relaxed">
            Your win has been shared. It'll show up on the wins wall so other students can see what's possible.
          </p>
          <div className="flex flex-col sm:flex-row gap-3 justify-center mt-8">
            <a href="/wins" className="px-5 py-2.5 bg-brass text-white text-sm font-medium hover:opacity-90 transition-opacity">
              See the wins wall →
            </a>
            <a href="/dashboard" className="px-5 py-2.5 border border-white/20 text-white/70 text-sm hover:border-white/40 hover:text-white transition-colors">
              Back to dashboard
            </a>
          </div>
        </div>
      </div>
    );
  }

  const charCount = form.message.length;
  const charLimit = 600;

  return (
    <div className="min-h-screen" style={{ backgroundColor: "#1a2d45" }}>
      <div className="max-w-xl mx-auto px-4 sm:px-6 pt-14 pb-20">
        <a href="/wins" className="text-white/40 text-xs font-mono hover:text-white/60 transition-colors">
          ← Wins wall
        </a>

        <div className="mt-6">
          <p className="font-mono text-xs tracking-widest uppercase text-brass mb-2">Share your win</p>
          <h1 className="font-display text-3xl sm:text-4xl text-white leading-tight">
            You made it.<br />Tell your story.
          </h1>
          <p className="text-white/50 mt-3 text-sm leading-relaxed">
            Your experience is proof to the next person that it's possible. No pressure — just your own words.
          </p>
        </div>

        <form onSubmit={handleSubmit} className="mt-10 space-y-5">
          <div>
            <label className="block text-xs font-mono text-white/40 uppercase tracking-widest mb-3">
              Your photo <span className="normal-case text-white/25">(optional — shows on the wins wall)</span>
            </label>
            <PhotoUpload
              currentUrl={form.photoUrl || undefined}
              onChange={(url) => setForm((p) => ({ ...p, photoUrl: url }))}
              size={80}
              dark
            />
          </div>

          <div>
            <label className="block text-xs font-mono text-white/40 uppercase tracking-widest mb-2">
              Your first name (shown publicly)
            </label>
            <input
              required
              value={form.displayName}
              onChange={(e) => setForm((p) => ({ ...p, displayName: e.target.value }))}
              placeholder="First name"
              className="w-full bg-white/5 border border-white/10 px-4 py-3 text-white placeholder-white/20 focus:border-brass focus:bg-white/8 outline-none text-sm transition-colors"
            />
          </div>

          <div>
            <label className="block text-xs font-mono text-white/40 uppercase tracking-widest mb-2">
              What type of award?
            </label>
            <select
              value={form.awardType}
              onChange={(e) => setForm((p) => ({ ...p, awardType: e.target.value }))}
              className="w-full bg-white/5 border border-white/10 px-4 py-3 text-white focus:border-brass outline-none text-sm transition-colors"
              style={{ backgroundColor: "rgba(255,255,255,0.05)" }}
            >
              {AWARD_TYPES.map((t) => (
                <option key={t.value} value={t.value} style={{ backgroundColor: "#1a2d45" }}>
                  {t.label}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-xs font-mono text-white/40 uppercase tracking-widest mb-2">
              Name of the scholarship / programme
            </label>
            <input
              required
              value={form.opportunityTitle}
              onChange={(e) => setForm((p) => ({ ...p, opportunityTitle: e.target.value }))}
              placeholder="e.g. Chevening Scholarship 2025"
              className="w-full bg-white/5 border border-white/10 px-4 py-3 text-white placeholder-white/20 focus:border-brass outline-none text-sm transition-colors"
            />
          </div>

          <div>
            <label className="block text-xs font-mono text-white/40 uppercase tracking-widest mb-2">
              Provider (optional)
            </label>
            <input
              value={form.opportunityProvider}
              onChange={(e) => setForm((p) => ({ ...p, opportunityProvider: e.target.value }))}
              placeholder="e.g. UK Government / FCDO"
              className="w-full bg-white/5 border border-white/10 px-4 py-3 text-white placeholder-white/20 focus:border-brass outline-none text-sm transition-colors"
            />
          </div>

          <div>
            <label className="block text-xs font-mono text-white/40 uppercase tracking-widest mb-2">
              Your message — what would you tell someone still preparing?
            </label>
            <textarea
              required
              rows={5}
              value={form.message}
              onChange={(e) => setForm((p) => ({ ...p, message: e.target.value }))}
              placeholder="Keep it real. What helped you? What was harder than you expected? What do you wish you'd known?"
              className={`w-full bg-white/5 border px-4 py-3 text-white placeholder-white/20 outline-none text-sm leading-relaxed transition-colors resize-none ${
                charCount > charLimit ? "border-alert" : "border-white/10 focus:border-brass"
              }`}
            />
            <p className={`text-xs font-mono mt-1 text-right ${charCount > charLimit ? "text-alert" : "text-white/30"}`}>
              {charCount}/{charLimit}
            </p>
          </div>

          {error && (
            <p className="text-alert text-sm bg-red-950/40 border border-alert/30 px-4 py-3">{error}</p>
          )}

          <button
            type="submit"
            disabled={submitting || charCount > charLimit || charCount < 20}
            className="w-full bg-brass text-white py-3 text-sm font-medium hover:opacity-90 transition-opacity disabled:opacity-40"
          >
            {submitting ? "Sharing…" : "Share my win"}
          </button>

          <p className="text-xs text-white/30 font-mono text-center">
            Visible to everyone on the wins wall. Your country is shown but not your email or surname.
          </p>
        </form>
      </div>
    </div>
  );
}
