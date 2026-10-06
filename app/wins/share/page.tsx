"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Trophy } from "lucide-react";
import { api, ApiError } from "@/lib/api";
import { useAuth } from "@/lib/auth-context";
import PhotoUpload from "@/components/PhotoUpload";
import Link from "next/link";
import { PageHeader } from "@/components/ui/PageHeader";
import { SkeletonPage } from "@/components/ui/Skeleton";
import { Alert } from "@/components/ui/States";

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

  if (authLoading) return <SkeletonPage variant="form" />;

  if (done) {
    return (
      <div className="page-narrow">
        <div className="card card-pad py-12 text-center">
          <Trophy size={48} className="mx-auto mb-4 text-forest" aria-hidden="true" />
          <h1 className="h2">Congratulations</h1>
          <p className="mx-auto mt-3 max-w-sm leading-relaxed text-ink-soft">
            Your win has been shared. It will show up on the wins wall so other students can see what is possible.
          </p>
          <div className="mt-8 flex flex-col justify-center gap-3 sm:flex-row">
            <Link href="/wins" className="btn-primary">See the wins wall</Link>
            <Link href="/dashboard" className="btn-secondary">Back to dashboard</Link>
          </div>
        </div>
      </div>
    );
  }

  const charCount = form.message.length;
  const charLimit = 600;

  return (
    <div className="page-narrow">
      <PageHeader
        back={{ href: "/wins", label: "Wins wall" }}
        eyebrow="Share your win"
        title="You made it. Tell your story."
        description="Your experience is proof to the next person that it is possible. No pressure, just your own words."
      />

      <form onSubmit={handleSubmit} className="card card-pad space-y-5">
        <fieldset>
          <legend className="label">
            Your photo <span className="font-normal text-slate">(optional, shows on the wins wall)</span>
          </legend>
          <div className="mt-2">
            <PhotoUpload
              currentUrl={form.photoUrl || undefined}
              onChange={(url) => setForm((p) => ({ ...p, photoUrl: url }))}
              size={80}
            />
          </div>
        </fieldset>

        <div>
          <label htmlFor="w-name" className="label">Your first name (shown publicly)</label>
          <input id="w-name" required autoComplete="given-name" value={form.displayName} onChange={(e) => setForm((p) => ({ ...p, displayName: e.target.value }))} placeholder="First name" className="input" />
        </div>

        <div>
          <label htmlFor="w-type" className="label">What type of award?</label>
          <select id="w-type" value={form.awardType} onChange={(e) => setForm((p) => ({ ...p, awardType: e.target.value }))} className="input">
            {AWARD_TYPES.map((t) => (
              <option key={t.value} value={t.value}>{t.label}</option>
            ))}
          </select>
        </div>

        <div>
          <label htmlFor="w-title" className="label">Name of the scholarship or programme</label>
          <input id="w-title" required value={form.opportunityTitle} onChange={(e) => setForm((p) => ({ ...p, opportunityTitle: e.target.value }))} placeholder="e.g. Chevening Scholarship 2025" className="input" />
        </div>

        <div>
          <label htmlFor="w-provider" className="label">
            Provider <span className="font-normal text-slate">(optional)</span>
          </label>
          <input id="w-provider" value={form.opportunityProvider} onChange={(e) => setForm((p) => ({ ...p, opportunityProvider: e.target.value }))} placeholder="e.g. UK Government / FCDO" className="input" />
        </div>

        <div>
          <label htmlFor="w-message" className="label">Your message: what would you tell someone still preparing?</label>
          <textarea
            id="w-message"
            required
            rows={5}
            value={form.message}
            onChange={(e) => setForm((p) => ({ ...p, message: e.target.value }))}
            placeholder="Keep it real. What helped you? What was harder than you expected? What do you wish you had known?"
            aria-describedby="w-count"
            className={`textarea ${charCount > charLimit ? "!border-danger" : ""}`}
          />
          <p id="w-count" className={`mt-1.5 text-right text-sm ${charCount > charLimit ? "font-semibold text-danger" : "text-slate"}`}>
            {charCount}/{charLimit}
            {charCount < 20 && charCount > 0 ? " (write at least 20 characters)" : ""}
          </p>
        </div>

        {error && <Alert variant="danger">{error}</Alert>}

        <div>
          <button type="submit" disabled={submitting || charCount > charLimit || charCount < 20} aria-busy={submitting} className="btn-primary btn-block">
            {submitting ? "Sharing" : "Share my win"}
          </button>
          <p className="help text-center">Visible to everyone on the wins wall. Your country is shown, but not your email or surname.</p>
        </div>
      </form>
    </div>
  );
}
