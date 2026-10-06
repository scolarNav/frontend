"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { api, ApiError } from "@/lib/api";
import { useAuth } from "@/lib/auth-context";
import { Alert, EmptyState } from "@/components/ui/States";
import { CircleCheck } from "lucide-react";
import { PageHeader } from "@/components/ui/PageHeader";
import { SkeletonPage } from "@/components/ui/Skeleton";

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

  if (authLoading) return <SkeletonPage variant="form" />;

  if (!user) {
    return (
      <div className="page-narrow">
        <EmptyState
          title="Sign in to submit a scholarship"
          description="You need an account so we can credit your approved submissions."
          action={<button type="button" onClick={() => router.push("/login")} className="btn-primary">Sign in</button>}
        />
      </div>
    );
  }

  if (success) {
    return (
      <div className="page-narrow">
        <div className="card card-pad space-y-4 py-10 text-center">
          <span className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-ok-soft text-ok">
            <CircleCheck size={24} aria-hidden="true" />
          </span>
          <h1 className="h2">Submission received</h1>
          <p className="mx-auto max-w-md leading-relaxed text-ink-soft">
            Thank you. Our team will review your submission. Once approved it goes live on the platform and you earn a free AI analysis credit.
          </p>
          <div className="flex flex-wrap justify-center gap-3 pt-2">
            <button
              type="button"
              onClick={() => { setSuccess(false); setForm({ title: "", provider: "", type: "scholarship", country: "", region: "", fieldsOfStudy: "", degreeLevel: "masters", deadline: "", applicationOpens: "", fundingCoverage: "", objectives: "", eligibilitySummary: "", officialUrl: "", notes: "" }); }}
              className="btn-secondary"
            >
              Submit another
            </button>
            <button type="button" onClick={() => router.push("/opportunities")} className="btn-primary">
              Browse scholarships
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="page-narrow">
      <PageHeader
        eyebrow="Community"
        title="Submit a scholarship"
        description="Know of a scholarship we are missing? Submit it here. Our team reviews every submission, and approved ones go live on the platform. You earn a free AI analysis credit for each approved submission."
      />

      {error && (
        <div className="mb-5">
          <Alert variant="danger">{error}</Alert>
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-6">
        <fieldset className="card card-pad space-y-4">
          <legend className="sr-only">Basic information</legend>
          <h2 className="h3">Basic information</h2>

          <div>
            <label htmlFor="s-title" className="label">Scholarship or opportunity title</label>
            <input id="s-title" required value={form.title} onChange={(e) => set("title", e.target.value)} placeholder="e.g. Chevening Scholarship" className="input" />
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label htmlFor="s-provider" className="label">Provider or organization</label>
              <input id="s-provider" required value={form.provider} onChange={(e) => set("provider", e.target.value)} placeholder="e.g. UK Foreign Office" className="input" />
            </div>
            <div>
              <label htmlFor="s-country" className="label">Host country</label>
              <input id="s-country" required value={form.country} onChange={(e) => set("country", e.target.value)} placeholder="e.g. United Kingdom" className="input" />
            </div>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label htmlFor="s-type" className="label">Type</label>
              <select id="s-type" value={form.type} onChange={(e) => set("type", e.target.value)} className="input capitalize">
                {TYPES.map((t) => (
                  <option key={t} value={t}>{t.replace(/_/g, " ")}</option>
                ))}
              </select>
            </div>
            <div>
              <label htmlFor="s-level" className="label">Degree level</label>
              <select id="s-level" value={form.degreeLevel} onChange={(e) => set("degreeLevel", e.target.value)} className="input capitalize">
                {DEGREE_LEVELS.map((d) => (
                  <option key={d} value={d}>{d}</option>
                ))}
              </select>
            </div>
          </div>

          <div>
            <label htmlFor="s-fields" className="label">Fields of study</label>
            <input id="s-fields" required value={form.fieldsOfStudy} onChange={(e) => set("fieldsOfStudy", e.target.value)} placeholder="e.g. Engineering, Sciences, Social Sciences" className="input" />
            <p className="help">Separate fields with commas.</p>
          </div>

          <div>
            <label htmlFor="s-url" className="label">Official URL</label>
            <input id="s-url" required type="url" inputMode="url" value={form.officialUrl} onChange={(e) => set("officialUrl", e.target.value)} placeholder="https://" className="input" />
          </div>
        </fieldset>

        <fieldset className="card card-pad space-y-4">
          <legend className="sr-only">Dates and funding</legend>
          <h2 className="h3">Dates and funding <span className="text-sm font-normal text-slate">(optional)</span></h2>

          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label htmlFor="s-opens" className="label">Application opens</label>
              <input id="s-opens" type="date" value={form.applicationOpens} onChange={(e) => set("applicationOpens", e.target.value)} className="input" />
            </div>
            <div>
              <label htmlFor="s-deadline" className="label">Deadline</label>
              <input id="s-deadline" type="date" value={form.deadline} onChange={(e) => set("deadline", e.target.value)} className="input" />
            </div>
          </div>

          <div>
            <label htmlFor="s-funding" className="label">Funding coverage</label>
            <input id="s-funding" value={form.fundingCoverage} onChange={(e) => set("fundingCoverage", e.target.value)} placeholder="e.g. Full tuition, living stipend and flights" className="input" />
          </div>
        </fieldset>

        <fieldset className="card card-pad space-y-4">
          <legend className="sr-only">Details</legend>
          <h2 className="h3">Details <span className="text-sm font-normal text-slate">(optional but helpful)</span></h2>

          <div>
            <label htmlFor="s-objectives" className="label">About the programme</label>
            <textarea id="s-objectives" rows={3} value={form.objectives} onChange={(e) => set("objectives", e.target.value)} placeholder="What is this scholarship for? Who funds it? What is its mission?" className="textarea" />
          </div>

          <div>
            <label htmlFor="s-eligibility" className="label">Eligibility summary</label>
            <textarea id="s-eligibility" rows={3} value={form.eligibilitySummary} onChange={(e) => set("eligibilitySummary", e.target.value)} placeholder="Who can apply? Nationality, degree, GPA requirements and so on." className="textarea" />
          </div>

          <div>
            <label htmlFor="s-notes" className="label">Notes for the reviewer</label>
            <textarea id="s-notes" rows={2} maxLength={1000} value={form.notes} onChange={(e) => set("notes", e.target.value)} placeholder="Anything else our team should know, such as how you found it or whether it repeats every year." className="textarea" />
          </div>
        </fieldset>

        <div>
          <button type="submit" disabled={submitting} aria-busy={submitting} className="btn-primary btn-block sm:w-auto">
            {submitting ? "Submitting" : "Submit for review"}
          </button>
          <p className="help">Submissions are reviewed by our team before going live. You earn 1 AI analysis credit for each approved submission.</p>
        </div>
      </form>
    </div>
  );
}
