"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { api, ApiError } from "@/lib/api";
import { useAuth } from "@/lib/auth-context";
import { Opportunity } from "@/lib/types";
import PhotoUpload from "@/components/PhotoUpload";
import { CircleCheck, Search } from "lucide-react";
import { PageHeader } from "@/components/ui/PageHeader";
import { Skeleton, SkeletonPage } from "@/components/ui/Skeleton";
import { Alert } from "@/components/ui/States";

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

  if (authLoading) return <SkeletonPage variant="form" />;
  if (!user) return null;

  if (done) {
    return (
      <div className="page-narrow">
        <div className="card card-pad py-12 text-center">
          <span className="mx-auto mb-5 flex h-14 w-14 items-center justify-center rounded-full bg-ok-soft text-ok">
            <CircleCheck size={28} aria-hidden="true" />
          </span>
          <h1 className="h2">Application submitted</h1>
          <p className="mx-auto mt-3 max-w-md leading-relaxed text-ink-soft">
            Our team will review your application and verify your credentials. You will hear back within a few days.
          </p>
          <button type="button" onClick={() => router.push("/")} className="btn-primary mt-8">
            Back to catalogue
          </button>
        </div>
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
    <div className="page-narrow">
      <PageHeader
        eyebrow="Human coaching"
        title="Apply to be a coach"
        description="We verify that all coaches are either scholarship alumni or have sat on selection panels. Once approved, your profile appears on the relevant scholarship pages and you receive session bookings through the platform."
      />

      <Alert variant="info" className="mb-8">
        <p><span className="font-semibold">Revenue split:</span> You set your session fee. The platform retains a percentage (typically 20%) and you receive the rest.</p>
        <p className="mt-1"><span className="font-semibold">Verification:</span> We may ask for evidence of your scholarship award or panel role before approving your profile.</p>
      </Alert>

      {error && <Alert variant="danger" className="mb-5">{error}</Alert>}

      <form onSubmit={handleSubmit} className="card card-pad space-y-7">
        <div className="grid gap-5 sm:grid-cols-2">
          <div>
            <label htmlFor="ca-name" className="label">Full name</label>
            <input id="ca-name" required autoComplete="name" value={form.name} onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))} className="input" placeholder="Dr. Amina Kolade" />
          </div>
          <div>
            <label htmlFor="ca-linkedin" className="label">LinkedIn profile URL <span className="font-normal text-slate">(optional)</span></label>
            <input id="ca-linkedin" type="url" inputMode="url" value={form.linkedIn} onChange={(e) => setForm((f) => ({ ...f, linkedIn: e.target.value }))} className="input" placeholder="https://linkedin.com/in/" />
          </div>
        </div>

        <fieldset>
          <legend className="label">Profile photo <span className="font-normal text-slate">(optional)</span></legend>
          <div className="mt-2">
            <PhotoUpload currentUrl={form.photoUrl || undefined} onChange={(url) => setForm((f) => ({ ...f, photoUrl: url }))} size={88} />
          </div>
        </fieldset>

        <fieldset>
          <legend className="label">Your credential</legend>
          <div className="mt-2 flex flex-col gap-3 sm:flex-row" role="radiogroup">
            {[
              { value: "alumni", label: "Scholarship alumnus or alumna", sub: "I won this scholarship" },
              { value: "panel_member", label: "Selection panel member", sub: "I sit or sat on the review committee" },
            ].map((opt) => {
              const selected = form.credential === opt.value;
              return (
                <button
                  key={opt.value}
                  type="button"
                  role="radio"
                  aria-checked={selected}
                  onClick={() => setForm((f) => ({ ...f, credential: opt.value as any }))}
                  className={`min-h-touch flex-1 rounded-xl p-4 text-left transition-colors ${
                    selected ? "bg-forest-soft ring-2 ring-forest" : "bg-white ring-1 ring-inset ring-control hover:bg-surface-2"
                  }`}
                >
                  <span className="block text-sm font-semibold text-ink">{opt.label}</span>
                  <span className="mt-0.5 block text-sm text-slate">{opt.sub}</span>
                </button>
              );
            })}
          </div>
        </fieldset>

        <div>
          <label htmlFor="ca-year" className="label">Year of scholarship or panel service</label>
          <input
            id="ca-year"
            type="number"
            inputMode="numeric"
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
          <label htmlFor="ca-fee" className="label">Your session fee (USD)</label>
          <div className="relative">
            <span className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-slate" aria-hidden="true">$</span>
            <input
              id="ca-fee"
              type="number"
              inputMode="decimal"
              required
              min={0}
              max={10000}
              value={form.sessionFeeUSD}
              onChange={(e) => setForm((f) => ({ ...f, sessionFeeUSD: e.target.value }))}
              className="input pl-8"
              placeholder="150"
              aria-describedby="ca-fee-help"
            />
          </div>
          <p id="ca-fee-help" className="help">This is what you charge per session. The platform fee (typically 20%) is added on top when students book.</p>
        </div>

        <div>
          <label htmlFor="ca-bio" className="label">Bio</label>
          <textarea
            id="ca-bio"
            required
            minLength={50}
            maxLength={1000}
            rows={4}
            value={form.bio}
            onChange={(e) => setForm((f) => ({ ...f, bio: e.target.value }))}
            className="textarea"
            placeholder="I was a 2022 Chevening Scholar studying Public Policy at the University of Edinburgh. I specialised in"
            aria-describedby="ca-bio-help"
          />
          <p id="ca-bio-help" className="help flex justify-between">
            <span>Tell students about your background. Be specific about your scholarship experience.</span>
            <span>{form.bio.length}/1000</span>
          </p>
        </div>

        <fieldset>
          <legend className="label">
            Which scholarships can you coach for? <span className="font-normal text-slate">({selectedIds.length} selected)</span>
          </legend>
          <label htmlFor="ca-search" className="sr-only">Search scholarships</label>
          <div className="relative mt-2 mb-3">
            <Search size={16} className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-slate" aria-hidden="true" />
            <input id="ca-search" value={oppSearch} onChange={(e) => setOppSearch(e.target.value)} className="input pl-10" placeholder="Search scholarships" />
          </div>
          <div className="max-h-60 divide-y divide-rule overflow-y-auto rounded-xl bg-surface">
            {opportunities.length === 0 && (
              <div className="space-y-3 p-4" role="status" aria-label="Loading scholarships">
                {[0, 1, 2, 3].map((i) => <Skeleton key={i} className="h-5 w-full" />)}
              </div>
            )}
            {opportunities.length > 0 && filtered.length === 0 && <p className="px-4 py-3 text-sm text-slate">No scholarships found.</p>}
            {filtered.map((o) => (
              <label
                key={o._id}
                className={`flex min-h-touch cursor-pointer items-center gap-3 px-4 py-3 transition-colors ${
                  selectedIds.includes(o._id) ? "bg-forest-soft" : "hover:bg-surface-2"
                }`}
              >
                <input type="checkbox" checked={selectedIds.includes(o._id)} onChange={() => toggleOpp(o._id)} className="h-5 w-5 shrink-0 accent-forest" />
                <span className="min-w-0">
                  <span className="block truncate text-sm font-medium text-ink">{o.title}</span>
                  <span className="block truncate text-sm text-slate">{o.provider} · {o.country}</span>
                </span>
              </label>
            ))}
          </div>
        </fieldset>

        <div>
          <label htmlFor="ca-note" className="label">Why you are qualified</label>
          <textarea
            id="ca-note"
            required
            minLength={100}
            maxLength={2000}
            rows={6}
            value={form.applicationNote}
            onChange={(e) => setForm((f) => ({ ...f, applicationNote: e.target.value }))}
            className="textarea"
            placeholder="During my Chevening application I"
            aria-describedby="ca-note-help"
          />
          <p id="ca-note-help" className="help flex justify-between gap-4">
            <span>Describe what made you successful, what the committee was looking for, and what mistakes you see applicants make. At least 100 characters.</span>
            <span className="shrink-0">{form.applicationNote.length}/2000</span>
          </p>
        </div>

        <button type="submit" disabled={submitting} aria-busy={submitting} className="btn-primary btn-block">
          {submitting ? "Submitting" : "Submit coach application"}
        </button>
      </form>
    </div>
  );
}
