"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { api, ApiError } from "@/lib/api";
import { useAuth } from "@/lib/auth-context";
import { CVData } from "@/lib/types";
import { Alert } from "@/components/ui/States";
import { FileUp } from "lucide-react";
import { PageHeader } from "@/components/ui/PageHeader";
import { SkeletonPage } from "@/components/ui/Skeleton";
import { ProgressBar } from "@/components/ui/Spinner";

export default function CvPage() {
  const { user, loading: authLoading, refreshUser } = useAuth();
  const router = useRouter();
  const fileInput = useRef<HTMLInputElement>(null);
  const parsedRef = useRef<HTMLDivElement>(null);

  const [cvData, setCvData] = useState<CVData | null>(null);
  const [uploading, setUploading] = useState(false);
  const [uploadDone, setUploadDone] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loadingCv, setLoadingCv] = useState(true);

  useEffect(() => {
    if (!authLoading && !user) {
      router.push("/login");
    }
  }, [authLoading, user, router]);

  useEffect(() => {
    if (!user) return;
    api
      .get<{ cvData: CVData }>("/cv")
      .then((data) => setCvData(data.cvData))
      .catch(() => setCvData(null))
      .finally(() => setLoadingCv(false));
  }, [user]);

  async function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploading(true);
    setError(null);

    const formData = new FormData();
    formData.append("cv", file);

    try {
      const data = await api.post<{ cvData: CVData }>("/cv/upload", formData);
      setCvData(data.cvData);
      setUploadDone(true);
      await refreshUser();
      setTimeout(() => parsedRef.current?.scrollIntoView({ behavior: "smooth", block: "start" }), 100);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Couldn't process that CV. Please try again.");
    } finally {
      setUploading(false);
      if (fileInput.current) fileInput.current.value = "";
    }
  }

  if (authLoading || loadingCv) return <SkeletonPage variant="form" />;

  const pills = (items: string[]) =>
    items.length === 0 ? (
      <p className="mt-2 text-sm text-slate">Nothing extracted.</p>
    ) : (
      <ul className="mt-3 flex flex-wrap gap-2">
        {items.map((s) => (
          <li key={s} className="badge">{s}</li>
        ))}
      </ul>
    );

  return (
    <div className="page-narrow">
      <PageHeader
        eyebrow="Your record"
        title="CV and background"
        description="Everything your coaching and essay reviews are built on comes from here. Upload a PDF CV and we will extract your education, experience and skills. Check the result afterwards, because coaching quality depends on it being accurate."
      />

      <section className="card card-pad" aria-labelledby="cv-upload-heading">
        <div className="flex flex-col items-start gap-4 sm:flex-row sm:items-center">
          <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-forest-soft text-forest">
            <FileUp size={22} aria-hidden="true" />
          </span>
          <div className="min-w-0 flex-1">
            <h2 id="cv-upload-heading" className="h3">{cvData ? "Replace your CV" : "Upload your CV"}</h2>
            <p className="help">PDF only. We read it and fill in your profile.</p>
          </div>
          <label
            className={`btn-primary cursor-pointer focus-within:outline focus-within:outline-2 focus-within:outline-offset-2 focus-within:outline-forest ${
              uploading ? "pointer-events-none is-loading" : ""
            }`}
          >
            {uploading ? "Reading your CV" : cvData ? "Choose a new PDF" : "Choose a PDF"}
            <input
              ref={fileInput}
              type="file"
              accept="application/pdf"
              onChange={handleFileChange}
              disabled={uploading}
              className="sr-only"
            />
          </label>
        </div>

        {uploading && (
          <div className="mt-5">
            <ProgressBar label="Reading and structuring your CV" />
            <p className="mt-2 text-sm text-slate">Reading and structuring your CV. This can take a moment.</p>
          </div>
        )}
        {error && <Alert variant="danger" className="mt-4">{error}</Alert>}
        {uploadDone && !uploading && (
          <Alert variant="ok" className="mt-4">CV parsed and your profile is updated. The data appears below.</Alert>
        )}
        {cvData && !uploading && (
          <p className="mt-4 text-sm text-slate">
            Last parsed {new Date(cvData.parsedAt).toLocaleString()} · {cvData.sourceFileName}
          </p>
        )}
      </section>

      {cvData && (
        <div ref={parsedRef} className="mt-10 space-y-10">
          <section>
            <h2 className="h2">Summary</h2>
            <p className="mt-3 max-w-prose leading-relaxed text-ink-soft">{cvData.summary || "No summary extracted."}</p>
          </section>

          <section>
            <h2 className="h2">Education</h2>
            <ul className="mt-3 space-y-3">
              {cvData.education.length === 0 && <li className="text-sm text-slate">Nothing extracted.</li>}
              {cvData.education.map((e, i) => (
                <li key={i} className="card p-4">
                  <p className="font-semibold text-ink">
                    {e.degree}, {e.fieldOfStudy}
                  </p>
                  <p className="text-sm text-slate">
                    {e.institution}
                    {e.startYear || e.endYear ? ` · ${e.startYear ?? "?"}-${e.endYear ?? "present"}` : ""}
                    {e.gpa ? ` · ${e.gpa}` : ""}
                  </p>
                </li>
              ))}
            </ul>
          </section>

          <section>
            <h2 className="h2">Work experience</h2>
            <ul className="mt-3 space-y-3">
              {cvData.experience.length === 0 && <li className="text-sm text-slate">Nothing extracted.</li>}
              {cvData.experience.map((e, i) => (
                <li key={i} className="card p-4">
                  <p className="font-semibold text-ink">{e.role}, {e.organization}</p>
                  <p className="text-sm text-slate">
                    {e.startDate ?? "?"} to {e.isCurrent ? "present" : e.endDate ?? "?"}
                  </p>
                  {e.description && <p className="mt-1.5 text-sm text-ink-soft">{e.description}</p>}
                </li>
              ))}
            </ul>
          </section>

          {(cvData.volunteerExperience?.length ?? 0) > 0 && (
            <section>
              <h2 className="h2">Volunteer and community</h2>
              <ul className="mt-3 space-y-3">
                {cvData.volunteerExperience.map((e, i) => (
                  <li key={i} className="card p-4">
                    <p className="font-semibold text-ink">{e.role}, {e.organization}</p>
                    <p className="text-sm text-slate">
                      {e.startDate ?? "?"} to {e.isCurrent ? "present" : e.endDate ?? "?"}
                    </p>
                    {e.description && <p className="mt-1.5 text-sm text-ink-soft">{e.description}</p>}
                  </li>
                ))}
              </ul>
            </section>
          )}

          <section className="grid gap-8 sm:grid-cols-3">
            <div>
              <h2 className="h3">Skills</h2>
              {pills(cvData.skills)}
            </div>
            <div>
              <h2 className="h3">Certifications</h2>
              {pills(cvData.certifications)}
            </div>
            <div>
              <h2 className="h3">Languages</h2>
              {pills(cvData.languages)}
            </div>
          </section>
        </div>
      )}
    </div>
  );
}
