"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { api, ApiError } from "@/lib/api";
import { useAuth } from "@/lib/auth-context";
import { Opportunity } from "@/lib/types";
import PhotoUpload from "@/components/PhotoUpload";

const API_BASE = process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000/api";

export default function CoachApplyPage() {
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();

  const [opportunities, setOpportunities] = useState<Opportunity[]>([]);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [oppSearch, setOppSearch] = useState("");

  const [form, setForm] = useState({
    name: "",
    bio: "",
    photoUrl: "",
    credential: "alumni" as "alumni" | "panel_member",
    credentialYear: "",
    sessionFeeUSD: "",
    linkedIn: "",
    applicationNote: "",
  });

  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);

  useEffect(() => {
    if (!authLoading && !user) router.push("/login?next=/coaches/apply");
  }, [authLoading, user, router]);

  useEffect(() => {
    if (!user) return;
    // Load all active scholarships alphabetically so coaches can select upcoming/closed ones too
    fetch(`${API_BASE}/opportunities?sort=alpha&limit=500`)
      .then((r) => r.json())
      .then((d) => setOpportunities(d.opportunities ?? []))
      .catch(() => {});
  }, [user]);

  function toggleOpp(id: string) {
    setSelectedIds((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
    );
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!selectedIds.length) { setError("Select at least one scholarship you can coach for."); return; }
    if (!form.applicationNote.trim() || form.applicationNote.length < 100) {
      setError("Your application note must be at least 100 characters.");
      return;
    }

    setSubmitting(true);
    setError(null);
    try {
      await api.post("/coaches/apply", {
        ...form,
        credentialYear: form.credentialYear ? Number(form.credentialYear) : undefined,
        sessionFeeUSD: Number(form.sessionFeeUSD) || 0,
        photoUrl: form.photoUrl || undefined,
        linkedIn: form.linkedIn || undefined,
        opportunityIds: selectedIds,
      });
      setDone(true);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Submission failed. Try again.");
    } finally {
      setSubmitting(false);
    }
  }

  if (authLoading) return <p className="max-w-2xl mx-auto px-6 py-20 text-slate text-sm font-mono">Loading…</p>;
  if (!user) return null;

  if (done) {
    return (
      <div className="max-w-xl mx-auto px-6 py-20 text-center">
        <div className="w-14 h-14 rounded-full bg-forest/10 flex items-center justify-center mx-auto mb-5">
          <span className="text-2xl text-forest">✓</span>
        </div>
        <h1 className="font-display text-3xl text-ink mb-3">Application submitted</h1>
        <p className="text-ink-soft leading-relaxed">
          Our team will review your application and verify your credentials. You'll hear back within a few days.
        </p>
        <button onClick={() => router.push("/")} className="btn-primary mt-8">
          Back to catalogue
        </button>
      </div>
    );
  }

  const q = oppSearch.toLowerCase();
  const filtered = opportunities.filter((o) =>
    !q ||
    o.title.toLowerCase().includes(q) ||
    (o.provider ?? "").toLowerCase().includes(q) ||
    (o.country ?? "").toLowerCase().includes(q)
  );

  return (
    <div className="max-w-2xl mx-auto px-6 py-14">
      <p className="font-mono text-xs tracking-widest uppercase text-slate mb-2">Human Coaching</p>
      <h1 className="font-display text-4xl text-ink mb-3">Apply to be a coach</h1>
      <p className="text-ink-soft mb-2 leading-relaxed">
        We verify that all coaches are either scholarship alumni or have sat on selection panels. Once approved,
        your profile will appear on the relevant scholarship pages and you'll receive session bookings through the platform.
      </p>
      <div className="mb-8 p-4 rounded-xl border border-rule bg-canvas text-sm text-ink-soft space-y-1">
        <p><span className="font-medium text-ink">Revenue split:</span> You set your session fee. The platform retains a percentage (typically 20%) and you receive the rest.</p>
        <p><span className="font-medium text-ink">Verification:</span> We may ask for evidence of your scholarship award or panel role before approving your profile.</p>
      </div>

      {error && <p className="text-alert text-sm mb-5 p-3 bg-alert/5 rounded-lg border border-alert/20">{error}</p>}

      <form onSubmit={handleSubmit} className="space-y-7">
        <div className="grid sm:grid-cols-2 gap-5">
          <div>
            <label className="block text-sm font-medium text-ink mb-1.5">Full name *</label>
            <input
              required
              value={form.name}
              onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
              className="input"
              placeholder="Dr. Amina Kolade"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-ink mb-1.5">LinkedIn profile URL</label>
            <input
              value={form.linkedIn}
              onChange={(e) => setForm((f) => ({ ...f, linkedIn: e.target.value }))}
              className="input"
              placeholder="https://linkedin.com/in/…"
            />
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-ink mb-2">Profile photo <span className="text-slate font-normal">(optional)</span></label>
          <PhotoUpload
            currentUrl={form.photoUrl || undefined}
            onChange={(url) => setForm((f) => ({ ...f, photoUrl: url }))}
            size={88}
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-ink mb-2">Your credential *</label>
          <div className="flex gap-3">
            {[
              { value: "alumni", label: "Scholarship alumnus/alumna", sub: "I won this scholarship" },
              { value: "panel_member", label: "Selection panel member", sub: "I sit / sat on the review committee" },
            ].map((opt) => (
              <button
                key={opt.value}
                type="button"
                onClick={() => setForm((f) => ({ ...f, credential: opt.value as any }))}
                className={`flex-1 text-left p-3.5 rounded-xl border transition-colors ${
                  form.credential === opt.value
                    ? "border-forest bg-forest/5"
                    : "border-rule hover:border-forest"
                }`}
              >
                <p className="text-sm font-medium text-ink">{opt.label}</p>
                <p className="text-xs text-slate mt-0.5">{opt.sub}</p>
              </button>
            ))}
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-ink mb-1.5">
            Year of scholarship / panel service *
          </label>
          <input
            type="number"
            required
            min={1980}
            max={new Date().getFullYear()}
            value={form.credentialYear}
            onChange={(e) => setForm((f) => ({ ...f, credentialYear: e.target.value }))}
            className="input"
            placeholder={String(new Date().getFullYear())}
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-ink mb-1.5">Your session fee (USD) *</label>
          <p className="text-xs text-slate mb-2">This is what you charge per session. The platform fee (typically 20%) is added on top when users book.</p>
          <div className="relative">
            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate text-sm">$</span>
            <input
              type="number"
              required
              min={0}
              max={10000}
              value={form.sessionFeeUSD}
              onChange={(e) => setForm((f) => ({ ...f, sessionFeeUSD: e.target.value }))}
              className="input pl-7"
              placeholder="150"
            />
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-ink mb-1.5">Bio *</label>
          <p className="text-xs text-slate mb-2">Tell scholars about your background. Be specific about your scholarship experience.</p>
          <textarea
            required
            minLength={50}
            maxLength={1000}
            rows={4}
            value={form.bio}
            onChange={(e) => setForm((f) => ({ ...f, bio: e.target.value }))}
            className="input resize-none"
            placeholder="I was a 2022 Chevening Scholar studying Public Policy at the University of Edinburgh. I specialised in…"
          />
          <p className="text-xs text-slate mt-1 text-right">{form.bio.length}/1000</p>
        </div>

        <div>
          <label className="block text-sm font-medium text-ink mb-2">
            Which scholarships can you coach for? * <span className="text-slate font-normal">({selectedIds.length} selected)</span>
          </label>
          <input
            value={oppSearch}
            onChange={(e) => setOppSearch(e.target.value)}
            className="input mb-3"
            placeholder="Search scholarships…"
          />
          <div className="max-h-52 overflow-y-auto border border-rule rounded-xl divide-y divide-rule">
            {filtered.length === 0 && (
              <p className="px-4 py-3 text-sm text-slate">No scholarships found.</p>
            )}
            {filtered.map((o) => (
              <label
                key={o._id}
                className={`flex items-center gap-3 px-4 py-3 cursor-pointer transition-colors ${
                  selectedIds.includes(o._id) ? "bg-forest/5" : "hover:bg-canvas"
                }`}
              >
                <input
                  type="checkbox"
                  checked={selectedIds.includes(o._id)}
                  onChange={() => toggleOpp(o._id)}
                  className="accent-forest w-4 h-4 shrink-0"
                />
                <div className="min-w-0">
                  <p className="text-sm font-medium text-ink truncate">{o.title}</p>
                  <p className="text-xs text-slate truncate">{o.provider} · {o.country}</p>
                </div>
              </label>
            ))}
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-ink mb-1.5">Why you're qualified *</label>
          <p className="text-xs text-slate mb-2">
            Describe your scholarship experience in detail — what made you successful, what the committee was looking for,
            what mistakes you see applicants make. Minimum 100 characters.
          </p>
          <textarea
            required
            minLength={100}
            maxLength={2000}
            rows={6}
            value={form.applicationNote}
            onChange={(e) => setForm((f) => ({ ...f, applicationNote: e.target.value }))}
            className="input resize-none"
            placeholder="During my Chevening application I…"
          />
          <p className="text-xs text-slate mt-1 text-right">{form.applicationNote.length}/2000</p>
        </div>

        <button type="submit" disabled={submitting} className="btn-primary w-full">
          {submitting ? "Submitting…" : "Submit coach application"}
        </button>
      </form>
    </div>
  );
}
