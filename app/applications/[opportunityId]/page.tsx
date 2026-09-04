"use client";

import { useEffect, useRef, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { api, ApiError } from "@/lib/api";
import { useAuth } from "@/lib/auth-context";
import { Application, EssayDraft, Opportunity, ReferenceLetter } from "@/lib/types";
import UpgradePrompt from "@/components/UpgradePrompt";

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

    const token = typeof window !== "undefined" ? localStorage.getItem("Apexli_token") : null;
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

  if (authLoading || loading) {
    return <p className="max-w-4xl mx-auto px-6 py-20 text-slate font-mono text-sm">Loading case file…</p>;
  }

  if (!opportunity) return <p className="max-w-4xl mx-auto px-6 py-20 text-alert">{error}</p>;

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
    ? "The scholarship's requirements or details were updated after this coaching was generated — some guidance may be outdated."
    : "Your CV was updated after this coaching was generated — the analysis may no longer reflect your current profile.";

  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 py-8 sm:py-14">
      <p className="font-mono text-xs tracking-widest uppercase text-brass">Case File</p>
      <h1 className="font-display text-2xl sm:text-4xl text-ink mt-2 leading-tight">{opportunity.title}</h1>
      <p className="text-ink-soft mt-1">{opportunity.provider}</p>

      {enriching && (
        <div className="mt-4 flex items-center gap-2 text-sm font-mono text-slate">
          <span className="inline-block w-2 h-2 rounded-full bg-brass animate-pulse" />
          Analysing this scholarship's application structure — the essay and document sections will appear shortly.
        </div>
      )}

      {needsCv && (
        <div className="mt-6 case-card p-5">
          <p className="text-ink-soft">You'll need a CV on file before we can build your coaching.</p>
          <a href="/cv" className="inline-block mt-3 text-forest underline text-sm">
            Upload your CV →
          </a>
        </div>
      )}

      {/* Target programs — always shown once CV check Apexlies */}
      {!needsCv && !needsUpgradeCoaching && (
        <div className="mt-8 case-card p-6">
          <div className="flex items-start justify-between gap-4">
            <div>
              <h2 className="font-display text-lg sm:text-xl text-ink">Target programs</h2>
              <p className="text-ink-soft text-sm mt-1 leading-relaxed">
                Add every program and university you're applying to — scholarships like this one
                often require or encourage multiple applications. Claude will tailor the coaching
                to cover each track.
              </p>
            </div>
            {targets.length < 4 && (
              <button
                type="button"
                onClick={addTarget}
                className="shrink-0 text-xs font-mono text-forest border border-forest px-3 py-1.5 hover:bg-forest hover:text-paper transition-colors mt-0.5"
              >
                + Add
              </button>
            )}
          </div>

          <form onSubmit={handleSaveTarget} className="mt-4 space-y-3">
            {targets.map((t, i) => (
              <div key={i} className="flex gap-2 items-start">
                <span className="font-mono text-xs text-brass pt-2.5 w-4 shrink-0">{i + 1}.</span>
                <div className="flex-1 grid sm:grid-cols-2 gap-2">
                  <input
                    value={t.program}
                    onChange={(e) => updateTarget(i, "program", e.target.value)}
                    placeholder="Program / Course"
                    className="w-full border border-rule px-3 py-2 bg-transparent focus:border-forest outline-none text-sm"
                  />
                  <input
                    value={t.school}
                    onChange={(e) => updateTarget(i, "school", e.target.value)}
                    placeholder="University / Institution"
                    className="w-full border border-rule px-3 py-2 bg-transparent focus:border-forest outline-none text-sm"
                  />
                </div>
                {targets.length > 1 && (
                  <button
                    type="button"
                    onClick={() => removeTarget(i)}
                    className="shrink-0 text-slate hover:text-alert transition-colors pt-2 text-lg leading-none"
                    aria-label="Remove"
                  >
                    ×
                  </button>
                )}
              </div>
            ))}

            <div className="flex items-center gap-4 pt-1">
              <button
                type="submit"
                disabled={savingTarget}
                className="text-sm text-forest border border-forest px-4 py-2 hover:bg-forest hover:text-paper transition-colors disabled:opacity-60"
              >
                {savingTarget ? "Saving…" : "Save"}
              </button>
              {targetSaved && (
                <span className="text-xs font-mono text-forest">Saved — regenerate coaching to apply.</span>
              )}
              <span className="text-xs text-slate font-mono ml-auto">{targets.length}/4</span>
            </div>
          </form>
        </div>
      )}

      {!coaching && !needsCv && !needsUpgradeCoaching && !generating && (
        <div className="mt-4 case-card p-6">
          <h2 className="font-display text-xl sm:text-2xl text-ink">Build your strategy</h2>
          <p className="text-ink-soft mt-2 leading-relaxed">
            We'll weigh your CV against this opportunity's actual requirements — objectives, alignment,
            essay angle, honest gaps, a requirement-by-requirement breakdown, and a working timeline.
            {targets.some((t) => t.program || t.school) && (
              <span className="text-forest"> Your {targets.filter((t) => t.program || t.school).length} target program{targets.filter((t) => t.program || t.school).length > 1 ? "s" : ""} will be factored in.</span>
            )}
          </p>
          <button
            onClick={() => handleStreamCoaching(false)}
            disabled={generating}
            className="mt-4 bg-forest text-paper px-5 py-2.5 text-sm hover:bg-forest-light transition-colors disabled:opacity-60"
          >
            Generate my coaching
          </button>
        </div>
      )}

      {needsUpgradeCoaching && <UpgradePrompt feature="coaching" />}

      {/* Live streaming typewriter view */}
      {generating && (
        <div className="mt-8">
          <div className="flex items-center gap-2 mb-3">
            <span className="inline-block w-2 h-2 rounded-full bg-forest animate-pulse" />
            <p className="text-sm font-mono text-slate">Building your coaching analysis…</p>
          </div>
          <div
            ref={streamBoxRef}
            className="case-card p-5 h-72 overflow-y-auto"
          >
            <pre className="font-mono text-xs text-ink-soft whitespace-pre-wrap leading-relaxed break-all">
              {streamingText}
              <span className="inline-block w-1.5 h-3.5 bg-forest align-middle ml-0.5 animate-pulse" />
            </pre>
          </div>
        </div>
      )}

      {coaching && !generating && (
        <div className="mt-10 space-y-8">
          {isStale && (
            <div className="case-card p-4">
              <p className="text-sm text-ink">{staleMessage}</p>
              <button
                onClick={() => handleStreamCoaching(true)}
                disabled={generating}
                className="mt-2 text-sm text-slate underline disabled:opacity-60"
              >
                Regenerate with updated CV
              </button>
            </div>
          )}

          <div className="flex flex-wrap items-center justify-between gap-2">
            <div>
              <p className="text-xs text-slate font-mono">
                Generated {new Date(coaching.generatedAt).toLocaleString()}
              </p>
              {(application?.targetApplications?.length ?? 0) > 0 && (
                <p className="text-xs text-slate font-mono mt-0.5">
                  Targets: {application!.targetApplications.map((t) => [t.program, t.school].filter(Boolean).join(" @ ")).join(", ")}
                </p>
              )}
            </div>
            <button
              onClick={() => handleStreamCoaching(true)}
              disabled={generating}
              className="text-xs text-forest underline disabled:opacity-60"
            >
              Regenerate
            </button>
          </div>

          {coaching.competitivePosition && (() => {
            const pos = coaching.competitivePosition;
            const tierConfig: Record<string, { label: string }> = {
              strong: { label: "Strong fit" },
              competitive: { label: "Competitive" },
              borderline: { label: "Borderline" },
              longshot: { label: "Long shot" },
            };
            const cfg = tierConfig[pos.tier] ?? tierConfig.borderline;
            return (
              <section>
                <h2 className="font-display text-xl sm:text-2xl text-ink border-b border-rule pb-2">Where you stand</h2>
                <div className="mt-4 case-card p-4">
                  <span className="font-mono text-xs uppercase tracking-widest font-semibold text-ink">
                    {cfg.label}
                  </span>
                  {pos.standoutFactors.length > 0 && (
                    <div className="mt-3">
                      <p className="text-xs font-mono uppercase text-slate mb-1.5">Your edge</p>
                      <ul className="space-y-1">
                        {pos.standoutFactors.map((f, i) => (
                          <li key={i} className="text-sm text-ink-soft flex gap-2">
                            <span className="text-slate shrink-0">→</span>
                            {f}
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                  <div className="mt-3">
                    <p className="text-xs font-mono uppercase text-slate mb-1.5">What strong applicants typically have</p>
                    <p className="text-sm text-ink-soft leading-relaxed">{pos.gapFromWinner}</p>
                  </div>
                </div>
              </section>
            );
          })()}

          <section>
            <h2 className="font-display text-xl sm:text-2xl text-ink border-b border-rule pb-2">What they're actually seeking</h2>
            <p className="text-ink-soft mt-3 leading-relaxed">{coaching.scholarshipObjectives}</p>
          </section>

          <section>
            <h2 className="font-display text-xl sm:text-2xl text-ink border-b border-rule pb-2">Your background alignment</h2>
            <p className="text-ink-soft mt-3 leading-relaxed whitespace-pre-line">{coaching.backgroundAlignment}</p>
          </section>

          {coaching.essayStrategy && (
            <section>
              <h2 className="font-display text-xl sm:text-2xl text-ink border-b border-rule pb-2">Essay strategy</h2>
              <p className="text-ink-soft mt-3 leading-relaxed whitespace-pre-line">{coaching.essayStrategy}</p>
            </section>
          )}

          {coaching.documentStrategy && (
            <section>
              <h2 className="font-display text-xl sm:text-2xl text-ink border-b border-rule pb-2">Document strategy</h2>
              <p className="text-ink-soft mt-3 leading-relaxed whitespace-pre-line">{coaching.documentStrategy}</p>
            </section>
          )}

          <section>
            <h2 className="font-display text-xl sm:text-2xl text-ink border-b border-rule pb-2">Weaknesses, and how to handle them</h2>
            <div className="mt-3 space-y-3">
              {coaching.weaknesses.map((w, i) => (
                <div key={i} className="case-card p-4">
                  <p className="text-ink font-medium text-sm">{w.gap}</p>
                  <p className="text-ink-soft text-sm mt-1.5">
                    <span className="text-forest font-medium">Mitigation: </span>
                    {w.mitigation}
                  </p>
                </div>
              ))}
            </div>
          </section>

          <section>
            <h2 className="font-display text-xl sm:text-2xl text-ink border-b border-rule pb-2">Requirement by requirement</h2>
            <div className="mt-3 space-y-3">
              {coaching.requirementBreakdown.map((r, i) => (
                <div key={i} className="case-card p-4">
                  <p className="text-ink font-medium text-sm">{r.requirementLabel}</p>
                  <p className="text-ink-soft text-sm mt-1.5">{r.guidance}</p>
                </div>
              ))}
            </div>
          </section>

          <section>
            <h2 className="font-display text-xl sm:text-2xl text-ink border-b border-rule pb-2">Timeline</h2>
            <div className="mt-3 space-y-2">
              {coaching.timeline.map((t, i) => (
                <div key={i} className="flex flex-col sm:flex-row sm:gap-4 border-b border-rule pb-2 last:border-0">
                  <span className="font-mono text-xs text-brass break-words sm:whitespace-nowrap sm:pt-0.5">
                    {t.targetDate || `Step ${i + 1}`}
                  </span>
                  <div className="min-w-0 mt-0.5 sm:mt-0">
                    <p className="text-ink text-sm font-medium">{t.milestone}</p>
                    <p className="text-slate text-sm">{t.deliverable}</p>
                  </div>
                </div>
              ))}
            </div>
          </section>

          <section>
            <h2 className="font-display text-xl sm:text-2xl text-ink border-b border-rule pb-2">Application walkthrough</h2>
            <p className="text-ink-soft mt-3 leading-relaxed whitespace-pre-line">{coaching.applicationGuide}</p>
          </section>

          {showEssaySection && (
            <section>
              <h2 className="font-display text-xl sm:text-2xl text-ink border-b border-rule pb-2">Essay review</h2>

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
                      <p className="text-ink-soft text-sm">
                        Each question has its own input below. Paste your draft for each prompt and submit for tailored feedback against this scholarship's criteria and your CV.
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
                          <div key={key} className="case-card p-5 space-y-4">
                            <div>
                              <p className="text-xs font-mono uppercase tracking-widest text-brass">{prompt.label}</p>
                              <p className="text-sm text-ink mt-2 leading-relaxed">{prompt.question}</p>
                              {prompt.guidance && (
                                <p className="text-xs text-slate mt-1.5 italic">{prompt.guidance}</p>
                              )}
                              {(prompt.maxCharacters || prompt.maxWords) && (
                                <div className="flex flex-wrap gap-4 mt-2">
                                  {prompt.maxCharacters && (
                                    <span className={`text-xs font-mono ${overChar ? "text-alert" : "text-slate"}`}>
                                      {charCount.toLocaleString()} / {prompt.maxCharacters.toLocaleString()} chars
                                      {overChar ? ` — ${(charCount - prompt.maxCharacters).toLocaleString()} over` : ""}
                                    </span>
                                  )}
                                  {prompt.maxWords && (
                                    <span className={`text-xs font-mono ${overWord ? "text-alert" : "text-slate"}`}>
                                      {wordCount} / {prompt.maxWords} words
                                      {overWord ? ` — ${wordCount - prompt.maxWords} over` : ""}
                                    </span>
                                  )}
                                </div>
                              )}
                            </div>

                            <div className="space-y-2">
                              <textarea
                                rows={10}
                                value={content}
                                onChange={(e) => setDraftsByPromptId((prev) => ({ ...prev, [key]: e.target.value }))}
                                placeholder={`Paste your draft for "${prompt.label}" here…`}
                                className={`w-full border px-4 py-3 bg-transparent outline-none text-sm leading-relaxed ${isOver ? "border-alert focus:border-alert" : "border-rule focus:border-forest"}`}
                              />
                              {isOver && (
                                <p className="text-xs text-alert font-mono">Over the limit — trim before submitting. We'll still flag this in the review.</p>
                              )}
                              <button
                                type="button"
                                disabled={submitting || !content.trim()}
                                onClick={() => handleSubmitEssay(key, content)}
                                className="bg-forest text-paper px-5 py-2.5 text-sm hover:bg-forest-light transition-colors disabled:opacity-60"
                              >
                                {submitting ? "Reviewing…" : "Submit for review"}
                              </button>
                            </div>

                            {promptDrafts.length > 0 && (
                              <div className="border-t border-rule pt-4 space-y-5">
                                <p className="text-xs font-mono text-slate uppercase tracking-widest">Previous drafts</p>
                                {promptDrafts.map((draft) => (
                                  <div key={draft._id} className="space-y-3">
                                    <div className="flex items-center justify-between gap-2">
                                      <p className="text-sm text-ink font-medium">{draft.title}</p>
                                      <span className="text-xs font-mono text-slate shrink-0">v{draft.version}</span>
                                    </div>
                                    {draft.feedback && (
                                      <div className="space-y-3">
                                        <div>
                                          <p className="text-xs font-mono uppercase text-brass">Overall</p>
                                          <p className="text-ink-soft text-sm mt-1">{draft.feedback.overallAssessment}</p>
                                        </div>
                                        {draft.feedback.strengths.length > 0 && (
                                          <div>
                                            <p className="text-xs font-mono uppercase text-forest">Working well</p>
                                            <ul className="list-disc list-inside text-sm text-ink-soft mt-1 space-y-1">
                                              {draft.feedback.strengths.map((s, i) => <li key={i}>{s}</li>)}
                                            </ul>
                                          </div>
                                        )}
                                        {draft.feedback.issues.length > 0 && (
                                          <div>
                                            <p className="text-xs font-mono uppercase text-alert">To fix</p>
                                            <div className="mt-1 space-y-2">
                                              {draft.feedback.issues.map((issue, i) => (
                                                <div key={i} className="border-l-2 border-alert pl-3">
                                                  <p className="text-xs text-slate">{issue.location}</p>
                                                  <p className="text-sm text-ink-soft">{issue.problem}</p>
                                                  <p className="text-sm text-forest mt-0.5">→ {issue.suggestion}</p>
                                                </div>
                                              ))}
                                            </div>
                                          </div>
                                        )}
                                        <div>
                                          <p className="text-xs font-mono uppercase text-brass">Authenticity</p>
                                          <p className="text-ink-soft text-sm mt-1">{draft.feedback.authenticityNotes}</p>
                                        </div>
                                      </div>
                                    )}
                                  </div>
                                ))}
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  );
                }

                // Generic form — no defined prompts
                const content = draftsByPromptId["__general__"] ?? "";
                const charCount = content.length;
                const wordCount = content.trim().split(/\s+/).filter(Boolean).length;
                const submitting = submittingPromptId === "__general__";
                const genericDrafts = [...(application?.essayDrafts ?? []).filter((d) => !d.promptId)].reverse();

                return (
                  <div className="mt-4 space-y-4">
                    <p className="text-ink-soft">
                      Paste a draft and get specific, actionable feedback against this opportunity's requirements and your CV.
                    </p>
                    <div className="space-y-2">
                      <textarea
                        rows={12}
                        value={content}
                        onChange={(e) => setDraftsByPromptId((prev) => ({ ...prev, "__general__": e.target.value }))}
                        placeholder="Paste your draft here…"
                        className="w-full border border-rule px-4 py-3 bg-transparent focus:border-forest outline-none text-sm leading-relaxed"
                      />
                      {content.length > 0 && (
                        <p className="text-xs font-mono text-slate text-right">
                          {charCount.toLocaleString()} characters · {wordCount} words
                        </p>
                      )}
                      <button
                        type="button"
                        disabled={submitting || !content.trim()}
                        onClick={() => handleSubmitEssay(undefined, content)}
                        className="bg-forest text-paper px-5 py-2.5 text-sm hover:bg-forest-light transition-colors disabled:opacity-60"
                      >
                        {submitting ? "Reviewing your draft…" : "Submit for review"}
                      </button>
                    </div>

                    {genericDrafts.length > 0 && (
                      <div className="mt-6 space-y-6">
                        {genericDrafts.map((draft) => (
                          <div key={draft._id} className="case-card p-5">
                            <div className="flex flex-wrap items-start justify-between gap-2">
                              <p className="font-display text-base sm:text-lg text-ink min-w-0 break-words">{draft.title}</p>
                              <span className="text-xs font-mono text-slate shrink-0">v{draft.version}</span>
                            </div>
                            {draft.feedback && (
                              <div className="mt-4 space-y-4">
                                <div>
                                  <p className="text-xs font-mono uppercase text-brass">Overall</p>
                                  <p className="text-ink-soft text-sm mt-1">{draft.feedback.overallAssessment}</p>
                                </div>
                                {draft.feedback.strengths.length > 0 && (
                                  <div>
                                    <p className="text-xs font-mono uppercase text-forest">Working well</p>
                                    <ul className="list-disc list-inside text-sm text-ink-soft mt-1 space-y-1">
                                      {draft.feedback.strengths.map((s, i) => <li key={i}>{s}</li>)}
                                    </ul>
                                  </div>
                                )}
                                {draft.feedback.issues.length > 0 && (
                                  <div>
                                    <p className="text-xs font-mono uppercase text-alert">To fix</p>
                                    <div className="mt-1 space-y-2">
                                      {draft.feedback.issues.map((issue, i) => (
                                        <div key={i} className="border-l-2 border-alert pl-3">
                                          <p className="text-xs text-slate">{issue.location}</p>
                                          <p className="text-sm text-ink-soft">{issue.problem}</p>
                                          <p className="text-sm text-forest mt-0.5">→ {issue.suggestion}</p>
                                        </div>
                                      ))}
                                    </div>
                                  </div>
                                )}
                                <div>
                                  <p className="text-xs font-mono uppercase text-brass">Authenticity</p>
                                  <p className="text-ink-soft text-sm mt-1">{draft.feedback.authenticityNotes}</p>
                                </div>
                              </div>
                            )}
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                );
              })()}
            </section>
          )}

          {showDocumentSection && requiredDocs.length > 0 && (
            <section>
              <h2 className="font-display text-xl sm:text-2xl text-ink border-b border-rule pb-2">Required documents</h2>

              {needsUpgradeDocs ? (
                <UpgradePrompt feature="application_documents" />
              ) : (
                <div className="mt-4 space-y-5">
                  {requiredDocs.map((doc) => {
                    const uploadedDoc = (application?.applicationDocuments ?? []).find((d) => d.docId === doc.docId);
                    const stagedFile = docFilesByDocId[doc.docId] ?? null;
                    const isUploading = uploadingDocId === doc.docId;

                    return (
                      <div key={doc.docId} className="case-card p-5 space-y-4">
                        <div className="flex items-start justify-between gap-3">
                          <div className="min-w-0">
                            <div className="flex items-center gap-2 flex-wrap">
                              <p className="font-medium text-ink">{doc.label}</p>
                              {!doc.isRequired && (
                                <span className="text-xs text-slate font-mono border border-rule px-1.5 py-0.5">optional</span>
                              )}
                              {uploadedDoc && (
                                <span className="text-xs text-forest font-mono">uploaded {new Date(uploadedDoc.uploadedAt).toLocaleDateString()}</span>
                              )}
                            </div>
                            <p className="text-sm text-ink-soft mt-1.5 leading-relaxed">{doc.description}</p>
                            {doc.instructions && (
                              <p className="text-xs text-slate mt-1.5 italic">{doc.instructions}</p>
                            )}
                          </div>
                          {doc.templateUrl && (
                            <a
                              href={doc.templateUrl}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="shrink-0 text-xs font-mono text-forest border border-forest px-2 py-1 hover:bg-forest hover:text-paper transition-colors"
                            >
                              Template
                            </a>
                          )}
                        </div>

                        {uploadedDoc?.review && (
                          <div className="border-t border-rule pt-4 space-y-3">
                            <div>
                              <p className="text-xs font-mono uppercase text-brass">Assessment</p>
                              <p className="text-ink-soft text-sm mt-1">{uploadedDoc.review.overallAssessment}</p>
                            </div>
                            {uploadedDoc.review.strengths.length > 0 && (
                              <div>
                                <p className="text-xs font-mono uppercase text-forest">Working well</p>
                                <ul className="list-disc list-inside text-sm text-ink-soft mt-1 space-y-1">
                                  {uploadedDoc.review.strengths.map((s, i) => <li key={i}>{s}</li>)}
                                </ul>
                              </div>
                            )}
                            {uploadedDoc.review.issues.length > 0 && (
                              <div>
                                <p className="text-xs font-mono uppercase text-alert">To improve</p>
                                <div className="mt-1 space-y-2">
                                  {uploadedDoc.review.issues.map((issue, i) => (
                                    <div key={i} className="border-l-2 border-alert pl-3">
                                      <p className="text-xs text-slate">{issue.location}</p>
                                      <p className="text-sm text-ink-soft">{issue.problem}</p>
                                      <p className="text-sm text-forest mt-0.5">→ {issue.suggestion}</p>
                                    </div>
                                  ))}
                                </div>
                              </div>
                            )}
                            {!uploadedDoc.suggestion && (
                              <button
                                type="button"
                                disabled={suggestingDocId === uploadedDoc._id}
                                onClick={() => handleSuggestDocument(uploadedDoc._id)}
                                className="text-sm text-forest border border-forest px-4 py-2 hover:bg-forest hover:text-paper transition-colors disabled:opacity-60"
                              >
                                {suggestingDocId === uploadedDoc._id ? "Generating suggestions…" : "Get improved draft"}
                              </button>
                            )}
                          </div>
                        )}

                        {uploadedDoc?.suggestion && (
                          <div className="border-t border-rule pt-4 space-y-3">
                            <div className="flex items-center justify-between gap-2">
                              <p className="text-xs font-mono uppercase text-forest">Suggested content</p>
                              <button
                                type="button"
                                onClick={() => navigator.clipboard.writeText(uploadedDoc.suggestion!.content)}
                                className="text-xs font-mono text-slate border border-rule px-2 py-1 hover:border-forest hover:text-forest transition-colors"
                              >
                                Copy
                              </button>
                            </div>
                            <p className="text-xs text-slate italic leading-relaxed">{uploadedDoc.suggestion.styleNotes}</p>
                            <div className="border border-rule p-4 bg-paper">
                              <p className="text-sm text-ink leading-relaxed whitespace-pre-line">{uploadedDoc.suggestion.content}</p>
                            </div>
                            <button
                              type="button"
                              disabled={suggestingDocId === uploadedDoc._id}
                              onClick={() => handleSuggestDocument(uploadedDoc._id)}
                              className="text-xs text-slate underline disabled:opacity-60"
                            >
                              {suggestingDocId === uploadedDoc._id ? "Regenerating…" : "Regenerate suggestions"}
                            </button>
                          </div>
                        )}

                        <div className="border-t border-rule pt-4 space-y-2">
                          <div className="flex flex-col sm:flex-row gap-2 items-start">
                            <input
                              type="file"
                              accept="application/pdf"
                              onChange={(e) =>
                                setDocFilesByDocId((prev) => ({
                                  ...prev,
                                  [doc.docId]: e.target.files?.[0] ?? null,
                                }))
                              }
                              className="block text-sm text-slate file:mr-3 file:py-1.5 file:px-3 file:border file:border-forest file:text-forest file:bg-transparent file:text-xs file:font-mono hover:file:bg-forest hover:file:text-paper file:transition-colors cursor-pointer"
                            />
                            <button
                              type="button"
                              disabled={isUploading || !stagedFile}
                              onClick={() => handleUploadDocument(doc.docId)}
                              className="text-sm text-forest border border-forest px-4 py-1.5 hover:bg-forest hover:text-paper transition-colors disabled:opacity-60 whitespace-nowrap"
                            >
                              {isUploading ? "Uploading…" : uploadedDoc ? "Replace & re-review" : "Upload & review"}
                            </button>
                          </div>
                          <p className="text-xs text-slate">PDF only · max 8 MB</p>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </section>
          )}

          {opportunity.referenceLetterConfig && (
            <section>
              <h2 className="font-display text-xl sm:text-2xl text-ink border-b border-rule pb-2">Reference letters</h2>

              <div className="mt-4 case-card p-4 space-y-4">
                <div className="flex items-center justify-between gap-4 flex-wrap">
                  <p className="text-xs font-mono text-slate uppercase tracking-widest">
                    {opportunity.referenceLetterConfig.count} letter{opportunity.referenceLetterConfig.count !== 1 ? "s" : ""} required
                  </p>
                  {(() => {
                    const uploaded = (application?.referenceLetters ?? []).length;
                    const required = opportunity.referenceLetterConfig!.count;
                    const allDone = uploaded >= required;
                    return (
                      <span className={`text-xs font-mono px-2 py-0.5 border ${allDone ? "border-forest text-forest" : "border-rule text-slate"}`}>
                        {uploaded} / {required} submitted
                      </span>
                    );
                  })()}
                </div>
                <p className="text-sm text-ink-soft leading-relaxed">
                  Upload each letter as a PDF once your referee has completed and signed it. We'll review it against the form questions and suggest improvements you can pass back to them.
                </p>
                {opportunity.referenceLetterConfig.instructions && (
                  <p className="text-xs text-slate italic">{opportunity.referenceLetterConfig.instructions}</p>
                )}
                {opportunity.referenceLetterConfig.questions.length > 0 && (
                  <div>
                    <p className="text-xs font-mono text-slate uppercase tracking-widest mb-2">Questions your referee must answer</p>
                    <ol className="space-y-2">
                      {opportunity.referenceLetterConfig.questions.map((q, i) => (
                        <li key={i} className="flex gap-2 text-sm text-ink-soft">
                          <span className="font-mono text-brass shrink-0">{i + 1}.</span>
                          <span>
                            {q.text}
                            {q.optional && <em className="text-slate ml-1 not-italic"> (optional)</em>}
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
                <form onSubmit={handleUploadLetter} className="mt-5 space-y-3">
                  <div className="grid sm:grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-mono text-slate mb-1.5 uppercase tracking-widest">Letter type</label>
                      <select
                        value={letterType}
                        onChange={(e) => setLetterType(e.target.value as ReferenceLetter["letterType"])}
                        className="w-full border border-rule px-3 py-2.5 bg-transparent focus:border-forest outline-none text-sm"
                      >
                        <option value="work">Work experience reference</option>
                        <option value="academic">Academic reference</option>
                        <option value="other">Other</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-xs font-mono text-slate mb-1.5 uppercase tracking-widest">Referee's organisation (optional)</label>
                      <input
                        value={refereeOrg}
                        onChange={(e) => setRefereeOrg(e.target.value)}
                        placeholder="e.g. Ministry of Finance"
                        className="w-full border border-rule px-3 py-2 bg-transparent focus:border-forest outline-none text-sm"
                      />
                    </div>
                  </div>
                  <div>
                    <label className="block text-xs font-mono text-slate mb-1.5 uppercase tracking-widest">Reference letter PDF</label>
                    <input
                      type="file"
                      accept="application/pdf"
                      onChange={(e) => setLetterFile(e.target.files?.[0] ?? null)}
                      className="block w-full text-sm text-slate file:mr-4 file:py-2 file:px-4 file:border file:border-forest file:text-forest file:bg-transparent file:text-xs file:font-mono hover:file:bg-forest hover:file:text-paper file:transition-colors cursor-pointer"
                    />
                    <p className="text-xs text-slate mt-1">PDF only · max 8 MB</p>
                  </div>
                  <button
                    type="submit"
                    disabled={uploadingLetter || !letterFile}
                    className="bg-forest text-paper px-5 py-2.5 text-sm hover:bg-forest-light transition-colors disabled:opacity-60"
                  >
                    {uploadingLetter ? "Uploading & reviewing…" : "Upload & review"}
                  </button>
                </form>
              )}

              {(application?.referenceLetters ?? []).length > 0 && (
                <div className="mt-8 space-y-6">
                  {[...(application!.referenceLetters)].reverse().map((letter) => (
                    <div key={letter._id} className="case-card p-5">
                      <div className="flex flex-wrap items-start justify-between gap-2">
                        <div>
                          <p className="font-mono text-xs text-slate uppercase tracking-widest">
                            {letter.letterType === "work" ? "Work reference" : letter.letterType === "academic" ? "Academic reference" : "Reference letter"}
                          </p>
                          <p className="font-display text-base text-ink mt-0.5 break-all">{letter.originalFileName}</p>
                          {letter.refereeOrganization && (
                            <p className="text-xs text-slate mt-0.5">{letter.refereeOrganization}</p>
                          )}
                        </div>
                        <p className="text-xs font-mono text-slate shrink-0">{new Date(letter.uploadedAt).toLocaleDateString()}</p>
                      </div>

                      {letter.review && (
                        <div className="mt-4 space-y-4">
                          <div>
                            <p className="text-xs font-mono uppercase text-brass">Assessment</p>
                            <p className="text-ink-soft text-sm mt-1">{letter.review.overallAssessment}</p>
                          </div>
                          {letter.review.strengths.length > 0 && (
                            <div>
                              <p className="text-xs font-mono uppercase text-forest">Working well</p>
                              <ul className="list-disc list-inside text-sm text-ink-soft mt-1 space-y-1">
                                {letter.review.strengths.map((s, i) => <li key={i}>{s}</li>)}
                              </ul>
                            </div>
                          )}
                          {letter.review.issues.length > 0 && (
                            <div>
                              <p className="text-xs font-mono uppercase text-alert">To improve</p>
                              <div className="mt-1 space-y-2">
                                {letter.review.issues.map((issue, i) => (
                                  <div key={i} className="border-l-2 border-alert pl-3">
                                    <p className="text-xs text-slate">{issue.location}</p>
                                    <p className="text-sm text-ink-soft">{issue.problem}</p>
                                    <p className="text-sm text-forest mt-0.5">→ {issue.suggestion}</p>
                                  </div>
                                ))}
                              </div>
                            </div>
                          )}
                          {letter.review.complianceNotes && (
                            <div>
                              <p className="text-xs font-mono uppercase text-slate">Compliance</p>
                              <p className="text-ink-soft text-sm mt-1">{letter.review.complianceNotes}</p>
                            </div>
                          )}

                          {!letter.suggestedRewrite && (
                            <button
                              type="button"
                              disabled={rewritingLetterId === letter._id}
                              onClick={() => handleRewriteLetter(letter._id)}
                              className="text-sm text-forest border border-forest px-4 py-2 hover:bg-forest hover:text-paper transition-colors disabled:opacity-60"
                            >
                              {rewritingLetterId === letter._id ? "Generating referee briefing…" : "Generate referee briefing"}
                            </button>
                          )}
                        </div>
                      )}

                      {letter.suggestedRewrite && (
                        <div className="mt-4 border-t border-rule pt-4 space-y-3">
                          <div className="flex items-center justify-between gap-2">
                            <p className="text-xs font-mono uppercase text-forest">Referee briefing</p>
                            <button
                              type="button"
                              onClick={() => navigator.clipboard.writeText(letter.suggestedRewrite!.content)}
                              className="text-xs font-mono text-slate border border-rule px-2 py-1 hover:border-forest hover:text-forest transition-colors"
                            >
                              Copy
                            </button>
                          </div>
                          <p className="text-xs text-slate italic leading-relaxed">{letter.suggestedRewrite.styleNotes}</p>
                          <p className="text-xs text-slate bg-indigo border border-rule px-3 py-2">
                            This is a briefing for your referee — guidance on what to write, not text to copy. Share it with them and ask them to write the letter in their own words.
                          </p>
                          <div className="border border-rule p-4 bg-paper">
                            <p className="text-sm text-ink leading-relaxed whitespace-pre-line">{letter.suggestedRewrite.content}</p>
                          </div>
                          <button
                            type="button"
                            disabled={rewritingLetterId === letter._id}
                            onClick={() => handleRewriteLetter(letter._id)}
                            className="text-xs text-slate underline disabled:opacity-60"
                          >
                            {rewritingLetterId === letter._id ? "Regenerating…" : "Regenerate briefing"}
                          </button>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </section>
          )}
        </div>
      )}

      {error && !needsCv && !needsUpgradeCoaching && !needsUpgradeEssays && !needsUpgradeRefLetters && (
        <p className="text-alert text-sm mt-6">{error}</p>
      )}
    </div>
  );
}
