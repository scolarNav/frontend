"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { api, ApiError } from "@/lib/api";
import { useAuth } from "@/lib/auth-context";
import { Opportunity, HumanCoach } from "@/lib/types";
import { ExternalLink, Trophy } from "lucide-react";
import { formatScraped, sameText, type TextBlock } from "@/lib/format-scraped";
import { knownProvider } from "@/lib/opportunities";
import { levelByValue } from "@/lib/taxonomy";

function detectScamFlags(opp: Opportunity): string[] {
  const flags: string[] = [];
  const text = `${opp.title} ${opp.objectives} ${opp.eligibilitySummary}`.toLowerCase();

  if (!opp.officialUrl || opp.officialUrl === "https://example.com") {
    flags.push("No verified official URL provided — confirm this scholarship exists independently before applying.");
  }
  if (opp.requirements.some((r) => r.category === "financial" && /fee|pay|payment|deposit/i.test(r.label + " " + (r.detail || "")))) {
    flags.push("An application fee is mentioned. Legitimate scholarships do not charge fees to apply.");
  }
  if (/guaranteed|100% success|no gpa|no ielts required|everyone qualifies/i.test(text)) {
    flags.push("Language suggesting guaranteed admission or zero requirements is a common fraud signal.");
  }
  if (opp.requirements.length === 0 && opp.eligibilitySummary.length < 80) {
    flags.push("Very limited eligibility information. Legitimate scholarships publish clear, detailed criteria.");
  }
  return flags;
}

const TYPE_LABELS: Record<string, string> = {
  scholarship: "Scholarship",
  study_program: "Study Program",
  immigration_pathway: "Immigration Pathway",
  incubator: "Incubator",
  fellowship: "Fellowship",
};

