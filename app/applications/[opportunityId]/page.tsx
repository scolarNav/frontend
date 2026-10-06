"use client";

import { useEffect, useRef, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { api, ApiError } from "@/lib/api";
import { useAuth } from "@/lib/auth-context";
import { Application, EssayDraft, Opportunity, ReferenceLetter } from "@/lib/types";
import UpgradePrompt from "@/components/UpgradePrompt";
import { Alert, ErrorState } from "@/components/ui/States";
import Link from "next/link";
import { ArrowRight, Copy, ExternalLink, Plus, X } from "lucide-react";
import { PageHeader } from "@/components/ui/PageHeader";
import { SkeletonPage } from "@/components/ui/Skeleton";
import { Spinner, ProgressBar } from "@/components/ui/Spinner";
import { ReviewBlock } from "@/components/ui/ReviewBlock";
import { FilePicker } from "@/components/ui/FilePicker";
import { opportunityPath } from "@/lib/paths";

const API_BASE = process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000/api";

export default function ApplicationCoachingPage() {
  const { opportunityId } = useParams<{ opportunityId: string }>();
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();

  const [application, setApplication] = useState<Application | null>(null);
  const [opportunity, setOpportunity] = useState<Opportunity | null>(null);
  const [loading, setLoading] = useState(true);
  const [enriching, setEnriching] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [streamingText, setStreamingText] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [coachingStaleReason, setCoachingStaleReason] = useState<"cv" | "opportunity" | null>(null);
  const streamBoxRef = useRef<HTMLDivElement>(null);

  const [targets, setTargets] = useState<{ program: string; school: string }[]>([{ program: "", school: "" }]);
  const [savingTarget, setSavingTarget] = useState(false);
  const [targetSaved, setTargetSaved] = useState(false);

  const [draftsByPromptId, setDraftsByPromptId] = useState<Record<string, string>>({});
  const [submittingPromptId, setSubmittingPromptId] = useState<string | null>(null);

  const [letterFile, setLetterFile] = useState<File | null>(null);
  const [letterType, setLetterType] = useState<ReferenceLetter["letterType"]>("work");
  const [refereeOrg, setRefereeOrg] = useState("");
  const [uploadingLetter, setUploadingLetter] = useState(false);
  const [rewritingLetterId, setRewritingLetterId] = useState<string | null>(null);

  const [docFilesByDocId, setDocFilesByDocId] = useState<Record<string, File | null>>({});
  const [uploadingDocId, setUploadingDocId] = useState<string | null>(null);
  const [suggestingDocId, setSuggestingDocId] = useState<string | null>(null);

  useEffect(() => {
    if (!authLoading && !user) router.push("/login");
  }, [authLoading, user, router]);

  useEffect(() => {
    if (!user) return;

    async function load() {
      try {
        const oppData = await api.get<{ opportunity: Opportunity }>(`/opportunities/${opportunityId}`, {
          auth: false,
        });
        let opp = oppData.opportunity;
        setOpportunity(opp);
        setLoading(false);

        // If the opportunity has no application process structure yet, enrich it.
        // This runs once per opportunity; subsequent loads skip it (already enriched).
        const hasStructure =
          (opp.essayPrompts?.length ?? 0) > 0 ||
          (opp.applicationProcess?.requiredDocuments?.length ?? 0) > 0 ||
          opp.referenceLetterConfig;

        if (!hasStructure) {
          setEnriching(true);
          try {
            const enrichData = await api.post<{ opportunity: Opportunity; enriched: boolean }>(
              `/opportunities/${opportunityId}/enrich`,
              {}
            );
            if (enrichData.enriched) {
              setOpportunity(enrichData.opportunity);
            }
          } catch {
            // Enrichment failure is non-fatal — proceed with the generic form
          } finally {
            setEnriching(false);
          }
        }

        try {
          const appData = await api.get<{ application: Application }>(`/applications/${opportunityId}`);
          setApplication(appData.application);
          const saved = appData.application.targetApplications ?? [];
          setTargets(
            saved.length > 0
              ? saved.map((t) => ({ program: t.program ?? "", school: t.school ?? "" }))
              : [{ program: "", school: "" }]
          );
        } catch (err) {
          if (err instanceof ApiError && err.status !== 404) throw err;
        }
      } catch (err) {
        setError(err instanceof ApiError ? err.message : "Couldn't load this case file.");
        setLoading(false);
      }
    }

    load();
  }, [user, opportunityId]);

  // Auto-scroll the streaming box to the bottom as text arrives
  useEffect(() => {
    if (streamBoxRef.current) {
      streamBoxRef.current.scrollTop = streamBoxRef.current.scrollHeight;
    }
  }, [streamingText]);

  async function handleStreamCoaching(force = false) {
    setGenerating(true);
    setStreamingText("");
    setError(null);

    const token = typeof window !== "undefined" ? localStorage.getItem("ScolarNav_token") : null;
    const url = `${API_BASE}/applications/${opportunityId}/coaching/stream${force ? "?force=true" : ""}`;

    try {
      const res = await fetch(url, {
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      });

      if (!res.ok) {
        const text = await res.text();
        let message = "Couldn't generate coaching right now. Please try again shortly.";
        try {
          const json = JSON.parse(text);
          message = json.error || message;
        } catch { /* use default */ }
        setError(message);
        setGenerating(false);
        return;
      }

      const reader = res.body?.getReader();
      if (!reader) throw new Error("No response body");

      const decoder = new TextDecoder();
      let buffer = "";

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split("\n");
        buffer = lines.pop() ?? "";

        for (const line of lines) {
          if (!line.startsWith("data: ")) continue;
          const raw = line.slice(6).trim();
          if (!raw) continue;

          try {
            const event = JSON.parse(raw);
            if (event.type === "chunk") {
              setStreamingText((prev) => prev + event.text);
            } else if (event.type === "done") {
              setApplication(event.application);
              setStreamingText("");
              setGenerating(false);
            } else if (event.type === "error") {
              setError(event.message || "Generation failed.");
              setGenerating(false);
            }
          } catch { /* skip malformed lines */ }
        }
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Couldn't generate coaching right now.");
      setGenerating(false);
    }
  }

  function updateTarget(index: number, field: "program" | "school", value: string) {
    setTargets((prev) => prev.map((t, i) => (i === index ? { ...t, [field]: value } : t)));
  }

  function addTarget() {
    if (targets.length < 4) setTargets((prev) => [...prev, { program: "", school: "" }]);
  }

  function removeTarget(index: number) {
    setTargets((prev) => {
      const next = prev.filter((_, i) => i !== index);
      return next.length === 0 ? [{ program: "", school: "" }] : next;
    });
  }

  async function handleSaveTarget(e: React.FormEvent) {
    e.preventDefault();
    setSavingTarget(true);
    setTargetSaved(false);
    const payload = targets
      .filter((t) => t.program || t.school)
      .map((t) => ({ program: t.program || undefined, school: t.school || undefined }));
    try {
      const data = await api.patch<{ application: Application }>(
        `/applications/${opportunityId}/target`,
        { targetApplications: payload }
      );
      setApplication(data.application);
      setTargetSaved(true);
      setTimeout(() => setTargetSaved(false), 3000);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Couldn't save target details.");
    } finally {
      setSavingTarget(false);
    }
  }

  async function handleSubmitEssay(promptId: string | undefined, content: string) {
    const key = promptId ?? "__general__";
    setSubmittingPromptId(key);
    setError(null);
    try {
      const prompt = opportunity?.essayPrompts?.find((p) => p.promptId === promptId);
      const title = prompt?.label ?? "General essay";
      const data = await api.post<{ application: Application }>(`/applications/${opportunityId}/essays`, {
        title,
        content,
        promptId: promptId || undefined,
      });
      setApplication(data.application);
      setDraftsByPromptId((prev) => {
        const next = { ...prev };
        delete next[key];
        return next;
      });
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Couldn't review that draft right now.");
    } finally {
      setSubmittingPromptId(null);
    }
  }

  async function handleUploadLetter(e: React.FormEvent) {
    e.preventDefault();
    if (!letterFile) return;
    setUploadingLetter(true);
    setError(null);
    try {
      const formData = new FormData();
      formData.append("document", letterFile);
      formData.append("letterType", letterType);
      if (refereeOrg.trim()) formData.append("refereeOrganization", refereeOrg.trim());
      const data = await api.post<{ application: Application }>(
        `/applications/${opportunityId}/reference-letters`,
        formData
      );
      setApplication(data.application);
      setLetterFile(null);
      setRefereeOrg("");
      setLetterType("work");
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Couldn't upload the letter right now.");
    } finally {
      setUploadingLetter(false);
    }
  }

  async function handleRewriteLetter(letterId: string) {
    setRewritingLetterId(letterId);
    setError(null);
    try {
      const data = await api.post<{ application: Application }>(
        `/applications/${opportunityId}/reference-letters/${letterId}/rewrite`,
        {}
      );
      setApplication(data.application);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Couldn't generate the suggested draft right now.");
    } finally {
      setRewritingLetterId(null);
    }
  }

  async function handleUploadDocument(docId: string) {
    const file = docFilesByDocId[docId];
    if (!file) return;
    setUploadingDocId(docId);
    setError(null);
    try {
      const formData = new FormData();
      formData.append("document", file);
      formData.append("docId", docId);
      const data = await api.post<{ application: Application }>(
        `/applications/${opportunityId}/documents`,
        formData
      );
      setApplication(data.application);
      setDocFilesByDocId((prev) => {
        const next = { ...prev };
        delete next[docId];
        return next;
      });
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Couldn't upload the document right now.");
    } finally {
      setUploadingDocId(null);
    }
  }

  async function handleSuggestDocument(documentId: string) {
    setSuggestingDocId(documentId);
    setError(null);
    try {
      const data = await api.post<{ application: Application }>(
        `/applications/${opportunityId}/documents/${documentId}/suggest`,
        {}
      );
      setApplication(data.application);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Couldn't generate suggestions right now.");
    } finally {
      setSuggestingDocId(null);
    }
  }

  if (authLoading || loading) return <SkeletonPage variant="detail" />;

  if (!opportunity) {
    return (
      <div className="page-narrow">
        <ErrorState
          title="Could not load this case file"
          message={error ?? "The opportunity could not be found."}
          action={<Link href="/dashboard" className="btn-secondary">Back to dashboard</Link>}
        />
      </div>
    );
  }

  const needsCv = error?.toLowerCase().includes("upload your cv");
  const needsUpgradeCoaching = error?.startsWith("UPGRADE_REQUIRED:coaching");
  const needsUpgradeEssays = error?.startsWith("UPGRADE_REQUIRED:essays");
  const needsUpgradeRefLetters = error?.startsWith("UPGRADE_REQUIRED:reference_letters");
  const needsUpgradeDocs = error?.startsWith("UPGRADE_REQUIRED:application_documents");
  const coaching = application?.coaching;
  const processType = opportunity?.applicationProcess?.type ?? "essay_based";
  const requiredDocs = opportunity?.applicationProcess?.requiredDocuments ?? [];
  // Always show the essay section unless the process is explicitly document-only
  const showEssaySection = processType !== "document_based" || (opportunity.essayPrompts?.length ?? 0) > 0;
  // Show document section when process says so, or when required docs exist from enrichment
  const showDocumentSection = processType === "document_based" || processType === "hybrid" || requiredDocs.length > 0;
  const isCvStale =
    !!coaching?.cvParsedAt &&
    !!user?.cvData?.parsedAt &&
    new Date(user.cvData.parsedAt) > new Date(coaching.cvParsedAt);

  const isOpportunityStale =
    !!coaching?.generatedAt &&
    !!(opportunity as any)?.updatedAt &&
    new Date((opportunity as any).updatedAt) > new Date(coaching.generatedAt);

  const isStale = isCvStale || isOpportunityStale;
  const staleMessage = isOpportunityStale
    ? "The scholarship's requirements or details were updated after this coaching was generated, so some guidance may be outdated."
    : "Your CV was updated after this coaching was generated, so the analysis may no longer reflect your current profile.";

  const filledTargets = targets.filter((t) => t.program || t.school);

  // Sections shown in the side navigation
  const sections = [
    ...(!needsCv && !needsUpgradeCoaching ? [{ id: "targets", label: "Target programs" }] : []),
    ...(coaching && !generating ? [{ id: "strategy", label: "Your strategy" }] : []),
    ...(coaching && !generating && showEssaySection ? [{ id: "essays", label: "Essay review" }] : []),
    ...(coaching && !generating && showDocumentSection && requiredDocs.length > 0 ? [{ id: "documents", label: "Required documents" }] : []),
    ...(coaching && !generating && opportunity.referenceLetterConfig ? [{ id: "letters", label: "Reference letters" }] : []),
  ];

  return (
    <div className="page">
      <PageHeader
        back={{ href: "/dashboard", label: "Dashboard" }}
        eyebrow="Application workspace"
        title={opportunity.title}
        description={opportunity.provider}
        actions={
          <>
            <Link href={opportunityPath(opportunity)} className="btn-secondary">View opportunity</Link>
            {opportunity.requiresInterview !== false && (
              <Link href={`/interview?opportunity=${opportunity._id}`} className="btn-ghost">Practice interview</Link>
            )}
          </>
        }
      />

      {enriching && (
        <div className="mb-6" role="status">
          <ProgressBar label="Analysing this scholarship" />
          <p className="mt-2 text-sm text-slate">Analysing this scholarship&apos;s application structure. The essay and document sections will appear shortly.</p>
        </div>
      )}

      <div className="grid gap-8 lg:grid-cols-workspace lg:gap-10">
        {sections.length > 1 && (
          <nav aria-label="On this page" className="hidden lg:block">
            <ul className="sticky top-8 space-y-1">
              {sections.map((s) => (
                <li key={s.id}>
                  <a href={`#${s.id}`} className="flex min-h-touch items-center rounded-md px-3 text-sm font-medium text-ink-soft transition-colors hover:bg-surface-2 hover:text-ink">
                    {s.label}
                  </a>
                </li>
              ))}
            </ul>
          </nav>
        )}

        <div className={`min-w-0 space-y-10 ${sections.length > 1 ? "" : "lg:col-span-2"}`}>
          {needsCv && (
            <Alert variant="warn">
              <p>You need a CV on file before we can build your coaching.</p>
              <Link href="/cv" className="mt-1 inline-block font-semibold underline">Upload your CV</Link>
            </Alert>
          )}

          {/* Target programs */}
          {!needsCv && !needsUpgradeCoaching && (
            <section id="targets" className="card card-pad scroll-mt-8" aria-labelledby="targets-heading">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <h2 id="targets-heading" className="h3">Target programs</h2>
                  <p className="mt-1 max-w-prose text-sm leading-relaxed text-ink-soft">
                    Add every program and university you are applying to. Scholarships like this one often require or encourage several applications, and the coaching is tailored to each track.
                  </p>
                </div>
                {targets.length < 4 && (
                  <button type="button" onClick={addTarget} className="btn-secondary btn-sm shrink-0">
                    <Plus size={16} aria-hidden="true" />
                    Add
                  </button>
                )}
              </div>

              <form onSubmit={handleSaveTarget} className="mt-5 space-y-3">
                {targets.map((t, i) => (
                  <div key={i} className="flex items-start gap-2">
                    <span className="w-5 shrink-0 pt-3 text-sm font-semibold text-slate">{i + 1}.</span>
                    <div className="grid flex-1 gap-2 sm:grid-cols-2">
                      <div>
                        <label htmlFor={`tp-${i}`} className="sr-only">Program or course {i + 1}</label>
                        <input id={`tp-${i}`} value={t.program} onChange={(e) => updateTarget(i, "program", e.target.value)} placeholder="Program or course" className="input" />
                      </div>
                      <div>
                        <label htmlFor={`ts-${i}`} className="sr-only">University or institution {i + 1}</label>
                        <input id={`ts-${i}`} value={t.school} onChange={(e) => updateTarget(i, "school", e.target.value)} placeholder="University or institution" className="input" />
                      </div>
                    </div>
                    {targets.length > 1 && (
                      <button
                        type="button"
                        onClick={() => removeTarget(i)}
                        aria-label={`Remove target ${i + 1}`}
                        className="flex h-11 w-11 shrink-0 items-center justify-center rounded-md text-slate transition-colors hover:bg-danger-soft hover:text-danger"
                      >
                        <X size={18} aria-hidden="true" />
                      </button>
                    )}
                  </div>
                ))}

                <div className="flex flex-wrap items-center gap-4 pt-1">
                  <button type="submit" disabled={savingTarget} aria-busy={savingTarget} className="btn-primary">
                    {savingTarget ? "Saving" : "Save targets"}
                  </button>
                  {targetSaved && <span className="text-sm font-medium text-ok" role="status">Saved. Regenerate coaching to apply.</span>}
                  <span className="ml-auto text-sm text-slate">{targets.length} of 4</span>
                </div>
              </form>
            </section>
          )}

          {/* Build strategy */}
          {!coaching && !needsCv && !needsUpgradeCoaching && !generating && (
            <section className="card card-pad" aria-labelledby="build-heading">
              <h2 id="build-heading" className="h3">Build your strategy</h2>
              <p className="mt-2 max-w-prose leading-relaxed text-ink-soft">
                We weigh your CV against this opportunity&apos;s actual requirements and give you its objectives, how your background aligns, the essay angle, honest gaps, a requirement-by-requirement breakdown and a working timeline.
                {filledTargets.length > 0 && (
                  <span className="font-medium text-forest"> Your {filledTargets.length} target program{filledTargets.length > 1 ? "s" : ""} will be factored in.</span>
                )}
              </p>
              <button type="button" onClick={() => handleStreamCoaching(false)} disabled={generating} className="btn-primary mt-4">
                Generate my coaching
              </button>
            </section>
          )}

          {needsUpgradeCoaching && <UpgradePrompt feature="coaching" />}

          {/* Live generation */}
          {generating && (
            <section aria-label="Generating your coaching" className="card card-pad">
              <div className="mb-3 flex items-center gap-3">
                <Spinner size="sm" label="Generating" />
                <p className="text-sm font-medium text-ink">Building your coaching analysis</p>
              </div>
              <ProgressBar label="Building your coaching analysis" />
              <div ref={streamBoxRef} className="mt-4 h-72 overflow-y-auto rounded-lg bg-surface p-4" aria-live="off">
                <p className="whitespace-pre-wrap break-words text-sm leading-relaxed text-ink-soft">
                  {streamingText}
                  <span className="ml-0.5 inline-block h-4 w-1.5 animate-soft-pulse bg-forest align-text-bottom" />
                </p>
              </div>
            </section>
          )}

          {coaching && !generating && (
            <>
              {isStale && (
                <Alert variant="warn">
                  <p>{staleMessage}</p>
                  <button type="button" onClick={() => handleStreamCoaching(true)} disabled={generating} className="mt-2 font-semibold underline disabled:opacity-60">
                    Regenerate with updated details
                  </button>
                </Alert>
              )}

              <section id="strategy" className="scroll-mt-8 space-y-8" aria-labelledby="strategy-heading">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <h2 id="strategy-heading" className="h2">Your strategy</h2>
                    <p className="mt-1 text-sm text-slate">Generated {new Date(coaching.generatedAt).toLocaleString()}</p>
                    {(application?.targetApplications?.length ?? 0) > 0 && (
                      <p className="text-sm text-slate">
                        Targets: {application!.targetApplications.map((t) => [t.program, t.school].filter(Boolean).join(" at ")).join(", ")}
                      </p>
                    )}
                  </div>
                  <button type="button" onClick={() => handleStreamCoaching(true)} disabled={generating} className="btn-secondary btn-sm">
                    Regenerate
                  </button>
                </div>

                {coaching.competitivePosition && (() => {
                  const pos = coaching.competitivePosition;
                  const tierConfig: Record<string, { label: string; badge: string }> = {
                    strong: { label: "Strong fit", badge: "badge-ok" },
                    competitive: { label: "Competitive", badge: "badge-info" },
                    borderline: { label: "Borderline", badge: "badge-warn" },
                    longshot: { label: "Long shot", badge: "badge-danger" },
                  };
                  const cfg = tierConfig[pos.tier] ?? tierConfig.borderline;
                  return (
                    <div className="card card-pad">
                      <div className="flex items-center gap-3">
                        <h3 className="h3">Where you stand</h3>
                        <span className={`badge ${cfg.badge}`}>{cfg.label}</span>
                      </div>
                      {pos.standoutFactors.length > 0 && (
                        <div className="mt-4">
                          <h4 className="text-sm font-semibold text-ink">Your edge</h4>
                          <ul className="mt-1.5 space-y-1.5">
                            {pos.standoutFactors.map((f, i) => (
                              <li key={i} className="flex gap-2 text-sm text-ink-soft">
                                <ArrowRight size={16} className="mt-0.5 shrink-0 text-slate" aria-hidden="true" />
                                {f}
                              </li>
                            ))}
                          </ul>
                        </div>
                      )}
                      <div className="mt-4">
                        <h4 className="text-sm font-semibold text-ink">What strong applicants typically have</h4>
                        <p className="mt-1 text-sm leading-relaxed text-ink-soft">{pos.gapFromWinner}</p>
                      </div>
                    </div>
                  );
                })()}

                <div>
                  <h3 className="h3">What they are actually seeking</h3>
                  <p className="mt-3 max-w-prose leading-relaxed text-ink-soft">{coaching.scholarshipObjectives}</p>
                </div>

                <div>
                  <h3 className="h3">Your background alignment</h3>
                  <p className="mt-3 max-w-prose whitespace-pre-line leading-relaxed text-ink-soft">{coaching.backgroundAlignment}</p>
                </div>

                {coaching.essayStrategy && (
                  <div>
                    <h3 className="h3">Essay strategy</h3>
                    <p className="mt-3 max-w-prose whitespace-pre-line leading-relaxed text-ink-soft">{coaching.essayStrategy}</p>
                  </div>
                )}

                {coaching.documentStrategy && (
                  <div>
                    <h3 className="h3">Document strategy</h3>
                    <p className="mt-3 max-w-prose whitespace-pre-line leading-relaxed text-ink-soft">{coaching.documentStrategy}</p>
                  </div>
                )}

                <div>
                  <h3 className="h3">Weaknesses, and how to handle them</h3>
                  <ul className="mt-3 space-y-3">
                    {coaching.weaknesses.map((w, i) => (
                      <li key={i} className="card p-4">
                        <p className="text-sm font-semibold text-ink">{w.gap}</p>
                        <p className="mt-1.5 text-sm text-ink-soft">
                          <span className="font-semibold text-forest">Mitigation: </span>
                          {w.mitigation}
                        </p>
                      </li>
                    ))}
                  </ul>
                </div>

                <div>
                  <h3 className="h3">Requirement by requirement</h3>
                  <ul className="mt-3 space-y-3">
                    {coaching.requirementBreakdown.map((r, i) => (
                      <li key={i} className="card p-4">
                        <p className="text-sm font-semibold text-ink">{r.requirementLabel}</p>
                        <p className="mt-1.5 text-sm text-ink-soft">{r.guidance}</p>
                      </li>
                    ))}
                  </ul>
                </div>

                <div>
                  <h3 className="h3">Timeline</h3>
                  <ol className="mt-3 divide-y divide-rule">
                    {coaching.timeline.map((t, i) => (
                      <li key={i} className="flex flex-col gap-1 py-3 sm:flex-row sm:gap-5">
                        <span className="shrink-0 text-sm font-semibold text-forest sm:w-36">{t.targetDate || `Step ${i + 1}`}</span>
                        <div className="min-w-0">
                          <p className="text-sm font-semibold text-ink">{t.milestone}</p>
                          <p className="text-sm text-slate">{t.deliverable}</p>
                        </div>
                      </li>
                    ))}
                  </ol>
                </div>

                <div>
                  <h3 className="h3">Application walkthrough</h3>
                  <p className="mt-3 max-w-prose whitespace-pre-line leading-relaxed text-ink-soft">{coaching.applicationGuide}</p>
                </div>
              </section>

              {/* Essays */}
              {showEssaySection && (
                <section id="essays" className="scroll-mt-8" aria-labelledby="essays-heading">
                  <h2 id="essays-heading" className="h2">Essay review</h2>

                  {needsUpgradeEssays ? (
                    <UpgradePrompt feature="essays" />
                  ) : (() => {
                    const prompts = opportunity.essayPrompts ?? [];

                    if (prompts.length > 0) {
                      const draftsByPrompt = (application?.essayDrafts ?? []).reduce<Record<string, EssayDraft[]>>((acc, d) => {
                        const k = d.promptId ?? "__general__";
                        if (!acc[k]) acc[k] = [];
                        acc[k]!.push(d);
                        return acc;
                      }, {});

                      return (
                        <div className="mt-4 space-y-6">
                          <p className="max-w-prose text-sm text-ink-soft">
                            Each question has its own box. Paste your draft for each prompt and submit it for feedback against this scholarship&apos;s criteria and your CV.
                          </p>
                          {prompts.map((prompt) => {
                            const key = prompt.promptId;
                            const content = draftsByPromptId[key] ?? "";
                            const charCount = content.length;
                            const wordCount = content.trim().split(/\s+/).filter(Boolean).length;
                            const overChar = prompt.maxCharacters ? charCount > prompt.maxCharacters : false;
                            const overWord = prompt.maxWords ? wordCount > prompt.maxWords : false;
                            const isOver = overChar || overWord;
                            const submitting = submittingPromptId === key;
                            const promptDrafts = [...(draftsByPrompt[key] ?? [])].reverse();

                            return (
                              <article key={key} className="card card-pad space-y-4">
                                <div>
                                  <h3 className="text-sm font-semibold text-forest">{prompt.label}</h3>
                                  <p className="mt-2 text-sm leading-relaxed text-ink">{prompt.question}</p>
                                  {prompt.guidance && <p className="mt-1.5 text-sm italic text-slate">{prompt.guidance}</p>}
                                </div>

                                <div>
                                  <label htmlFor={`essay-${key}`} className="label">Your draft</label>
                                  <textarea
                                    id={`essay-${key}`}
                                    rows={10}
                                    value={content}
                                    disabled={submitting}
                                    onChange={(e) => setDraftsByPromptId((prev) => ({ ...prev, [key]: e.target.value }))}
                                    placeholder={`Paste your draft for "${prompt.label}" here`}
                                    aria-describedby={`essay-count-${key}`}
                                    className={`textarea leading-relaxed ${isOver ? "!border-danger" : ""}`}
                                  />
                                  {(prompt.maxCharacters || prompt.maxWords) && (
                                    <div id={`essay-count-${key}`} className="mt-1.5 flex flex-wrap gap-4 text-sm">
                                      {prompt.maxCharacters && (
                                        <span className={overChar ? "font-semibold text-danger" : "text-slate"}>
                                          {charCount.toLocaleString()} of {prompt.maxCharacters.toLocaleString()} characters
                                          {overChar ? `, ${(charCount - prompt.maxCharacters).toLocaleString()} over` : ""}
                                        </span>
                                      )}
                                      {prompt.maxWords && (
                                        <span className={overWord ? "font-semibold text-danger" : "text-slate"}>
                                          {wordCount} of {prompt.maxWords} words
                                          {overWord ? `, ${wordCount - prompt.maxWords} over` : ""}
                                        </span>
                                      )}
                                    </div>
                                  )}
                                  {isOver && <p className="field-error">Over the limit. Trim before you submit. We will still flag it in the review.</p>}
                                </div>

                                <div>
                                  <button type="button" disabled={submitting || !content.trim()} aria-busy={submitting} onClick={() => handleSubmitEssay(key, content)} className="btn-primary">
                                    {submitting ? "Reviewing" : "Submit for review"}
                                  </button>
                                  {submitting && <div className="mt-3"><ProgressBar label="Reviewing your draft" /></div>}
                                </div>

                                {promptDrafts.length > 0 && (
                                  <div className="space-y-6 border-t border-rule pt-4">
                                    <h4 className="text-sm font-semibold text-ink">Previous drafts</h4>
                                    {promptDrafts.map((draft) => (
                                      <div key={draft._id} className="space-y-3">
                                        <div className="flex items-center justify-between gap-2">
                                          <p className="text-sm font-semibold text-ink">{draft.title}</p>
                                          <span className="badge">Version {draft.version}</span>
                                        </div>
                                        {draft.feedback && (
                                          <ReviewBlock
                                            assessment={draft.feedback.overallAssessment}
                                            strengths={draft.feedback.strengths}
                                            issues={draft.feedback.issues}
                                            notes={[{ label: "Authenticity", text: draft.feedback.authenticityNotes }]}
                                          />
                                        )}
                                      </div>
                                    ))}
                                  </div>
                                )}
                              </article>
                            );
                          })}
                        </div>
                      );
                    }

                    // Generic form: no defined prompts
                    const content = draftsByPromptId["__general__"] ?? "";
                    const charCount = content.length;
                    const wordCount = content.trim().split(/\s+/).filter(Boolean).length;
                    const submitting = submittingPromptId === "__general__";
                    const genericDrafts = [...(application?.essayDrafts ?? []).filter((d) => !d.promptId)].reverse();

                    return (
                      <div className="mt-4 space-y-4">
                        <p className="max-w-prose text-ink-soft">
                          Paste a draft and get specific, actionable feedback against this opportunity&apos;s requirements and your CV.
                        </p>
                        <div className="card card-pad">
                          <label htmlFor="essay-general" className="label">Your draft</label>
                          <textarea
                            id="essay-general"
                            rows={12}
                            value={content}
                            disabled={submitting}
                            onChange={(e) => setDraftsByPromptId((prev) => ({ ...prev, "__general__": e.target.value }))}
                            placeholder="Paste your draft here"
                            className="textarea leading-relaxed"
                          />
                          {content.length > 0 && <p className="help text-right">{charCount.toLocaleString()} characters · {wordCount} words</p>}
                          <button type="button" disabled={submitting || !content.trim()} aria-busy={submitting} onClick={() => handleSubmitEssay(undefined, content)} className="btn-primary mt-3">
                            {submitting ? "Reviewing your draft" : "Submit for review"}
                          </button>
                          {submitting && <div className="mt-3"><ProgressBar label="Reviewing your draft" /></div>}
                        </div>

                        {genericDrafts.length > 0 && (
                          <div className="space-y-5">
                            {genericDrafts.map((draft) => (
                              <article key={draft._id} className="card card-pad">
                                <div className="flex flex-wrap items-start justify-between gap-2">
                                  <h3 className="min-w-0 break-words font-display text-lg text-ink">{draft.title}</h3>
                                  <span className="badge">Version {draft.version}</span>
                                </div>
                                {draft.feedback && (
                                  <div className="mt-4">
                                    <ReviewBlock
                                      assessment={draft.feedback.overallAssessment}
                                      strengths={draft.feedback.strengths}
                                      issues={draft.feedback.issues}
                                      notes={[{ label: "Authenticity", text: draft.feedback.authenticityNotes }]}
                                    />
                                  </div>
                                )}
                              </article>
                            ))}
                          </div>
                        )}
                      </div>
                    );
                  })()}
                </section>
              )}

              {/* Documents */}
              {showDocumentSection && requiredDocs.length > 0 && (
                <section id="documents" className="scroll-mt-8" aria-labelledby="documents-heading">
                  <h2 id="documents-heading" className="h2">Required documents</h2>

                  {needsUpgradeDocs ? (
                    <UpgradePrompt feature="application_documents" />
                  ) : (
                    <ul className="mt-4 space-y-5">
                      {requiredDocs.map((doc) => {
                        const uploadedDoc = (application?.applicationDocuments ?? []).find((d) => d.docId === doc.docId);
                        const stagedFile = docFilesByDocId[doc.docId] ?? null;
                        const isUploading = uploadingDocId === doc.docId;
                        const isSuggesting = suggestingDocId === uploadedDoc?._id;

                        return (
                          <li key={doc.docId} className="card card-pad space-y-4">
                            <div className="flex items-start justify-between gap-3">
                              <div className="min-w-0">
                                <div className="flex flex-wrap items-center gap-2">
                                  <h3 className="font-semibold text-ink">{doc.label}</h3>
                                  {!doc.isRequired && <span className="badge">Optional</span>}
                                  {uploadedDoc && <span className="badge badge-ok">Uploaded {new Date(uploadedDoc.uploadedAt).toLocaleDateString()}</span>}
                                </div>
                                <p className="mt-1.5 text-sm leading-relaxed text-ink-soft">{doc.description}</p>
                                {doc.instructions && <p className="mt-1.5 text-sm italic text-slate">{doc.instructions}</p>}
                              </div>
                              {doc.templateUrl && (
                                <a href={doc.templateUrl} target="_blank" rel="noopener noreferrer" className="btn-secondary btn-sm shrink-0">
                                  Template
                                  <ExternalLink size={14} aria-hidden="true" />
                                </a>
                              )}
                            </div>

                            {uploadedDoc?.review && (
                              <div className="space-y-4 border-t border-rule pt-4">
                                <ReviewBlock
                                  assessmentLabel="Assessment"
                                  assessment={uploadedDoc.review.overallAssessment}
                                  strengths={uploadedDoc.review.strengths}
                                  issues={uploadedDoc.review.issues}
                                  issuesLabel="To improve"
                                />
                                {!uploadedDoc.suggestion && (
                                  <div>
                                    <button type="button" disabled={isSuggesting} aria-busy={isSuggesting} onClick={() => handleSuggestDocument(uploadedDoc._id)} className="btn-secondary">
                                      {isSuggesting ? "Generating suggestions" : "Get improved draft"}
                                    </button>
                                    {isSuggesting && <div className="mt-3"><ProgressBar label="Generating suggestions" /></div>}
                                  </div>
                                )}
                              </div>
                            )}

                            {uploadedDoc?.suggestion && (
                              <div className="space-y-3 border-t border-rule pt-4">
                                <div className="flex items-center justify-between gap-2">
                                  <h4 className="text-sm font-semibold text-ok">Suggested content</h4>
                                  <button type="button" onClick={() => navigator.clipboard.writeText(uploadedDoc.suggestion!.content)} className="btn-secondary btn-sm">
                                    <Copy size={14} aria-hidden="true" />
                                    Copy
                                  </button>
                                </div>
                                <p className="text-sm italic leading-relaxed text-slate">{uploadedDoc.suggestion.styleNotes}</p>
                                <div className="rounded-lg bg-surface p-4">
                                  <p className="whitespace-pre-line text-sm leading-relaxed text-ink">{uploadedDoc.suggestion.content}</p>
                                </div>
                                <button type="button" disabled={isSuggesting} aria-busy={isSuggesting} onClick={() => handleSuggestDocument(uploadedDoc._id)} className="btn-ghost btn-sm">
                                  {isSuggesting ? "Regenerating" : "Regenerate suggestions"}
                                </button>
                              </div>
                            )}

                            <div className="space-y-3 border-t border-rule pt-4">
                              <FilePicker
                                id={`doc-${doc.docId}`}
                                accept="application/pdf"
                                file={stagedFile}
                                disabled={isUploading}
                                onChange={(f) => setDocFilesByDocId((prev) => ({ ...prev, [doc.docId]: f }))}
                              />
                              <div className="flex flex-wrap items-center gap-3">
                                <button type="button" disabled={isUploading || !stagedFile} aria-busy={isUploading} onClick={() => handleUploadDocument(doc.docId)} className="btn-primary btn-sm">
                                  {isUploading ? "Uploading" : uploadedDoc ? "Replace and re-review" : "Upload and review"}
                                </button>
                                <span className="text-sm text-slate">PDF only, up to 8 MB</span>
                              </div>
                              {isUploading && <ProgressBar label="Uploading and reviewing" />}
                            </div>
                          </li>
                        );
                      })}
                    </ul>
                  )}
                </section>
              )}

              {/* Reference letters */}
              {opportunity.referenceLetterConfig && (
                <section id="letters" className="scroll-mt-8" aria-labelledby="letters-heading">
                  <h2 id="letters-heading" className="h2">Reference letters</h2>

                  <div className="card card-pad mt-4 space-y-4">
                    <div className="flex flex-wrap items-center justify-between gap-4">
                      <p className="text-sm font-semibold text-ink">
                        {opportunity.referenceLetterConfig.count} letter{opportunity.referenceLetterConfig.count !== 1 ? "s" : ""} required
                      </p>
                      {(() => {
                        const uploaded = (application?.referenceLetters ?? []).length;
                        const required = opportunity.referenceLetterConfig!.count;
                        return <span className={`badge ${uploaded >= required ? "badge-ok" : ""}`}>{uploaded} of {required} submitted</span>;
                      })()}
                    </div>
                    <p className="max-w-prose text-sm leading-relaxed text-ink-soft">
                      Upload each letter as a PDF once your referee has completed and signed it. We review it against the form questions and suggest improvements you can pass back to them.
                    </p>
                    {opportunity.referenceLetterConfig.instructions && (
                      <p className="text-sm italic text-slate">{opportunity.referenceLetterConfig.instructions}</p>
                    )}
                    {opportunity.referenceLetterConfig.questions.length > 0 && (
                      <div>
                        <h3 className="mb-2 text-sm font-semibold text-ink">Questions your referee must answer</h3>
                        <ol className="space-y-2">
                          {opportunity.referenceLetterConfig.questions.map((q, i) => (
                            <li key={i} className="flex gap-2 text-sm text-ink-soft">
                              <span className="shrink-0 font-semibold text-forest">{i + 1}.</span>
                              <span>
                                {q.text}
                                {q.optional && <span className="ml-1 text-slate"> (optional)</span>}
                              </span>
                            </li>
                          ))}
                        </ol>
                      </div>
                    )}
                  </div>

                  {needsUpgradeRefLetters ? (
                    <UpgradePrompt feature="reference_letters" />
                  ) : (
                    <form onSubmit={handleUploadLetter} className="card card-pad mt-5 space-y-4">
                      <div className="grid gap-4 sm:grid-cols-2">
                        <div>
                          <label htmlFor="rl-type" className="label">Letter type</label>
                          <select id="rl-type" value={letterType} onChange={(e) => setLetterType(e.target.value as ReferenceLetter["letterType"])} className="input">
                            <option value="work">Work experience reference</option>
                            <option value="academic">Academic reference</option>
                            <option value="other">Other</option>
                          </select>
                        </div>
                        <div>
                          <label htmlFor="rl-org" className="label">Referee&apos;s organisation <span className="font-normal text-slate">(optional)</span></label>
                          <input id="rl-org" value={refereeOrg} onChange={(e) => setRefereeOrg(e.target.value)} placeholder="e.g. Ministry of Finance" className="input" />
                        </div>
                      </div>
                      <div>
                        <p className="label">Reference letter PDF</p>
                        <FilePicker id="rl-file" accept="application/pdf" file={letterFile} disabled={uploadingLetter} onChange={setLetterFile} />
                        <p className="help">PDF only, up to 8 MB</p>
                      </div>
                      <div>
                        <button type="submit" disabled={uploadingLetter || !letterFile} aria-busy={uploadingLetter} className="btn-primary">
                          {uploadingLetter ? "Uploading and reviewing" : "Upload and review"}
                        </button>
                        {uploadingLetter && <div className="mt-3"><ProgressBar label="Uploading and reviewing" /></div>}
                      </div>
                    </form>
                  )}

                  {(application?.referenceLetters ?? []).length > 0 && (
                    <ul className="mt-8 space-y-6">
                      {[...(application!.referenceLetters)].reverse().map((letter) => (
                        <li key={letter._id} className="card card-pad">
                          <div className="flex flex-wrap items-start justify-between gap-2">
                            <div>
                              <p className="text-sm font-semibold text-slate">
                                {letter.letterType === "work" ? "Work reference" : letter.letterType === "academic" ? "Academic reference" : "Reference letter"}
                              </p>
                              <p className="mt-0.5 break-all font-display text-base text-ink">{letter.originalFileName}</p>
                              {letter.refereeOrganization && <p className="mt-0.5 text-sm text-slate">{letter.refereeOrganization}</p>}
                            </div>
                            <p className="shrink-0 text-sm text-slate">{new Date(letter.uploadedAt).toLocaleDateString()}</p>
                          </div>

                          {letter.review && (
                            <div className="mt-4 space-y-4">
                              <ReviewBlock
                                assessmentLabel="Assessment"
                                assessment={letter.review.overallAssessment}
                                strengths={letter.review.strengths}
                                issues={letter.review.issues}
                                issuesLabel="To improve"
                                notes={letter.review.complianceNotes ? [{ label: "Compliance", text: letter.review.complianceNotes }] : []}
                              />
                              {!letter.suggestedRewrite && (
                                <div>
                                  <button type="button" disabled={rewritingLetterId === letter._id} aria-busy={rewritingLetterId === letter._id} onClick={() => handleRewriteLetter(letter._id)} className="btn-secondary">
                                    {rewritingLetterId === letter._id ? "Generating referee briefing" : "Generate referee briefing"}
                                  </button>
                                  {rewritingLetterId === letter._id && <div className="mt-3"><ProgressBar label="Generating referee briefing" /></div>}
                                </div>
                              )}
                            </div>
                          )}

                          {letter.suggestedRewrite && (
                            <div className="mt-4 space-y-3 border-t border-rule pt-4">
                              <div className="flex items-center justify-between gap-2">
                                <h4 className="text-sm font-semibold text-ok">Referee briefing</h4>
                                <button type="button" onClick={() => navigator.clipboard.writeText(letter.suggestedRewrite!.content)} className="btn-secondary btn-sm">
                                  <Copy size={14} aria-hidden="true" />
                                  Copy
                                </button>
                              </div>
                              <p className="text-sm italic leading-relaxed text-slate">{letter.suggestedRewrite.styleNotes}</p>
                              <Alert variant="info">
                                This is a briefing for your referee: guidance on what to write, not text to copy. Share it with them and ask them to write the letter in their own words.
                              </Alert>
                              <div className="rounded-lg bg-surface p-4">
                                <p className="whitespace-pre-line text-sm leading-relaxed text-ink">{letter.suggestedRewrite.content}</p>
                              </div>
                              <button type="button" disabled={rewritingLetterId === letter._id} aria-busy={rewritingLetterId === letter._id} onClick={() => handleRewriteLetter(letter._id)} className="btn-ghost btn-sm">
                                {rewritingLetterId === letter._id ? "Regenerating" : "Regenerate briefing"}
                              </button>
                            </div>
                          )}
                        </li>
                      ))}
                    </ul>
                  )}
                </section>
              )}
            </>
          )}

          {error && !needsCv && !needsUpgradeCoaching && !needsUpgradeEssays && !needsUpgradeRefLetters && (
            <Alert variant="danger">{error}</Alert>
          )}
        </div>
      </div>
    </div>
  );
}
