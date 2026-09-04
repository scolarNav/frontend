"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { api, ApiError } from "@/lib/api";
import { useAuth } from "@/lib/auth-context";
import { CVData } from "@/lib/types";

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

  if (authLoading || loadingCv) {
    return <p className="max-w-3xl mx-auto px-6 py-20 text-slate font-mono text-sm">Loading…</p>;
  }

  return (
    <div className="max-w-3xl mx-auto px-6 py-14">
      <p className="font-mono text-xs tracking-widest uppercase text-brass">Your Record</p>
      <h1 className="font-display text-4xl text-ink mt-2">CV & background</h1>
      <p className="text-ink-soft mt-3 leading-relaxed">
        Everything your coaching and essay reviews are built on comes from here. Upload a PDF CV and
        we'll extract your education, experience, and skills — check it over afterward, since coaching
        quality depends entirely on this being accurate.
      </p>

      <div className="mt-8 case-card p-6">
        <label className="block">
          <span className="stamp text-forest border-forest inline-block mb-3">
            {cvData ? "Replace CV" : "Upload CV (PDF)"}
          </span>
          <input
            ref={fileInput}
            type="file"
            accept="application/pdf"
            onChange={handleFileChange}
            disabled={uploading}
            className="block w-full text-sm file:mr-4 file:py-2 file:px-4 file:border file:border-rule file:bg-paper file:text-ink-soft file:text-sm disabled:opacity-50"
          />
        </label>
        {uploading && (
          <p className="text-sm text-slate font-mono mt-3">Reading and structuring your CV — this can take a moment…</p>
        )}
        {error && <p className="text-alert text-sm mt-3">{error}</p>}
        {uploadDone && !uploading && (
          <p className="text-sm text-forest font-mono mt-3">CV parsed — your profile is updated. The data appears below.</p>
        )}
        {cvData && !uploading && (
          <p className="text-xs text-slate font-mono mt-3">
            Last parsed: {new Date(cvData.parsedAt).toLocaleString()} · {cvData.sourceFileName}
          </p>
        )}
      </div>

      {cvData && (
        <div ref={parsedRef} className="mt-10 space-y-8">
          <section>
            <h2 className="font-display text-2xl text-ink border-b border-rule pb-2">Summary</h2>
            <p className="text-ink-soft mt-3 leading-relaxed">{cvData.summary || "No summary extracted."}</p>
          </section>

          <section>
            <h2 className="font-display text-2xl text-ink border-b border-rule pb-2">Education</h2>
            <div className="mt-3 space-y-3">
              {cvData.education.length === 0 && <p className="text-slate text-sm">Nothing extracted.</p>}
              {cvData.education.map((e, i) => (
                <div key={i} className="case-card p-4">
                  <p className="font-medium text-ink">
                    {e.degree} — {e.fieldOfStudy}
                  </p>
                  <p className="text-sm text-slate">
                    {e.institution}
                    {e.startYear || e.endYear ? ` · ${e.startYear ?? "?"}–${e.endYear ?? "present"}` : ""}
                    {e.gpa ? ` · ${e.gpa}` : ""}
                  </p>
                </div>
              ))}
            </div>
          </section>

          <section>
            <h2 className="font-display text-2xl text-ink border-b border-rule pb-2">Work Experience</h2>
            <div className="mt-3 space-y-3">
              {cvData.experience.length === 0 && <p className="text-slate text-sm">Nothing extracted.</p>}
              {cvData.experience.map((e, i) => (
                <div key={i} className="case-card p-4">
                  <p className="font-medium text-ink">{e.role} — {e.organization}</p>
                  <p className="text-sm text-slate">
                    {e.startDate ?? "?"} – {e.isCurrent ? "present" : e.endDate ?? "?"}
                  </p>
                  {e.description && <p className="text-sm text-ink-soft mt-1.5">{e.description}</p>}
                </div>
              ))}
            </div>
          </section>

          {(cvData.volunteerExperience?.length ?? 0) > 0 && (
            <section>
              <h2 className="font-display text-2xl text-ink border-b border-rule pb-2">Volunteer & Community</h2>
              <div className="mt-3 space-y-3">
                {cvData.volunteerExperience.map((e, i) => (
                  <div key={i} className="case-card p-4">
                    <p className="font-medium text-ink">{e.role} — {e.organization}</p>
                    <p className="text-sm text-slate">
                      {e.startDate ?? "?"} – {e.isCurrent ? "present" : e.endDate ?? "?"}
                    </p>
                    {e.description && <p className="text-sm text-ink-soft mt-1.5">{e.description}</p>}
                  </div>
                ))}
              </div>
            </section>
          )}

          <section className="grid sm:grid-cols-3 gap-6">
            <div>
              <h3 className="font-display text-lg text-ink">Skills</h3>
              <div className="flex flex-wrap gap-1.5 mt-2">
                {cvData.skills.map((s) => (
                  <span key={s} className="text-xs border border-rule px-2 py-0.5">
                    {s}
                  </span>
                ))}
              </div>
            </div>
            <div>
              <h3 className="font-display text-lg text-ink">Certifications</h3>
              <div className="flex flex-wrap gap-1.5 mt-2">
                {cvData.certifications.map((s) => (
                  <span key={s} className="text-xs border border-rule px-2 py-0.5">
                    {s}
                  </span>
                ))}
              </div>
            </div>
            <div>
              <h3 className="font-display text-lg text-ink">Languages</h3>
              <div className="flex flex-wrap gap-1.5 mt-2">
                {cvData.languages.map((s) => (
                  <span key={s} className="text-xs border border-rule px-2 py-0.5">
                    {s}
                  </span>
                ))}
              </div>
            </div>
          </section>
        </div>
      )}
    </div>
  );
}