export default function OpportunityDetail({ initial }: { initial: Opportunity }) {
  const { user, refreshUser } = useAuth();
  const router = useRouter();

  const [opportunity, setOpportunity] = useState<Opportunity>(initial);
  const [generating, setGenerating] = useState(false);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(
    () => user?.savedOpportunities.some((s) => s.opportunity === initial._id) ?? false
  );
  const [checkedDocs, setCheckedDocs] = useState<string[]>(
    () => user?.savedOpportunities.find((s) => s.opportunity === initial._id)?.checkedDocs ?? [] as string[]
  );
  const [togglingDoc, setTogglingDoc] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const [coaches, setCoaches] = useState<HumanCoach[]>([]);
  const [bookingCoach, setBookingCoach] = useState<HumanCoach | null>(null);
  const [bookingType, setBookingType] = useState<"coaching" | "review">("coaching");
  const [bookingMsg, setBookingMsg] = useState("");
  const [bookingLoading, setBookingLoading] = useState(false);
  const [bookingDone, setBookingDone] = useState<string | null>(null);

  const [reportOpen, setReportOpen] = useState(false);
  const [reportType, setReportType] = useState("");
  const [reportDetails, setReportDetails] = useState("");
  const [reportLoading, setReportLoading] = useState(false);
  const [reportDone, setReportDone] = useState(false);

  useEffect(() => {
    const savedEntry = user?.savedOpportunities.find((s) => s.opportunity === initial._id);
    if (savedEntry) {
      setSaved(true);
      setCheckedDocs(savedEntry.checkedDocs ?? [] as string[]);
    }
  }, [user, initial._id]);

  useEffect(() => {
    api.get<{ coaches: HumanCoach[] }>(`/coaches?opportunityId=${initial._id}`, { auth: false })
      .then(({ coaches: c }) => setCoaches(c))
      .catch(() => {});
  }, [initial._id]);

  async function handleGenerateBreakdown() {
    setGenerating(true);
    setError(null);
    try {
      const data = await api.post<{ opportunity: Opportunity }>(
        `/opportunities/${opportunity._id}/breakdown`,
        undefined,
        { auth: false }
      );
      setOpportunity(data.opportunity);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Couldn't generate the breakdown right now.");
    } finally {
      setGenerating(false);
    }
  }


  async function handleSave() {
    if (!user) {
      router.push("/login");
      return;
    }
    setSaving(true);
    try {
      await api.post(`/opportunities/${opportunity._id}/save`);
      setSaved(true);
      await refreshUser();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Couldn't save this opportunity.");
    } finally {
      setSaving(false);
    }
  }

  async function handleToggleDoc(docId: string) {
    setTogglingDoc(docId);
    try {
      const data = await api.patch<{ checkedDocs: string[] }>(
        `/opportunities/${opportunity._id}/save/docs`,
        { docId }
      );
      setCheckedDocs(data.checkedDocs);
    } catch {
      // silent — UI stays in sync on next user load
    } finally {
      setTogglingDoc(null);
    }
  }

  async function handleBook() {
    if (!user) { router.push(`/login?next=/opportunities/${opportunity._id}`); return; }
    if (!bookingCoach) return;
    setBookingLoading(true);
    setError(null);
    try {
      const { paymentUrl } = await api.post<{ booking: any; paymentUrl: string | null }>("/coaches/bookings", {
        coachId: bookingCoach._id,
        opportunityId: opportunity._id,
        sessionType: bookingType,
        userMessage: bookingMsg || undefined,
      });
      if (paymentUrl) {
        window.location.href = paymentUrl;
      } else {
        // dev fallback — no Stripe configured
        setBookingDone(bookingCoach.name);
        setBookingCoach(null);
        setBookingMsg("");
      }
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Booking failed. Try again.");
      setBookingLoading(false);
    }
  }

  async function handleReport() {
    if (!user) { router.push(`/login?next=/opportunities/${opportunity._id}`); return; }
    if (!reportType) return;
    setReportLoading(true);
    try {
      await api.post(`/opportunities/${opportunity._id}/report`, { type: reportType, details: reportDetails || undefined });
      setReportDone(true);
      setReportOpen(false);
      setReportType("");
      setReportDetails("");
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Failed to submit report.");
    } finally {
      setReportLoading(false);
    }
  }

  const hasBreakdown = Boolean(opportunity.strongApplicantProfile);
  const scamFlags = detectScamFlags(opportunity);
  const requiredDocs = opportunity.applicationProcess?.requiredDocuments ?? [];

  const closed = !!opportunity.deadline && new Date(opportunity.deadline).getTime() < Date.now();
  const day = (iso: string) =>
    new Date(iso).toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric", timeZone: "Africa/Lagos" });
  const levelLabel = opportunity.degreeLevel !== "none" ? levelByValue(opportunity.degreeLevel)?.label : undefined;
  const providerName = knownProvider(opportunity.provider);
  const overview = formatScraped(opportunity.objectives);
  const eligibility = sameText(opportunity.objectives, opportunity.eligibilitySummary) ? [] : formatScraped(opportunity.eligibilitySummary);

  const renderBlocks = (blocks: TextBlock[]) => (
    <div className="mt-3 space-y-3 max-w-prose">
      {blocks.map((b, i) => (
        <p key={i} className="text-ink-soft leading-relaxed">
          {b.label && <span className="font-semibold text-ink">{b.label}: </span>}
          {b.text}
        </p>
      ))}
    </div>
  );

  const facts: { label: string; value: React.ReactNode }[] = [
    {
      label: "Deadline",
      value: opportunity.deadline ? (
        <span className={closed ? "text-slate" : "text-ink"}>{closed ? `Closed ${day(opportunity.deadline)}` : day(opportunity.deadline)}</span>
      ) : (
        <span className="text-slate">To be announced</span>
      ),
    },
    ...(opportunity.applicationOpens && new Date(opportunity.applicationOpens).getTime() > Date.now()
      ? [{ label: "Opens", value: day(opportunity.applicationOpens) }]
      : []),
    ...(levelLabel ? [{ label: "Level", value: levelLabel }] : []),
    ...(opportunity.country && opportunity.country !== "Multiple" ? [{ label: "Country", value: opportunity.country }] : []),
    ...(providerName ? [{ label: "Provider", value: providerName }] : []),
    ...(opportunity.fieldsOfStudy?.length ? [{ label: "Fields", value: opportunity.fieldsOfStudy.slice(0, 4).join(", ") }] : []),
  ];

  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 py-8 sm:py-10">
      {scamFlags.length > 0 && (
        <div className="mb-8 bg-danger-soft p-4" style={{ borderRadius: "6px" }}>
          <p className="text-sm font-semibold text-danger mb-2">Verify before applying</p>
          <ul className="space-y-1.5">
            {scamFlags.map((flag, i) => (
              <li key={i} className="text-sm text-ink-soft flex gap-2">
                <span className="text-alert shrink-0">→</span> {flag}
              </li>
            ))}
          </ul>
          <p className="text-xs text-slate mt-3">
            Always verify through official government or university websites. If something feels wrong,{" "}
            <Link href="/mentor" className="text-forest underline">ask your mentor</Link>.
          </p>
        </div>
      )}


      <header>
        <p className="text-sm font-medium text-slate">
          {TYPE_LABELS[opportunity.type]}
          {opportunity.country && opportunity.country !== "Multiple" ? ` · ${opportunity.country}` : ""}
        </p>
        <h1 className="font-display text-3xl sm:text-4xl text-ink mt-2 leading-tight max-w-3xl">{opportunity.title}</h1>
        {(providerName || (opportunity.winCount ?? 0) > 0) && (
          <p className="mt-2 text-ink-soft flex flex-wrap items-center gap-x-4 gap-y-1">
            {providerName && <span>{providerName}</span>}
            {(opportunity.winCount ?? 0) > 0 && (
              <span className="inline-flex items-center gap-1.5 text-sm font-medium text-ok">
                <Trophy size={16} aria-hidden="true" />
                {opportunity.winCount} scholar{opportunity.winCount !== 1 ? "s" : ""} won this
              </span>
            )}
          </p>
        )}
      </header>

      <div className="mt-8 grid gap-10 lg:grid-cols-detail lg:gap-12 items-start">
        <div className="space-y-10 min-w-0">
          {overview.length > 0 && (
            <section>
              <h2 className="font-display text-xl text-ink">Overview</h2>
              {renderBlocks(overview)}
            </section>
          )}

          {eligibility.length > 0 && (
            <section>
              <h2 className="font-display text-xl text-ink">Who can apply</h2>
              {renderBlocks(eligibility)}
            </section>
          )}

          {opportunity.requirements.length > 0 && (
            <section>
              <h2 className="font-display text-xl text-ink">Requirements</h2>
              <ul className="mt-3 grid sm:grid-cols-2 gap-3">
                {opportunity.requirements.map((r, i) => (
                  <li key={i} className="case-card p-4">
                    <div className="flex items-start justify-between gap-3">
                      <p className="font-medium text-ink text-sm">{r.label}</p>
                      <span className={`shrink-0 text-xs font-semibold ${r.isHard ? "text-danger" : "text-slate"}`}>
                        {r.isHard ? "Required" : "Preferred"}
                      </span>
                    </div>
                    {r.detail && <p className="text-sm text-slate mt-1">{r.detail}</p>}
                  </li>
                ))}
              </ul>
            </section>
          )}

          {/* Document checklist — only shown when the user has saved this scholarship and it has required docs */}
          {saved && requiredDocs.length > 0 && (
            <section>
              <h2 className="font-display text-xl text-ink">Document checklist</h2>
              <p className="text-slate text-sm mt-3 mb-4">
                Track which documents you've gathered. Your progress is saved automatically.
              </p>
              <div className="space-y-2">
                {requiredDocs.map((doc) => {
                  const isDone = checkedDocs.includes(doc.docId);
                  const isToggling = togglingDoc === doc.docId;
                  return (
                    <button
                      key={doc.docId}
                      onClick={() => handleToggleDoc(doc.docId)}
                      disabled={isToggling}
                      className="w-full text-left flex items-start gap-3 p-4 case-card hover:border-forest transition-colors group"
                    >
                      <span
                        className="shrink-0 mt-0.5 w-5 h-5 rounded border flex items-center justify-center transition-colors"
                        style={
                          isDone
                            ? { background: "#15803d", borderColor: "#15803d" }
                            : { borderColor: "#cbd5e1" }
                        }
                      >
                        {isDone && <span className="text-white text-xs">✓</span>}
                      </span>
                      <div className="flex-1 min-w-0">
                        <p className={`text-sm font-medium ${isDone ? "line-through text-slate" : "text-ink"}`}>
                          {doc.label}
                          {doc.isRequired && (
                            <span className="ml-2 text-xs text-alert font-normal font-mono">required</span>
                          )}
                        </p>
                        <p className="text-xs text-slate mt-0.5 leading-relaxed">{doc.description}</p>
                        {doc.templateUrl && (
                          <a
                            href={doc.templateUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            onClick={(e) => e.stopPropagation()}
                            className="text-xs text-forest underline mt-1 inline-block"
                          >
                            Download template →
                          </a>
                        )}
                      </div>
                    </button>
                  );
                })}
              </div>
              {checkedDocs.filter((id) => requiredDocs.some((d) => d.docId === id)).length > 0 && (
                <p className="font-mono text-xs text-slate mt-3">
                  {checkedDocs.filter((id) => requiredDocs.some((d) => d.docId === id)).length} of {requiredDocs.length} documents gathered
                </p>
              )}
            </section>
          )}
  
  
          <section>
            <h2 className="font-display text-xl text-ink">
              What a strong applicant looks like
            </h2>
            {hasBreakdown ? (
              <p className="text-ink-soft mt-3 leading-relaxed">{opportunity.strongApplicantProfile}</p>
            ) : generating ? (
              <div className="mt-3 flex items-center gap-2">
                <span className="inline-block w-2 h-2 rounded-full bg-brass animate-pulse shrink-0" />
                <p className="text-slate text-sm font-mono">Generating breakdown…</p>
              </div>
            ) : (
              <div className="mt-3">
                <p className="text-slate text-sm mb-3">
                  Get an AI-authored summary of what a strong applicant for this opportunity looks like.
                </p>
                <button
                  onClick={handleGenerateBreakdown}
                  className="btn-secondary"
                >
                  Generate breakdown
                </button>
              </div>
            )}
          </section>
  
          {/* Human Coaches */}
          {coaches.length > 0 && (
            <section>
              <h2 className="font-display text-xl text-ink">
                Human coaches for this scholarship
              </h2>
              <p className="text-sm text-slate mt-3 mb-5">
                Work with someone who has been where you want to go (a scholarship alumnus or former selection panel member).
                All coaches are verified by the ScolarNav team.
              </p>
  
              {bookingDone && (
                <div className="mb-5 p-4 rounded-xl border border-forest bg-forest/5 text-sm text-forest">
                  Booking request sent to <strong>{bookingDone}</strong>. They will confirm a time and reach out to you.
                </div>
              )}
  
              <div className="grid sm:grid-cols-2 gap-4">
                {coaches.map((coach) => {
                  const userFee = coach.sessionFeeUSD + Math.round(coach.sessionFeeUSD * (coach.platformFeePercent / 100) * 100) / 100;
                  return (
                    <div key={coach._id} className="case-card p-5">
                      <div className="flex items-start gap-3">
                        <Link href={`/coaches/${coach._id}`} className="shrink-0">
                          {coach.photoUrl ? (
                            <img src={coach.photoUrl} alt={`Photo of coach ${coach.name}`} width={48} height={48} loading="lazy" className="w-12 h-12 rounded-full object-cover hover:opacity-80 transition-opacity" />
                          ) : (
                            <div className="w-12 h-12 rounded-full bg-rule flex items-center justify-center font-display text-lg text-slate hover:bg-rule/70 transition-colors">
                              {coach.name[0]}
                            </div>
                          )}
                        </Link>
                        <div className="flex-1 min-w-0">
                          <Link href={`/coaches/${coach._id}`} className="font-medium text-ink hover:text-forest transition-colors">
                            {coach.name}
                          </Link>
                          <p className="text-xs font-mono text-slate mt-0.5">
                            {coach.credential === "alumni" ? "Scholarship alumnus" : "Panel member"}
                            {coach.credentialYear ? ` · ${coach.credentialYear}` : ""}
                          </p>
                          {coach.averageRating && (
                            <p className="text-xs text-brass mt-0.5">
                              {"★".repeat(Math.round(coach.averageRating))} {coach.averageRating}/5
                              {coach.totalSessions > 0 && ` · ${coach.totalSessions} sessions`}
                            </p>
                          )}
                        </div>
                      </div>
                      <p className="text-sm text-ink-soft mt-3 leading-relaxed line-clamp-3">{coach.bio}</p>
                      <div className="flex items-center justify-between mt-4">
                        <p className="text-sm font-medium text-ink">${userFee.toFixed(0)}<span className="text-xs text-slate font-normal"> / session</span></p>
                        <div className="flex items-center gap-2">
                          <Link
                            href={`/coaches/${coach._id}`}
                            className="text-sm px-3 py-2 text-slate hover:text-ink transition-colors"
                          >
                            View profile
                          </Link>
                          <button
                            onClick={() => { setBookingCoach(coach); setBookingDone(null); }}
                            className="text-sm px-4 py-2 border border-forest text-forest hover:bg-forest hover:text-white transition-colors rounded-lg"
                          >
                            Book
                          </button>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
  
            </section>
          )}
  
          {coaches.length === 0 && (
            <section>
              <h2 className="font-display text-xl text-ink">Human coaches</h2>
              <p className="text-sm text-slate mt-3">
                No human coaches are available for this scholarship yet. Check back soon.
              </p>
            </section>
          )}
  
  
        </div>

        <aside aria-label="Key facts and actions" className="order-first lg:order-none lg:sticky lg:top-24 space-y-4">
          <div className="case-card p-5">
            <h2 className="font-display text-lg text-ink">At a glance</h2>
            <dl className="mt-3 divide-y divide-rule">
              {facts.map((f) => (
                <div key={f.label} className="flex items-start justify-between gap-4 py-2.5">
                  <dt className="text-sm text-slate">{f.label}</dt>
                  <dd className="text-sm font-medium text-right">{f.value}</dd>
                </div>
              ))}
            </dl>
          </div>

          <div className="flex flex-col gap-2.5">
            <Link href={`/applications/${opportunity._id}`} className="btn-primary">
              Get personalized coaching
            </Link>
            <button onClick={handleSave} disabled={saved || saving} className="btn-secondary">
              {saved ? "Saved to your case files" : saving ? "Saving…" : "Save to case files"}
            </button>
            {opportunity.requiresInterview === false ? (
              <p className="text-sm text-slate text-center py-2">No interview stage for this opportunity.</p>
            ) : (
              <Link href={`/interview?opportunity=${opportunity._id}`} className="btn-secondary">
                Practice interview
              </Link>
            )}
            <a
              href={opportunity.officialUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center justify-center gap-1.5 min-h-touch text-sm font-medium text-forest hover:underline"
            >
              Official page
              <ExternalLink size={14} aria-hidden="true" />
            </a>
          </div>
        </aside>
      </div>

      <div className="mt-12 pt-6 border-t border-rule flex items-center justify-between gap-4">
        <p className="text-sm text-slate">See something wrong with this listing?</p>
        <button
          onClick={() => {
            if (!user) { router.push(`/login?next=/opportunities/${opportunity._id}`); return; }
            setReportOpen(true);
            setReportDone(false);
          }}
          className="text-sm text-slate hover:text-ink transition-colors underline min-h-touch px-1"
        >
          Report wrong data
        </button>
      </div>

      {reportDone && (
        <p className="text-forest text-sm mt-4">Thanks for reporting. We will review this shortly.</p>
      )}
      {error && <p className="text-alert text-sm mt-6">{error}</p>}

      {/* Booking modal */}
      {bookingCoach && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4"
          style={{ background: "rgba(0,0,0,0.45)" }}
          onClick={(e) => { if (e.target === e.currentTarget) setBookingCoach(null); }}
        >
          <div className="bg-white rounded-2xl p-5 sm:p-7 max-w-md w-full shadow-xl">
            <h3 className="font-display text-2xl text-ink mb-1">Book a session</h3>
            <p className="text-sm text-slate mb-5">with <span className="font-medium text-ink">{bookingCoach.name}</span></p>

            <div className="mb-5">
              <label className="block text-sm font-medium text-ink mb-2">Session type</label>
              <div className="flex flex-col sm:flex-row gap-3">
                {[
                  { value: "coaching", label: "Strategy coaching", sub: "Application strategy, essay direction, interview prep" },
                  { value: "review", label: "Document review", sub: "Feedback on your draft essays or application documents" },
                ].map((opt) => (
                  <button
                    key={opt.value}
                    type="button"
                    onClick={() => setBookingType(opt.value as any)}
                    className={`flex-1 text-left p-3 rounded-xl border text-sm transition-colors ${
                      bookingType === opt.value ? "border-forest bg-forest/5" : "border-rule hover:border-forest"
                    }`}
                  >
                    <p className="font-medium text-ink">{opt.label}</p>
                    <p className="text-xs text-slate mt-0.5 leading-snug">{opt.sub}</p>
                  </button>
                ))}
              </div>
            </div>

            <div className="mb-5">
              <label className="block text-sm font-medium text-ink mb-1.5">Message to coach <span className="text-slate font-normal">(optional)</span></label>
              <textarea
                rows={3}
                value={bookingMsg}
                onChange={(e) => setBookingMsg(e.target.value)}
                className="input resize-none"
                placeholder="Tell the coach briefly about where you are in the process…"
              />
            </div>

            <div className="flex items-center justify-between mb-5 p-3 bg-canvas rounded-xl text-sm">
              <span className="text-slate">Total</span>
              <span className="font-medium text-ink">
                ${(bookingCoach.sessionFeeUSD + Math.round(bookingCoach.sessionFeeUSD * (bookingCoach.platformFeePercent / 100) * 100) / 100).toFixed(0)}
              </span>
            </div>

            <div className="flex gap-3">
              <button
                onClick={() => setBookingCoach(null)}
                className="flex-1 btn-secondary"
              >
                Cancel
              </button>
              <button
                onClick={handleBook}
                disabled={bookingLoading}
                className="flex-1 btn-primary"
              >
                {bookingLoading ? "Sending…" : "Request session"}
              </button>
            </div>
            <p className="text-xs text-slate text-center mt-3">
              Payment is collected once the coach confirms. You won't be charged now.
            </p>
          </div>
        </div>
      )}

      {/* Report modal */}
      {reportOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4"
          style={{ background: "rgba(0,0,0,0.45)" }}
          onClick={(e) => { if (e.target === e.currentTarget) setReportOpen(false); }}
        >
          <div className="bg-white rounded-2xl p-5 sm:p-7 max-w-md w-full shadow-xl">
            <h3 className="font-display text-2xl text-ink mb-1">Report wrong data</h3>
            <p className="text-sm text-slate mb-5">Help us keep this listing accurate.</p>

            <div className="mb-5">
              <label className="block text-sm font-medium text-ink mb-2">What's wrong?</label>
              <div className="grid grid-cols-2 gap-2">
                {[
                  { value: "wrong_deadline", label: "Wrong deadline" },
                  { value: "wrong_country", label: "Wrong country" },
                  { value: "wrong_degree", label: "Wrong degree level" },
                  { value: "broken_link", label: "Broken link" },
                  { value: "inactive", label: "No longer active" },
                  { value: "wrong_info", label: "Other wrong info" },
                  { value: "other", label: "Other" },
                ].map((opt) => (
                  <button
                    key={opt.value}
                    type="button"
                    onClick={() => setReportType(opt.value)}
                    className={`text-left p-3 rounded-xl border text-xs transition-colors ${
                      reportType === opt.value ? "border-forest bg-forest/5 text-forest font-medium" : "border-rule text-ink-soft hover:border-forest"
                    }`}
                  >
                    {opt.label}
                  </button>
                ))}
              </div>
            </div>

            <div className="mb-5">
              <label className="block text-sm font-medium text-ink mb-1.5">
                Details <span className="text-slate font-normal">(optional)</span>
              </label>
              <textarea
                rows={3}
                value={reportDetails}
                onChange={(e) => setReportDetails(e.target.value)}
                className="input resize-none"
                placeholder="What's the correct information?"
                maxLength={500}
              />
            </div>

            <div className="flex gap-3">
              <button onClick={() => setReportOpen(false)} className="flex-1 btn-secondary">
                Cancel
              </button>
              <button
                onClick={handleReport}
                disabled={!reportType || reportLoading}
                className="flex-1 btn-primary"
              >
                {reportLoading ? "Sending…" : "Submit report"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
