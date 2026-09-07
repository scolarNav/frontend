"use client";

import { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { api, ApiError } from "@/lib/api";
import { useAuth } from "@/lib/auth-context";

interface PaymentRecord {
  gateway: "stripe" | "paystack";
  amountLocal: number;
  currency: string;
  paidAt: string;
  description: string;
  reference?: string;
}

interface AdminStats {
  totalUsers: number;
  proUsers: number;
  trialingUsers: number;
  totalOpportunities: number;
  totalApplications: number;
  totalCelebrations: number;
  pendingCelebrations: number;
  totalRevenueUSD: number;
  paystackRevenue: { currency: string; total: number; count: number }[];
  totalPaystackPayments: number;
}

interface DbHealth {
  open: number;
  openingSoon: number;
  tba: number;
  closed: number;
  inactive: number;
  active: number;
  duplicateTitleGroups: number;
  topCountries: { country: string; count: number }[];
  byType: { type: string; count: number }[];
}

interface AdminUser {
  _id: string;
  fullName: string;
  email: string;
  country?: string;
  isAdmin: boolean;
  coachingUsed: number;
  subscription: {
    plan: string;
    status: string;
    gateway?: string;
    currentPeriodEnd?: string;
  };
  paymentHistory: PaymentRecord[];
  createdAt: string;
}

interface AdminCelebration {
  _id: string;
  displayName: string;
  country?: string;
  opportunityTitle: string;
  opportunityProvider?: string;
  awardType: string;
  message: string;
  isApproved: boolean;
  isFeatured: boolean;
  createdAt: string;
  user?: { fullName: string; email: string };
}

interface Opportunity {
  _id: string;
  title: string;
  provider: string;
  type: string;
  country: string;
  degreeLevel?: string;
  fieldsOfStudy?: string[];
  deadline?: string;
  applicationOpens?: string;
  fundingCoverage?: string;
  objectives?: string;
  eligibilitySummary?: string;
  officialUrl?: string;
  requiresInterview?: boolean;
  isActive: boolean;
}

interface AdminCoach {
  _id: string;
  name: string;
  bio: string;
  photoUrl?: string;
  credential: "alumni" | "panel_member";
  credentialYear?: number;
  scholarships: { opportunityId: string; opportunityTitle: string }[];
  sessionFeeUSD: number;
  platformFeePercent: number;
  linkedIn?: string;
  status: "pending" | "approved" | "rejected";
  applicationNote?: string;
  rejectionNote?: string;
  totalSessions: number;
  averageRating?: number;
  createdAt: string;
}

interface AdminBooking {
  _id: string;
  userId: { _id: string; fullName: string; email: string };
  coachId: { _id: string; name: string };
  opportunityId?: { _id: string; title: string };
  sessionType: "coaching" | "review";
  status: "requested" | "accepted" | "completed" | "cancelled";
  totalAmountUSD: number;
  coachPayoutUSD: number;
  platformFeeUSD: number;
  userMessage?: string;
  scheduledAt?: string;
  rating?: number;
  ratingComment?: string;
  createdAt: string;
}

type Tab = "stats" | "analytics" | "database" | "opportunities" | "users" | "celebrations" | "coaches";

function trialDaysLeft(periodEnd?: string): number | null {
  if (!periodEnd) return null;
  const ms = new Date(periodEnd).getTime() - Date.now();
  return Math.max(0, Math.ceil(ms / (1000 * 60 * 60 * 24)));
}

function userRevenue(history: PaymentRecord[]): {
  usdTotal: number;
  paystackByCurrency: { currency: string; total: number; count: number }[];
} {
  let usdTotal = 0;
  const paystackMap: Record<string, { total: number; count: number }> = {};
  for (const p of history) {
    if (p.gateway === "stripe" && p.currency === "usd") usdTotal += p.amountLocal / 100;
    if (p.gateway === "paystack" && p.amountLocal > 0) {
      const key = p.currency.toUpperCase();
      if (!paystackMap[key]) paystackMap[key] = { total: 0, count: 0 };
      paystackMap[key].total += p.amountLocal / 100;
      paystackMap[key].count++;
    }
  }
  return {
    usdTotal,
    paystackByCurrency: Object.entries(paystackMap).map(([currency, v]) => ({ currency, ...v })),
  };
}

function oppStatus(opp: Opportunity): "open" | "opening" | "tba" | "closed" {
  const now = Date.now();
  if (!opp.deadline && !opp.applicationOpens) return "tba";
  if (opp.applicationOpens && new Date(opp.applicationOpens).getTime() > now) return "opening";
  if (opp.deadline && new Date(opp.deadline).getTime() > now) return "open";
  return "closed";
}

const STATUS_BADGE: Record<string, string> = {
  open: "bg-green-100 text-green-800",
  opening: "bg-blue-100 text-blue-800",
  tba: "bg-amber-100 text-amber-800",
  closed: "bg-red-100 text-red-800",
};
const STATUS_LABEL: Record<string, string> = {
  open: "OPEN",
  opening: "OPENING",
  tba: "TBA",
  closed: "CLOSED",
};

function CoachCard({
  coach,
  onUpdate,
  onDelete,
}: {
  coach: AdminCoach;
  onUpdate: (update: any) => void;
  onDelete: () => void;
}) {
  const [rejectionNote, setRejectionNote] = useState("");
  const [feeEdit, setFeeEdit] = useState(false);
  const [feeVal, setFeeVal] = useState(String(coach.platformFeePercent));
  const [expanded, setExpanded] = useState(false);

  return (
    <div className="case-card overflow-hidden">
      <div className="p-5 flex items-start gap-4 cursor-pointer" onClick={() => setExpanded((x) => !x)}>
        {coach.photoUrl ? (
          <img src={coach.photoUrl} alt={coach.name} className="w-10 h-10 rounded-full object-cover shrink-0" />
        ) : (
          <div className="w-10 h-10 rounded-full bg-rule flex items-center justify-center shrink-0 font-display text-sm text-slate">{coach.name[0]}</div>
        )}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <p className="font-medium text-ink text-sm">{coach.name}</p>
            <span className={`text-xs font-mono px-2 py-0.5 ${coach.status === "approved" ? "bg-green-100 text-green-800" : coach.status === "rejected" ? "bg-red-100 text-red-800" : "bg-amber-100 text-amber-800"}`}>
              {coach.status.toUpperCase()}
            </span>
            <span className="text-xs text-slate font-mono">{coach.credential === "alumni" ? "Alumnus" : "Panel member"}{coach.credentialYear ? ` · ${coach.credentialYear}` : ""}</span>
          </div>
          <p className="text-xs text-slate font-mono mt-0.5">
            Fee: ${coach.sessionFeeUSD} + {coach.platformFeePercent}% platform · {coach.scholarships.length} scholarship{coach.scholarships.length !== 1 ? "s" : ""}
            {coach.totalSessions > 0 && ` · ${coach.totalSessions} sessions`}
          </p>
          <p className="text-xs text-slate font-mono mt-0.5">{new Date(coach.createdAt).toLocaleDateString()}</p>
        </div>
        <span className="text-slate text-xs font-mono mt-1">{expanded ? "▲" : "▼"}</span>
      </div>

      {expanded && (
        <div className="border-t border-rule px-5 py-4 bg-surface/30 space-y-4">
          <div>
            <p className="text-xs font-mono text-slate uppercase mb-1">Bio</p>
            <p className="text-sm text-ink-soft leading-relaxed">{coach.bio}</p>
          </div>
          {coach.applicationNote && (
            <div>
              <p className="text-xs font-mono text-slate uppercase mb-1">Why qualified</p>
              <p className="text-sm text-ink-soft leading-relaxed">{coach.applicationNote}</p>
            </div>
          )}
          <div>
            <p className="text-xs font-mono text-slate uppercase mb-1">Scholarships</p>
            <div className="flex flex-wrap gap-1">
              {coach.scholarships.map((s) => (
                <span key={s.opportunityId} className="text-xs border border-rule px-2 py-0.5 text-ink-soft">{s.opportunityTitle}</span>
              ))}
            </div>
          </div>
          {coach.linkedIn && (
            <p className="text-xs font-mono text-slate">LinkedIn: <a href={coach.linkedIn} target="_blank" rel="noreferrer" className="underline">{coach.linkedIn}</a></p>
          )}

          {/* Platform fee editor */}
          <div className="flex items-center gap-2">
            <p className="text-xs font-mono text-slate uppercase">Platform fee %</p>
            {feeEdit ? (
              <>
                <input type="number" value={feeVal} onChange={(e) => setFeeVal(e.target.value)} className="input w-20 text-xs" min={0} max={100} />
                <button onClick={() => { onUpdate({ platformFeePercent: Number(feeVal) }); setFeeEdit(false); }} className="text-xs border border-ink px-2 py-1">Save</button>
                <button onClick={() => setFeeEdit(false)} className="text-xs text-slate underline">Cancel</button>
              </>
            ) : (
              <>
                <span className="text-xs font-mono text-ink">{coach.platformFeePercent}%</span>
                <button onClick={() => setFeeEdit(true)} className="text-xs text-slate underline">Edit</button>
              </>
            )}
          </div>

          {/* Actions */}
          <div className="flex flex-wrap gap-3 pt-2">
            {coach.status !== "approved" && (
              <button onClick={() => onUpdate({ status: "approved", rejectionNote: undefined })} className="text-xs border border-forest text-forest px-3 py-1.5 hover:bg-forest hover:text-white transition-colors">Approve</button>
            )}
            {coach.status !== "rejected" && (
              <div className="flex gap-2 items-center">
                <input
                  value={rejectionNote}
                  onChange={(e) => setRejectionNote(e.target.value)}
                  placeholder="Rejection reason (optional)"
                  className="input text-xs w-52"
                />
                <button onClick={() => onUpdate({ status: "rejected", rejectionNote: rejectionNote || undefined })} className="text-xs border border-alert text-alert px-3 py-1.5 hover:bg-alert hover:text-white transition-colors">Reject</button>
              </div>
            )}
            <button onClick={onDelete} className="text-xs text-slate underline">Delete profile</button>
          </div>
        </div>
      )}
    </div>
  );
}

export default function AdminPage() {
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();
  const [tab, setTab] = useState<Tab>("stats");

  const [stats, setStats] = useState<AdminStats | null>(null);
  const [dbHealth, setDbHealth] = useState<DbHealth | null>(null);
  const [dbHealthLoading, setDbHealthLoading] = useState(false);

  const [users, setUsers] = useState<AdminUser[]>([]);
  const [userSearch, setUserSearch] = useState("");
  const [userSearchResults, setUserSearchResults] = useState<AdminUser[] | null>(null);
  const [userSearching, setUserSearching] = useState(false);

  const [opportunities, setOpportunities] = useState<Opportunity[]>([]);
  const [oppTotal, setOppTotal] = useState(0);
  const [oppPage, setOppPage] = useState(1);
  const [oppPages, setOppPages] = useState(1);
  const [oppSearch, setOppSearch] = useState("");
  const [oppStatusFilter, setOppStatusFilter] = useState<"all" | "open" | "tba" | "closed">("all");
  const [oppCountryFilter, setOppCountryFilter] = useState("");
  const [oppTypeFilter, setOppTypeFilter] = useState("");
  const [oppLoading, setOppLoading] = useState(false);

  const [celebrations, setCelebrations] = useState<AdminCelebration[]>([]);
  const [coaches, setCoaches] = useState<AdminCoach[]>([]);
  const [coachStatusFilter, setCoachStatusFilter] = useState<"pending" | "approved" | "rejected">("pending");
  const [coachesLoading, setCoachesLoading] = useState(false);
  const [bookings, setBookings] = useState<AdminBooking[]>([]);
  const [bookingsLoading, setBookingsLoading] = useState(false);
  const [analytics, setAnalytics] = useState<{
    signupsByWeek: { _id: string; count: number }[];
    revenueByWeek: { _id: string; totalUSD: number; count: number }[];
    bookingsByWeek: { _id: string; count: number; completed: number }[];
    planBreakdown: { _id: string; count: number }[];
  } | null>(null);
  const [analyticsLoading, setAnalyticsLoading] = useState(false);
  const [coachSubTab, setCoachSubTab] = useState<"applications" | "bookings">("applications");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [actionMsg, setActionMsg] = useState<string | null>(null);
  const [expandedUser, setExpandedUser] = useState<string | null>(null);

  // Opportunity form
  const [showOppForm, setShowOppForm] = useState(false);
  const [editingOpp, setEditingOpp] = useState<Opportunity | null>(null);
  const [oppForm, setOppForm] = useState({
    title: "", provider: "", type: "scholarship", country: "",
    degreeLevel: "masters", fieldsOfStudy: "", deadline: "",
    applicationOpens: "", fundingCoverage: "", objectives: "",
    eligibilitySummary: "", officialUrl: "", requiresInterview: false,
    isActive: true,
  });
  const [saving, setSaving] = useState(false);
  const [essayPrompts, setEssayPrompts] = useState<
    { promptId: string; label: string; question: string; maxCharacters: string; maxWords: string; guidance: string }[]
  >([]);

  useEffect(() => {
    if (!authLoading && (!user || !user.isAdmin)) router.push("/");
  }, [authLoading, user, router]);

  useEffect(() => {
    if (!user?.isAdmin) return;
    loadAll();
  }, [user]);

  async function loadAll() {
    setLoading(true);
    try {
      const [s, u, c] = await Promise.all([
        api.get<AdminStats>("/admin/stats"),
        api.get<{ users: AdminUser[] }>("/admin/users"),
        api.get<{ celebrations: AdminCelebration[] }>("/admin/celebrations"),
      ]);
      setStats(s);
      setUsers(u.users);
      setCelebrations(c.celebrations);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Failed to load admin data.");
    } finally {
      setLoading(false);
    }
  }

  async function loadDbHealth() {
    setDbHealthLoading(true);
    try {
      const h = await api.get<DbHealth>("/admin/db-health");
      setDbHealth(h);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Failed to load DB health.");
    } finally {
      setDbHealthLoading(false);
    }
  }

  useEffect(() => {
    if (tab === "database" && user?.isAdmin && !dbHealth) loadDbHealth();
  }, [tab, user]);

  async function loadCoaches(status: string) {
    setCoachesLoading(true);
    try {
      const { coaches: list } = await api.get<{ coaches: AdminCoach[] }>(`/admin/coaches?status=${status}`);
      setCoaches(list);
    } catch {
      setError("Failed to load coaches.");
    } finally {
      setCoachesLoading(false);
    }
  }

  async function loadBookings() {
    setBookingsLoading(true);
    try {
      const { bookings: list } = await api.get<{ bookings: AdminBooking[] }>("/admin/coaches/bookings");
      setBookings(list);
    } catch {
      setError("Failed to load bookings.");
    } finally {
      setBookingsLoading(false);
    }
  }

  useEffect(() => {
    if (tab === "coaches" && user?.isAdmin) {
      if (coachSubTab === "applications") loadCoaches(coachStatusFilter);
      else loadBookings();
    }
  }, [tab, coachSubTab, coachStatusFilter, user]);

  useEffect(() => {
    if (tab === "analytics" && user?.isAdmin && !analytics) {
      setAnalyticsLoading(true);
      api.get<typeof analytics>("/admin/analytics")
        .then((data) => setAnalytics(data))
        .catch(() => setError("Failed to load analytics."))
        .finally(() => setAnalyticsLoading(false));
    }
  }, [tab, user]);

  async function handleCoachUpdate(id: string, update: Partial<Pick<AdminCoach, "status" | "rejectionNote" | "platformFeePercent" | "sessionFeeUSD">>) {
    try {
      const { coach } = await api.patch<{ coach: AdminCoach }>(`/admin/coaches/${id}`, update);
      setCoaches((prev) => prev.map((c) => c._id === id ? coach : c));
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Failed to update coach.");
    }
  }

  async function handleDeleteCoach(id: string) {
    if (!confirm("Delete this coach profile permanently?")) return;
    try {
      await api.delete(`/admin/coaches/${id}`);
      setCoaches((prev) => prev.filter((c) => c._id !== id));
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Failed to delete coach.");
    }
  }

  async function handleBookingUpdate(id: string, status: "accepted" | "completed" | "cancelled") {
    try {
      const { booking } = await api.patch<{ booking: AdminBooking }>(`/admin/bookings/${id}`, { status });
      setBookings((prev) => prev.map((b) => b._id === id ? booking : b));
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Failed to update booking.");
    }
  }

  const loadOpportunities = useCallback(async (search: string, page: number, status: string, country: string, type: string) => {
    setOppLoading(true);
    try {
      const params = new URLSearchParams({ limit: "50", page: String(page) });
      if (search.trim()) params.set("q", search.trim());
      if (country.trim()) params.set("country", country.trim());
      if (type) params.set("type", type);
      if (status === "open") params.set("openOnly", "true");
      const o = await api.get<{ opportunities: Opportunity[]; pagination: { total: number; pages: number } }>(
        `/opportunities?${params.toString()}`,
        { auth: false }
      );
      setOpportunities(o.opportunities);
      setOppTotal(o.pagination.total);
      setOppPages(o.pagination.pages);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Failed to load opportunities.");
    } finally {
      setOppLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!user?.isAdmin) return;
    if (tab === "opportunities") loadOpportunities(oppSearch, oppPage, oppStatusFilter, oppCountryFilter, oppTypeFilter);
  }, [tab, oppPage, oppStatusFilter, oppTypeFilter]);

  function notify(msg: string) {
    setActionMsg(msg);
    setTimeout(() => setActionMsg(null), 5000);
  }

  async function handleFixStaleDates() {
    if (!confirm("Set all past deadlines on active opportunities to null (TBA)? This cannot be undone.")) return;
    try {
      const r = await api.post<{ fixed: number }>("/admin/fix-stale-dates", {});
      notify(`Fixed ${r.fixed} stale deadlines → set to TBA. Refresh DB health to see updated counts.`);
      setDbHealth(null);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Fix failed.");
    }
  }

  async function handleReactivateInactive() {
    if (!confirm("Reactivate all inactive opportunities (set isActive=true and clear past deadlines)?")) return;
    try {
      const r = await api.post<{ reactivated: number }>("/admin/reactivate-inactive", {});
      notify(`Reactivated ${r.reactivated} opportunities.`);
      setDbHealth(null);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Reactivation failed.");
    }
  }

  async function handleDeduplicate() {
    if (!confirm("Deactivate duplicate-titled opportunities (keeps newest for each title)?")) return;
    try {
      const r = await api.post<{ deactivated: number; groups: number }>("/admin/deduplicate", {});
      notify(`Deactivated ${r.deactivated} duplicates across ${r.groups} title groups.`);
      setDbHealth(null);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Deduplication failed.");
    }
  }

  async function handleRunPrimary() {
    try {
      await api.post<{ started: boolean }>("/admin/scraper/run-primary", {});
      notify("Primary scholarship scraper started in background. Check server logs.");
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Failed to start scraper.");
    }
  }

  async function handleRunAggregator() {
    try {
      await api.post<{ started: boolean }>("/admin/scraper/run-aggregator", {});
      notify("Aggregator scraper started in background. Check server logs.");
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Failed to start scraper.");
    }
  }

  async function handleUserSearch(e: React.FormEvent) {
    e.preventDefault();
    if (!userSearch.trim()) { setUserSearchResults(null); return; }
    setUserSearching(true);
    try {
      const r = await api.get<{ users: AdminUser[] }>(`/admin/users/search?q=${encodeURIComponent(userSearch)}`);
      setUserSearchResults(r.users);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Search failed.");
    } finally {
      setUserSearching(false);
    }
  }

  function openNewOpp() {
    setEditingOpp(null);
    setOppForm({ title: "", provider: "", type: "scholarship", country: "", degreeLevel: "masters", fieldsOfStudy: "", deadline: "", applicationOpens: "", fundingCoverage: "", objectives: "", eligibilitySummary: "", officialUrl: "", requiresInterview: false, isActive: true });
    setEssayPrompts([]);
    setShowOppForm(true);
  }

  function openEditOpp(opp: Opportunity) {
    setEditingOpp(opp);
    setOppForm({
      title: opp.title,
      provider: opp.provider,
      type: opp.type,
      country: opp.country,
      degreeLevel: opp.degreeLevel ?? "masters",
      fieldsOfStudy: (opp.fieldsOfStudy ?? []).join(", "),
      deadline: opp.deadline ? opp.deadline.slice(0, 10) : "",
      applicationOpens: opp.applicationOpens ? opp.applicationOpens.slice(0, 10) : "",
      fundingCoverage: opp.fundingCoverage ?? "",
      objectives: opp.objectives ?? "",
      eligibilitySummary: opp.eligibilitySummary ?? "",
      officialUrl: opp.officialUrl ?? "",
      requiresInterview: opp.requiresInterview ?? false,
      isActive: opp.isActive,
    });
    setEssayPrompts([]);
    setShowOppForm(true);
  }

  async function handleSaveOpp(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError(null);
    try {
      const base = {
        title: oppForm.title,
        provider: oppForm.provider,
        type: oppForm.type,
        country: oppForm.country,
        degreeLevel: oppForm.degreeLevel,
        fieldsOfStudy: oppForm.fieldsOfStudy.split(",").map((s) => s.trim()).filter(Boolean),
        deadline: oppForm.deadline || null,
        applicationOpens: oppForm.applicationOpens || null,
        fundingCoverage: oppForm.fundingCoverage || undefined,
        objectives: oppForm.objectives || undefined,
        eligibilitySummary: oppForm.eligibilitySummary || undefined,
        officialUrl: oppForm.officialUrl || undefined,
        requiresInterview: oppForm.requiresInterview,
        isActive: oppForm.isActive,
      };

      const essayPromptsClean = essayPrompts
        .filter((p) => p.promptId && p.label && p.question)
        .map((p) => ({
          promptId: p.promptId, label: p.label, question: p.question,
          maxCharacters: p.maxCharacters ? parseInt(p.maxCharacters, 10) : undefined,
          maxWords: p.maxWords ? parseInt(p.maxWords, 10) : undefined,
          guidance: p.guidance || undefined,
        }));

      if (editingOpp) {
        const patch = Object.fromEntries(Object.entries({ ...base, ...(essayPromptsClean.length ? { essayPrompts: essayPromptsClean } : {}) }).filter(([, v]) => v !== "" && v !== undefined));
        await api.patch(`/admin/opportunities/${editingOpp._id}`, patch);
      } else {
        await api.post("/admin/opportunities", { ...base, requirements: [], essayPrompts: essayPromptsClean });
      }
      setShowOppForm(false);
      await loadOpportunities(oppSearch, oppPage, oppStatusFilter, oppCountryFilter, oppTypeFilter);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Failed to save opportunity.");
    } finally {
      setSaving(false);
    }
  }

  async function handleDeleteOpp(id: string) {
    if (!confirm("Deactivate this opportunity?")) return;
    try {
      await api.delete(`/admin/opportunities/${id}`);
      await loadOpportunities(oppSearch, oppPage, oppStatusFilter, oppCountryFilter, oppTypeFilter);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Failed to deactivate opportunity.");
    }
  }

  async function handleToggleActive(opp: Opportunity) {
    try {
      await api.patch(`/admin/opportunities/${opp._id}`, { isActive: !opp.isActive });
      await loadOpportunities(oppSearch, oppPage, oppStatusFilter, oppCountryFilter, oppTypeFilter);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Failed to update.");
    }
  }

  async function handleToggleAdmin(u: AdminUser) {
    try {
      await api.patch(`/admin/users/${u._id}/admin`, { isAdmin: !u.isAdmin });
      setUsers((prev) => prev.map((x) => x._id === u._id ? { ...x, isAdmin: !u.isAdmin } : x));
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Failed to update user.");
    }
  }

  async function handleCelebration(id: string, update: { isApproved?: boolean; isFeatured?: boolean }) {
    try {
      const { celebration } = await api.patch<{ celebration: AdminCelebration }>(`/admin/celebrations/${id}`, update);
      setCelebrations((prev) => prev.map((c) => c._id === id ? celebration : c));
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Failed to update celebration.");
    }
  }

  async function handleDeleteCelebration(id: string) {
    if (!confirm("Delete this celebration?")) return;
    try {
      await api.delete(`/admin/celebrations/${id}`);
      setCelebrations((prev) => prev.filter((c) => c._id !== id));
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Failed to delete.");
    }
  }

  if (authLoading || loading) {
    return <p className="max-w-5xl mx-auto px-4 py-20 text-slate font-mono text-sm">Loading admin panel…</p>;
  }

  if (!user?.isAdmin) return null;

  const displayedUsers = userSearchResults ?? users;

  const TABS: { key: Tab; label: string; badge?: number }[] = [
    { key: "stats", label: "Overview" },
    { key: "database", label: "Database" },
    { key: "opportunities", label: "Opportunities" },
    { key: "users", label: "Users", badge: users.length },
    { key: "celebrations", label: "Celebrations", badge: stats?.pendingCelebrations || undefined },
    { key: "analytics", label: "Analytics" },
    { key: "coaches", label: "Coaches" },
  ];

  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 py-8 sm:py-14">
      <p className="font-mono text-xs tracking-widest uppercase text-brass">Admin</p>
      <h1 className="font-display text-2xl sm:text-4xl text-ink mt-2">Control Panel</h1>

      {error && (
        <div className="mt-4 flex items-start justify-between gap-3 border border-alert bg-alert/5 px-4 py-3">
          <p className="text-alert text-sm">{error}</p>
          <button onClick={() => setError(null)} className="text-alert text-xs shrink-0">✕</button>
        </div>
      )}
      {actionMsg && (
        <div className="mt-4 border border-forest bg-forest/5 px-4 py-3">
          <p className="text-forest text-sm font-mono">{actionMsg}</p>
        </div>
      )}

      <div className="flex gap-1 mt-8 border-b border-rule overflow-x-auto">
        {TABS.map(({ key, label, badge }) => (
          <button
            key={key}
            onClick={() => setTab(key)}
            className={`px-4 py-2 text-sm font-mono transition-colors flex items-center gap-1.5 whitespace-nowrap ${
              tab === key ? "border-b-2 border-ink text-ink -mb-px" : "text-slate hover:text-ink"
            }`}
          >
            {label}
            {badge ? (
              <span className="text-xs bg-brass text-white px-1.5 py-0.5 rounded-full font-mono leading-none">
                {badge}
              </span>
            ) : null}
          </button>
        ))}
      </div>

      {/* ── Overview ── */}
      {tab === "stats" && stats && (
        <div className="mt-8 space-y-6">
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            {[
              { label: "Total users", value: stats.totalUsers },
              { label: "Pro subscribers", value: stats.proUsers },
              { label: "On free trial", value: stats.trialingUsers },
              { label: "Active opportunities", value: stats.totalOpportunities },
            ].map(({ label, value }) => (
              <div key={label} className="case-card p-5">
                <p className="text-xs font-mono text-slate uppercase tracking-wide">{label}</p>
                <p className="font-display text-3xl text-ink mt-1">{value}</p>
              </div>
            ))}
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            <div className="case-card p-5" style={{ borderLeft: "3px solid #6d8ec5" }}>
              <p className="text-xs font-mono text-slate uppercase tracking-wide">Stripe revenue (USD)</p>
              <p className="font-display text-3xl text-ink mt-1">${stats.totalRevenueUSD.toFixed(2)}</p>
            </div>
            <div className="case-card p-5">
              <p className="text-xs font-mono text-slate uppercase tracking-wide">Paystack revenue</p>
              {stats.paystackRevenue.length > 0 ? (
                <div className="mt-1 space-y-0.5">
                  {stats.paystackRevenue.map((r) => (
                    <p key={r.currency} className="font-display text-xl text-ink">
                      {r.total.toLocaleString(undefined, { maximumFractionDigits: 0 })} <span className="text-base">{r.currency}</span>
                      <span className="text-xs text-slate font-mono ml-2 align-middle">{r.count}×</span>
                    </p>
                  ))}
                </div>
              ) : (
                <p className="font-display text-3xl text-ink mt-1">—</p>
              )}
              <p className="text-xs text-slate font-mono mt-1">{stats.totalPaystackPayments} total payments</p>
            </div>
            <div className="case-card p-5">
              <p className="text-xs font-mono text-slate uppercase tracking-wide">Applications</p>
              <p className="font-display text-3xl text-ink mt-1">{stats.totalApplications}</p>
            </div>
            <div className="case-card p-5">
              <p className="text-xs font-mono text-slate uppercase tracking-wide">Winner celebrations</p>
              <p className="font-display text-3xl text-ink mt-1">{stats.totalCelebrations}</p>
              {stats.pendingCelebrations > 0 && (
                <p className="text-xs text-brass font-mono mt-1">{stats.pendingCelebrations} pending review</p>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ── Analytics ── */}
      {tab === "analytics" && (
        <div className="mt-8 space-y-8">
          {analyticsLoading && <p className="text-slate font-mono text-sm">Loading analytics...</p>}
          {analytics && (() => {
            const maxSignups = Math.max(...analytics.signupsByWeek.map((w) => w.count), 1);
            const maxRevenue = Math.max(...analytics.revenueByWeek.map((w) => w.totalUSD), 1);
            const proCount = analytics.planBreakdown.find((p) => p._id === "pro")?.count ?? 0;
            const freeCount = analytics.planBreakdown.find((p) => p._id === "free")?.count ?? 0;
            const totalPlans = proCount + freeCount || 1;
            const conversionRate = ((proCount / totalPlans) * 100).toFixed(1);

            return (
              <>
                {/* KPI row */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                  {[
                    { label: "Free users", value: freeCount },
                    { label: "Pro users", value: proCount },
                    { label: "Conversion rate", value: `${conversionRate}%` },
                    { label: "Total bookings (12w)", value: analytics.bookingsByWeek.reduce((s, w) => s + w.count, 0) },
                  ].map(({ label, value }) => (
                    <div key={label} className="case-card p-5">
                      <p className="text-xs font-mono text-slate uppercase tracking-wide">{label}</p>
                      <p className="font-display text-3xl text-ink mt-1">{value}</p>
                    </div>
                  ))}
                </div>

                {/* Sign-ups chart */}
                <div className="case-card p-6">
                  <p className="font-display text-lg text-ink mb-4">Weekly sign-ups (last 12 weeks)</p>
                  {analytics.signupsByWeek.length === 0 ? (
                    <p className="text-slate text-sm font-mono">No data yet.</p>
                  ) : (
                    <div className="flex items-end gap-1.5 h-28">
                      {analytics.signupsByWeek.map((w) => (
                        <div key={w._id} className="flex flex-col items-center gap-1 flex-1 min-w-0">
                          <div
                            className="w-full rounded-sm"
                            style={{ height: `${Math.max(4, (w.count / maxSignups) * 96)}px`, background: "#6d8ec5" }}
                            title={`${w._id}: ${w.count} sign-ups`}
                          />
                          <span className="text-xs font-mono text-slate truncate w-full text-center" style={{ fontSize: "9px" }}>{w._id.slice(-2)}</span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {/* Revenue chart */}
                <div className="case-card p-6">
                  <p className="font-display text-lg text-ink mb-1">Weekly Stripe revenue (USD, last 12w)</p>
                  <p className="text-xs text-slate font-mono mb-4">Total: ${analytics.revenueByWeek.reduce((s, w) => s + w.totalUSD, 0).toFixed(2)}</p>
                  {analytics.revenueByWeek.length === 0 ? (
                    <p className="text-slate text-sm font-mono">No Stripe payments recorded yet.</p>
                  ) : (
                    <div className="flex items-end gap-1.5 h-28">
                      {analytics.revenueByWeek.map((w) => (
                        <div key={w._id} className="flex flex-col items-center gap-1 flex-1 min-w-0">
                          <div
                            className="w-full rounded-sm"
                            style={{ height: `${Math.max(4, (w.totalUSD / maxRevenue) * 96)}px`, background: "#d3622c" }}
                            title={`${w._id}: $${w.totalUSD.toFixed(2)}`}
                          />
                          <span className="text-xs font-mono text-slate truncate w-full text-center" style={{ fontSize: "9px" }}>{w._id.slice(-2)}</span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {/* Booking volume */}
                {analytics.bookingsByWeek.length > 0 && (
                  <div className="case-card p-6">
                    <p className="font-display text-lg text-ink mb-4">Weekly coaching bookings</p>
                    <div className="space-y-2">
                      {analytics.bookingsByWeek.map((w) => (
                        <div key={w._id} className="flex items-center gap-3">
                          <span className="text-xs font-mono text-slate w-20 shrink-0">{w._id}</span>
                          <div className="flex-1 bg-surface rounded-full h-2 overflow-hidden">
                            <div
                              className="h-full rounded-full"
                              style={{ width: `${(w.count / Math.max(...analytics.bookingsByWeek.map((b) => b.count), 1)) * 100}%`, background: "#3d7a5a" }}
                            />
                          </div>
                          <span className="text-xs font-mono text-ink-soft w-8 text-right">{w.count}</span>
                          <span className="text-xs font-mono text-slate">{w.completed} done</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </>
            );
          })()}
        </div>
      )}

      {/* ── Database Health ── */}
      {tab === "database" && (
        <div className="mt-8 space-y-8">
          {dbHealthLoading ? (
            <p className="text-slate font-mono text-sm">Loading database health…</p>
          ) : dbHealth ? (
            <>
              {/* Status breakdown */}
              <div>
                <h2 className="font-display text-xl text-ink mb-4">Scholarship Status Breakdown</h2>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                  {[
                    { label: "Open now", value: dbHealth.open, color: "#15803d", hint: "Deadline in future, applications open" },
                    { label: "Opening soon", value: dbHealth.openingSoon, color: "#2563eb", hint: "Application window not yet open" },
                    { label: "Dates TBA", value: dbHealth.tba, color: "#b45309", hint: "No deadline stored — need date update" },
                    { label: "Closed (active)", value: dbHealth.closed, color: "#dc2626", hint: "Past deadline, still isActive=true" },
                    { label: "Inactive", value: dbHealth.inactive, color: "#94a3b8", hint: "isActive=false (90+ days past deadline)" },
                    { label: "Total active", value: dbHealth.active, color: "#1e293b", hint: "open + opening + TBA + closed" },
                  ].map(({ label, value, color, hint }) => (
                    <div key={label} className="case-card p-4" style={{ borderLeft: `3px solid ${color}` }}>
                      <p className="text-xs font-mono text-slate uppercase tracking-wide">{label}</p>
                      <p className="font-display text-3xl mt-1" style={{ color }}>{value}</p>
                      <p className="text-xs text-slate mt-1">{hint}</p>
                    </div>
                  ))}
                </div>
                {dbHealth.duplicateTitleGroups > 0 && (
                  <div className="mt-3 border border-brass/40 bg-brass/5 px-4 py-3">
                    <p className="text-sm text-brass font-mono">
                      ⚠ {dbHealth.duplicateTitleGroups} duplicate title groups detected — use "Deduplicate" below to clean up.
                    </p>
                  </div>
                )}
              </div>

              {/* Top countries */}
              <div>
                <h2 className="font-display text-lg text-ink mb-3">Top Countries in Database</h2>
                <div className="flex flex-wrap gap-2">
                  {dbHealth.topCountries.map(({ country, count }) => (
                    <span key={country} className="border border-rule px-3 py-1 text-xs font-mono text-ink-soft">
                      {country || "(none)"} <span className="text-slate">{count}</span>
                    </span>
                  ))}
                </div>
              </div>

              {/* By type */}
              <div>
                <h2 className="font-display text-lg text-ink mb-3">By Type</h2>
                <div className="flex flex-wrap gap-2">
                  {dbHealth.byType.map(({ type, count }) => (
                    <span key={type} className="border border-rule px-3 py-1 text-xs font-mono text-ink-soft">
                      {type} <span className="text-slate">{count}</span>
                    </span>
                  ))}
                </div>
              </div>
            </>
          ) : null}

          <button
            onClick={loadDbHealth}
            className="border border-rule text-ink-soft px-4 py-2 text-sm hover:border-forest hover:text-forest transition-colors font-mono"
          >
            ↻ Refresh health stats
          </button>

          {/* Quick actions */}
          <div>
            <h2 className="font-display text-xl text-ink mb-2">Quick Actions</h2>
            <p className="text-sm text-slate mb-4">
              Run these to clean up the database. <strong>Fix stale dates</strong> is the most important — it moves
              all past-dated scholarships from "closed" to "TBA" so they appear in searches again.
            </p>
            <div className="grid sm:grid-cols-2 gap-3">
              <div className="case-card p-4">
                <p className="font-medium text-sm text-ink">Fix stale dates</p>
                <p className="text-xs text-slate mt-1 mb-3">
                  Sets past deadlines on active records to null. Scholarships move from "closed" sort tier to "TBA"
                  tier and become discoverable again. Run this immediately if most scholarships show as closed.
                </p>
                <button
                  onClick={handleFixStaleDates}
                  className="bg-forest text-paper px-4 py-2 text-xs hover:bg-forest-light transition-colors font-mono"
                >
                  Run: Fix stale dates
                </button>
              </div>

              <div className="case-card p-4">
                <p className="font-medium text-sm text-ink">Reactivate inactive opportunities</p>
                <p className="text-xs text-slate mt-1 mb-3">
                  Re-enables all deactivated scholarships (isActive=false) and clears their past deadlines.
                  Use this if too many records were auto-deactivated by the 90-day cleanup job.
                </p>
                <button
                  onClick={handleReactivateInactive}
                  className="border border-forest text-forest px-4 py-2 text-xs hover:bg-forest hover:text-paper transition-colors font-mono"
                >
                  Run: Reactivate inactive
                </button>
              </div>

              <div className="case-card p-4">
                <p className="font-medium text-sm text-ink">Deduplicate by title</p>
                <p className="text-xs text-slate mt-1 mb-3">
                  Finds title groups with more than one record and deactivates all but the newest.
                  Safe to run — deactivated records are not deleted.
                </p>
                <button
                  onClick={handleDeduplicate}
                  className="border border-rule text-ink-soft px-4 py-2 text-xs hover:border-forest hover:text-forest transition-colors font-mono"
                >
                  Run: Deduplicate
                </button>
              </div>

              <div className="case-card p-4">
                <p className="font-medium text-sm text-ink">Run primary scraper</p>
                <p className="text-xs text-slate mt-1 mb-3">
                  Scrapes Chevening, DAAD, Commonwealth, Fulbright, Erasmus, Turkey, Hungary, Poland, Korea,
                  Japan, China, Italy, France, New Zealand, Norway, Taiwan, Canada (25 programmes). Runs in background.
                </p>
                <button
                  onClick={handleRunPrimary}
                  className="border border-rule text-ink-soft px-4 py-2 text-xs hover:border-forest hover:text-forest transition-colors font-mono"
                >
                  Run: Primary scraper
                </button>
              </div>

              <div className="case-card p-4">
                <p className="font-medium text-sm text-ink">Run aggregator scraper</p>
                <p className="text-xs text-slate mt-1 mb-3">
                  Scrapes scholars4dev.com sitemap for new scholarship pages. Runs up to 50 pages per run.
                  Only stores future deadlines.
                </p>
                <button
                  onClick={handleRunAggregator}
                  className="border border-rule text-ink-soft px-4 py-2 text-xs hover:border-forest hover:text-forest transition-colors font-mono"
                >
                  Run: Aggregator scraper
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ── Opportunities ── */}
      {tab === "opportunities" && (
        <div className="mt-6">
          <div className="flex flex-col gap-3 mb-4">
            {/* Search + new button */}
            <div className="flex gap-2 items-center justify-between">
              <form
                onSubmit={(e) => { e.preventDefault(); setOppPage(1); loadOpportunities(oppSearch, 1, oppStatusFilter, oppCountryFilter, oppTypeFilter); }}
                className="flex gap-2 flex-1 max-w-sm"
              >
                <input
                  value={oppSearch}
                  onChange={(e) => setOppSearch(e.target.value)}
                  placeholder="Search by title or keyword…"
                  className="input flex-1 text-sm"
                />
                <button type="submit" className="border border-rule text-ink-soft px-3 py-2 text-sm hover:border-forest hover:text-forest transition-colors">Search</button>
                {oppSearch && (
                  <button type="button" onClick={() => { setOppSearch(""); setOppPage(1); loadOpportunities("", 1, oppStatusFilter, oppCountryFilter, oppTypeFilter); }} className="text-xs text-slate underline px-1">Clear</button>
                )}
              </form>
              <div className="flex items-center gap-3 shrink-0">
                <p className="text-sm text-slate font-mono">{oppTotal} total</p>
                <button onClick={openNewOpp} className="bg-forest text-paper px-4 py-2 text-sm hover:bg-forest-light transition-colors">+ New</button>
              </div>
            </div>

            {/* Filters row */}
            <div className="flex flex-wrap gap-2 items-center">
              <select
                value={oppStatusFilter}
                onChange={(e) => { setOppStatusFilter(e.target.value as any); setOppPage(1); }}
                className="border border-rule bg-paper text-sm px-3 py-1.5 text-ink-soft font-mono focus:border-forest outline-none"
              >
                <option value="all">All statuses</option>
                <option value="open">Open now</option>
                <option value="tba">Dates TBA</option>
                <option value="closed">Closed</option>
              </select>
              <select
                value={oppTypeFilter}
                onChange={(e) => { setOppTypeFilter(e.target.value); setOppPage(1); }}
                className="border border-rule bg-paper text-sm px-3 py-1.5 text-ink-soft font-mono focus:border-forest outline-none"
              >
                <option value="">All types</option>
                <option value="scholarship">Scholarship</option>
                <option value="fellowship">Fellowship</option>
                <option value="study_program">Study Program</option>
                <option value="immigration_pathway">Immigration</option>
                <option value="incubator">Incubator</option>
              </select>
              <input
                value={oppCountryFilter}
                onChange={(e) => setOppCountryFilter(e.target.value)}
                onBlur={() => { setOppPage(1); loadOpportunities(oppSearch, 1, oppStatusFilter, oppCountryFilter, oppTypeFilter); }}
                placeholder="Filter by country…"
                className="border border-rule bg-paper text-sm px-3 py-1.5 font-mono focus:border-forest outline-none"
              />
            </div>
          </div>

          {showOppForm && (
            <form onSubmit={handleSaveOpp} className="case-card p-6 mb-6 space-y-4">
              <h2 className="font-display text-xl text-ink">{editingOpp ? "Edit opportunity" : "New opportunity"}</h2>
              <div className="grid sm:grid-cols-2 gap-4 p-4 bg-surface border border-rule">
                <div>
                  <label className="text-xs font-mono uppercase text-slate block mb-1">Applications Open</label>
                  <input type="date" value={oppForm.applicationOpens} onChange={(e) => setOppForm((p) => ({ ...p, applicationOpens: e.target.value }))} className="w-full border border-rule px-3 py-2 text-sm bg-transparent focus:border-forest outline-none" />
                  <p className="text-xs text-slate mt-1">When users can start applying</p>
                </div>
                <div>
                  <label className="text-xs font-mono uppercase text-slate block mb-1">Deadline</label>
                  <input type="date" value={oppForm.deadline} onChange={(e) => setOppForm((p) => ({ ...p, deadline: e.target.value }))} className="w-full border border-rule px-3 py-2 text-sm bg-transparent focus:border-forest outline-none" />
                  <p className="text-xs text-slate mt-1">Final submission date</p>
                </div>
                <div className="sm:col-span-2 flex items-center gap-6">
                  <label className="flex items-center gap-2 text-sm text-ink cursor-pointer">
                    <input type="checkbox" checked={oppForm.requiresInterview} onChange={(e) => setOppForm((p) => ({ ...p, requiresInterview: e.target.checked }))} className="w-4 h-4 accent-forest" />
                    Requires interview
                  </label>
                  <label className="flex items-center gap-2 text-sm text-ink cursor-pointer">
                    <input type="checkbox" checked={oppForm.isActive} onChange={(e) => setOppForm((p) => ({ ...p, isActive: e.target.checked }))} className="w-4 h-4 accent-forest" />
                    Active (visible to users)
                  </label>
                </div>
              </div>

              <div className="grid sm:grid-cols-2 gap-4">
                {(["title", "provider", "country", "officialUrl", "fundingCoverage", "fieldsOfStudy"] as const).map((field) => (
                  <div key={field}>
                    <label className="text-xs font-mono uppercase text-slate block mb-1">{field}</label>
                    <input
                      required={!editingOpp && ["title", "provider", "country", "officialUrl", "fieldsOfStudy"].includes(field)}
                      value={(oppForm as any)[field]}
                      onChange={(e) => setOppForm((p) => ({ ...p, [field]: e.target.value }))}
                      placeholder={field === "fieldsOfStudy" ? "comma-separated" : ""}
                      className="w-full border border-rule px-3 py-2 text-sm bg-transparent focus:border-forest outline-none"
                    />
                  </div>
                ))}
                <div>
                  <label className="text-xs font-mono uppercase text-slate block mb-1">Type</label>
                  <select value={oppForm.type} onChange={(e) => setOppForm((p) => ({ ...p, type: e.target.value }))} className="w-full border border-rule px-3 py-2 text-sm bg-paper focus:border-forest outline-none">
                    {["scholarship", "study_program", "immigration_pathway", "incubator", "fellowship"].map((t) => <option key={t} value={t}>{t}</option>)}
                  </select>
                </div>
                <div>
                  <label className="text-xs font-mono uppercase text-slate block mb-1">Degree Level</label>
                  <select value={oppForm.degreeLevel} onChange={(e) => setOppForm((p) => ({ ...p, degreeLevel: e.target.value }))} className="w-full border border-rule px-3 py-2 text-sm bg-paper focus:border-forest outline-none">
                    {["undergraduate", "masters", "phd", "postdoc", "professional", "none"].map((d) => <option key={d} value={d}>{d}</option>)}
                  </select>
                </div>
              </div>
              <div>
                <label className="text-xs font-mono uppercase text-slate block mb-1">Objectives</label>
                <textarea required={!editingOpp} rows={3} value={oppForm.objectives} onChange={(e) => setOppForm((p) => ({ ...p, objectives: e.target.value }))} className="w-full border border-rule px-3 py-2 text-sm bg-transparent focus:border-forest outline-none" />
              </div>
              <div>
                <label className="text-xs font-mono uppercase text-slate block mb-1">Eligibility Summary</label>
                <textarea required={!editingOpp} rows={3} value={oppForm.eligibilitySummary} onChange={(e) => setOppForm((p) => ({ ...p, eligibilitySummary: e.target.value }))} className="w-full border border-rule px-3 py-2 text-sm bg-transparent focus:border-forest outline-none" />
              </div>

              <div>
                <div className="flex items-center justify-between mb-2">
                  <label className="text-xs font-mono uppercase text-slate">Essay Prompts</label>
                  <button type="button" onClick={() => setEssayPrompts((p) => [...p, { promptId: "", label: "", question: "", maxCharacters: "", maxWords: "", guidance: "" }])} className="text-xs text-forest border border-forest px-2 py-1 hover:bg-forest hover:text-paper transition-colors">+ Add prompt</button>
                </div>
                {essayPrompts.length === 0 && <p className="text-xs text-slate font-mono">No essay prompts configured.</p>}
                {essayPrompts.map((p, i) => (
                  <div key={i} className="border border-rule p-4 mb-3 space-y-2">
                    <div className="grid grid-cols-2 gap-2">
                      <div><label className="text-xs text-slate font-mono block mb-1">ID (slug)</label><input value={p.promptId} onChange={(e) => setEssayPrompts((prev) => prev.map((x, j) => j === i ? { ...x, promptId: e.target.value } : x))} placeholder="e.g. why_sg" className="w-full border border-rule px-2 py-1.5 text-xs bg-transparent focus:border-forest outline-none" /></div>
                      <div><label className="text-xs text-slate font-mono block mb-1">Short label</label><input value={p.label} onChange={(e) => setEssayPrompts((prev) => prev.map((x, j) => j === i ? { ...x, label: e.target.value } : x))} placeholder="e.g. Why Singapore?" className="w-full border border-rule px-2 py-1.5 text-xs bg-transparent focus:border-forest outline-none" /></div>
                    </div>
                    <div><label className="text-xs text-slate font-mono block mb-1">Full question text</label><textarea rows={2} value={p.question} onChange={(e) => setEssayPrompts((prev) => prev.map((x, j) => j === i ? { ...x, question: e.target.value } : x))} className="w-full border border-rule px-2 py-1.5 text-xs bg-transparent focus:border-forest outline-none" /></div>
                    <div className="grid grid-cols-3 gap-2">
                      <div><label className="text-xs text-slate font-mono block mb-1">Max chars</label><input type="number" value={p.maxCharacters} onChange={(e) => setEssayPrompts((prev) => prev.map((x, j) => j === i ? { ...x, maxCharacters: e.target.value } : x))} className="w-full border border-rule px-2 py-1.5 text-xs bg-transparent focus:border-forest outline-none" /></div>
                      <div><label className="text-xs text-slate font-mono block mb-1">Max words</label><input type="number" value={p.maxWords} onChange={(e) => setEssayPrompts((prev) => prev.map((x, j) => j === i ? { ...x, maxWords: e.target.value } : x))} className="w-full border border-rule px-2 py-1.5 text-xs bg-transparent focus:border-forest outline-none" /></div>
                      <div><label className="text-xs text-slate font-mono block mb-1">Guidance</label><input value={p.guidance} onChange={(e) => setEssayPrompts((prev) => prev.map((x, j) => j === i ? { ...x, guidance: e.target.value } : x))} className="w-full border border-rule px-2 py-1.5 text-xs bg-transparent focus:border-forest outline-none" /></div>
                    </div>
                    <button type="button" onClick={() => setEssayPrompts((prev) => prev.filter((_, j) => j !== i))} className="text-xs text-alert underline">Remove</button>
                  </div>
                ))}
              </div>

              <div className="flex gap-3">
                <button type="submit" disabled={saving} className="bg-forest text-paper px-5 py-2.5 text-sm hover:bg-forest-light transition-colors disabled:opacity-60">{saving ? "Saving…" : "Save"}</button>
                <button type="button" onClick={() => setShowOppForm(false)} className="border border-rule text-ink-soft px-5 py-2.5 text-sm">Cancel</button>
              </div>
            </form>
          )}

          {oppLoading ? (
            <div className="space-y-2">{[...Array(6)].map((_, i) => <div key={i} className="case-card p-4 animate-pulse h-14" />)}</div>
          ) : (
            <div className="space-y-2">
              {opportunities.length === 0 && <p className="text-slate text-sm font-mono py-4">No opportunities found.</p>}
              {opportunities.map((opp) => {
                const status = oppStatus(opp);
                return (
                  <div key={opp._id} className={`case-card p-4 flex flex-col sm:flex-row sm:items-center gap-3 ${!opp.isActive ? "opacity-50" : ""}`}>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <p className="font-medium text-ink text-sm truncate">{opp.title}</p>
                        <span className={`text-xs font-mono px-1.5 py-0.5 rounded ${STATUS_BADGE[status]}`}>{STATUS_LABEL[status]}</span>
                        {!opp.isActive && <span className="text-xs font-mono text-alert">INACTIVE</span>}
                      </div>
                      <p className="text-xs text-slate font-mono mt-0.5">
                        {opp.provider} · {opp.country} · {opp.type}
                        {opp.applicationOpens && ` · opens ${new Date(opp.applicationOpens).toLocaleDateString()}`}
                        {opp.deadline && ` · closes ${new Date(opp.deadline).toLocaleDateString()}`}
                        {!opp.applicationOpens && !opp.deadline && <span className="text-brass"> · dates TBA</span>}
                      </p>
                    </div>
                    <div className="flex gap-3 shrink-0">
                      <button onClick={() => openEditOpp(opp)} className="text-xs text-forest underline">Edit</button>
                      <button onClick={() => handleToggleActive(opp)} className="text-xs text-slate underline">
                        {opp.isActive ? "Deactivate" : "Reactivate"}
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {oppPages > 1 && (
            <div className="mt-6 flex items-center justify-center gap-2">
              <button onClick={() => setOppPage((p) => Math.max(1, p - 1))} disabled={oppPage === 1 || oppLoading} className="border border-rule text-ink-soft px-3 py-1.5 text-sm disabled:opacity-30 hover:border-forest hover:text-forest transition-colors">← Prev</button>
              <span className="font-mono text-sm text-slate">{oppPage} / {oppPages}</span>
              <button onClick={() => setOppPage((p) => Math.min(oppPages, p + 1))} disabled={oppPage === oppPages || oppLoading} className="border border-rule text-ink-soft px-3 py-1.5 text-sm disabled:opacity-30 hover:border-forest hover:text-forest transition-colors">Next →</button>
            </div>
          )}
        </div>
      )}

      {/* ── Users ── */}
      {tab === "users" && (
        <div className="mt-6 space-y-4">
          {/* Search */}
          <form onSubmit={handleUserSearch} className="flex gap-2 max-w-sm">
            <input
              value={userSearch}
              onChange={(e) => { setUserSearch(e.target.value); if (!e.target.value.trim()) setUserSearchResults(null); }}
              placeholder="Search by name or email…"
              className="input flex-1 text-sm"
            />
            <button type="submit" disabled={userSearching} className="border border-rule text-ink-soft px-3 py-2 text-sm hover:border-forest hover:text-forest transition-colors disabled:opacity-50">
              {userSearching ? "…" : "Search"}
            </button>
            {userSearchResults && (
              <button type="button" onClick={() => { setUserSearch(""); setUserSearchResults(null); }} className="text-xs text-slate underline px-1">Clear</button>
            )}
          </form>

          {userSearchResults && (
            <p className="text-xs text-slate font-mono">{userSearchResults.length} result{userSearchResults.length !== 1 ? "s" : ""} for "{userSearch}"</p>
          )}

          <div className="space-y-2">
            {displayedUsers.map((u) => {
              const { usdTotal, paystackByCurrency } = userRevenue(u.paymentHistory ?? []);
              const daysLeft = u.subscription.status === "trialing" ? trialDaysLeft(u.subscription.currentPeriodEnd) : null;
              const isExpanded = expandedUser === u._id;

              return (
                <div key={u._id} className="case-card overflow-hidden">
                  <div
                    className="p-4 flex flex-col sm:flex-row sm:items-center gap-3 cursor-pointer hover:bg-surface/50 transition-colors"
                    onClick={() => setExpandedUser(isExpanded ? null : u._id)}
                  >
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <p className="font-medium text-ink text-sm">{u.fullName}</p>
                        {u.isAdmin && <span className="text-xs font-mono text-brass">ADMIN</span>}
                        {u.country && <span className="text-xs text-slate font-mono">{u.country}</span>}
                      </div>
                      <p className="text-xs text-slate font-mono mt-0.5 truncate">
                        {u.email} · joined {new Date(u.createdAt).toLocaleDateString()}
                      </p>
                    </div>

                    <div className="flex items-center gap-2 flex-wrap shrink-0">
                      <span className={`text-xs font-mono px-2 py-0.5 border ${u.subscription.plan === "pro" ? "border-ink text-ink" : "border-rule text-slate"}`}>
                        {u.subscription.status === "trialing" ? "TRIAL" : u.subscription.plan.toUpperCase()}
                      </span>
                      {daysLeft !== null && (
                        <span className="text-xs font-mono" style={{ color: daysLeft <= 2 ? "#d3622c" : "#94a3b8" }}>{daysLeft}d left</span>
                      )}
                      {u.subscription.gateway && <span className="text-xs text-slate font-mono">{u.subscription.gateway}</span>}
                      {usdTotal > 0 && <span className="text-xs font-mono text-forest">${usdTotal.toFixed(2)}</span>}
                      {paystackByCurrency.map((r) => (
                        <span key={r.currency} className="text-xs font-mono text-brass">{r.total.toLocaleString(undefined, { maximumFractionDigits: 0 })} {r.currency}</span>
                      ))}
                      <span className="text-slate text-xs font-mono">{isExpanded ? "▲" : "▼"}</span>
                    </div>
                  </div>

                  {isExpanded && (
                    <div className="border-t border-rule px-4 py-4 bg-surface/30 space-y-4">
                      <div className="grid sm:grid-cols-3 gap-3">
                        <div>
                          <p className="text-xs font-mono text-slate uppercase mb-1">Plan status</p>
                          <p className="text-sm text-ink">{u.subscription.plan} · {u.subscription.status}</p>
                        </div>
                        {u.subscription.currentPeriodEnd && (
                          <div>
                            <p className="text-xs font-mono text-slate uppercase mb-1">{u.subscription.status === "trialing" ? "Trial ends" : "Period ends"}</p>
                            <p className="text-sm text-ink">{new Date(u.subscription.currentPeriodEnd).toLocaleDateString()}</p>
                          </div>
                        )}
                        <div>
                          <p className="text-xs font-mono text-slate uppercase mb-1">Coaching used</p>
                          <p className="text-sm text-ink">{u.coachingUsed}</p>
                        </div>
                      </div>

                      {u.paymentHistory && u.paymentHistory.length > 0 ? (
                        <div>
                          <p className="text-xs font-mono text-slate uppercase mb-2">Payment history</p>
                          <div className="space-y-1">
                            {[...u.paymentHistory].reverse().map((p, i) => (
                              <div key={i} className="flex items-center justify-between text-xs py-1.5 border-b border-rule last:border-0">
                                <div className="flex items-center gap-3">
                                  <span className="font-mono text-slate">{new Date(p.paidAt).toLocaleDateString()}</span>
                                  <span className="text-ink">{p.description}</span>
                                  <span className="font-mono text-xs text-slate">{p.gateway}</span>
                                </div>
                                <span className="font-mono text-ink font-medium">
                                  {p.gateway === "stripe" && p.currency === "usd"
                                    ? `$${(p.amountLocal / 100).toFixed(2)}`
                                    : `${(p.amountLocal / 100).toFixed(0)} ${p.currency.toUpperCase()}`}
                                </span>
                              </div>
                            ))}
                          </div>
                          {usdTotal > 0 && <p className="text-xs font-mono text-forest mt-2">Stripe total: ${usdTotal.toFixed(2)}</p>}
                          {paystackByCurrency.map((r) => (
                            <p key={r.currency} className="text-xs font-mono text-brass mt-1">
                              Paystack: {r.total.toLocaleString(undefined, { maximumFractionDigits: 0 })} {r.currency} ({r.count}×)
                            </p>
                          ))}
                        </div>
                      ) : (
                        <p className="text-xs text-slate font-mono">No payment records yet.</p>
                      )}

                      <div className="flex gap-3 pt-1">
                        <button onClick={() => handleToggleAdmin(u)} className="text-xs text-ink-soft underline">
                          {u.isAdmin ? "Remove admin" : "Make admin"}
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* ── Celebrations ── */}
      {/* ── Coaches ── */}
      {tab === "coaches" && (
        <div className="mt-6">
          {/* Sub-tabs */}
          <div className="flex gap-1 border-b border-rule mb-6">
            {(["applications", "bookings"] as const).map((st) => (
              <button
                key={st}
                onClick={() => setCoachSubTab(st)}
                className={`px-4 py-2 text-sm font-mono capitalize transition-colors ${coachSubTab === st ? "border-b-2 border-ink text-ink -mb-px" : "text-slate hover:text-ink"}`}
              >
                {st}
              </button>
            ))}
          </div>

          {coachSubTab === "applications" && (
            <div className="space-y-5">
              <div className="flex gap-2">
                {(["pending", "approved", "rejected"] as const).map((s) => (
                  <button
                    key={s}
                    onClick={() => setCoachStatusFilter(s)}
                    className={`text-xs font-mono px-3 py-1.5 border transition-colors capitalize ${coachStatusFilter === s ? "border-ink text-ink" : "border-rule text-slate hover:text-ink"}`}
                  >
                    {s}
                  </button>
                ))}
              </div>

              {coachesLoading && <p className="text-slate font-mono text-sm">Loading…</p>}
              {!coachesLoading && coaches.length === 0 && (
                <p className="text-slate font-mono text-sm">No {coachStatusFilter} coach applications.</p>
              )}

              {coaches.map((coach) => (
                <CoachCard
                  key={coach._id}
                  coach={coach}
                  onUpdate={(update) => handleCoachUpdate(coach._id, update)}
                  onDelete={() => handleDeleteCoach(coach._id)}
                />
              ))}
            </div>
          )}

          {coachSubTab === "bookings" && (
            <div className="space-y-3">
              {bookingsLoading && <p className="text-slate font-mono text-sm">Loading…</p>}
              {!bookingsLoading && bookings.length === 0 && <p className="text-slate font-mono text-sm">No bookings yet.</p>}
              {bookings.map((b) => (
                <div key={b._id} className="case-card p-5">
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div>
                      <div className="flex items-center gap-2 flex-wrap">
                        <p className="font-medium text-ink text-sm">{b.userId?.fullName ?? "—"}</p>
                        <span className="text-xs text-slate font-mono">{b.userId?.email}</span>
                        <span className={`text-xs font-mono px-2 py-0.5 ${
                          b.status === "completed" ? "bg-green-100 text-green-800" :
                          b.status === "accepted" ? "bg-blue-100 text-blue-800" :
                          b.status === "cancelled" ? "bg-red-100 text-red-800" :
                          "bg-amber-100 text-amber-800"
                        }`}>{b.status.toUpperCase()}</span>
                      </div>
                      <p className="text-xs text-slate font-mono mt-0.5">
                        Coach: {b.coachId?.name ?? "—"} · {b.sessionType} · ${b.totalAmountUSD} total (${b.coachPayoutUSD} to coach, ${b.platformFeeUSD} platform)
                      </p>
                      {b.opportunityId && <p className="text-xs text-slate font-mono mt-0.5">Scholarship: {b.opportunityId.title}</p>}
                      {b.userMessage && <p className="text-xs text-ink-soft mt-1 italic">"{b.userMessage}"</p>}
                      {b.rating && <p className="text-xs text-brass mt-0.5">{"★".repeat(b.rating)} · {b.ratingComment}</p>}
                    </div>
                    <div className="flex gap-2 flex-wrap">
                      {b.status === "requested" && (
                        <button onClick={() => handleBookingUpdate(b._id, "accepted")} className="text-xs border border-forest text-forest px-3 py-1.5 hover:bg-forest hover:text-white transition-colors">Accept</button>
                      )}
                      {b.status === "accepted" && (
                        <button onClick={() => handleBookingUpdate(b._id, "completed")} className="text-xs border border-ink text-ink px-3 py-1.5 hover:bg-ink hover:text-white transition-colors">Mark complete</button>
                      )}
                      {(b.status === "requested" || b.status === "accepted") && (
                        <button onClick={() => handleBookingUpdate(b._id, "cancelled")} className="text-xs text-alert underline">Cancel</button>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {tab === "celebrations" && (
        <div className="mt-6 space-y-3">
          {celebrations.length === 0 && <p className="text-slate font-mono text-sm">No celebrations submitted yet.</p>}
          {celebrations.map((c) => (
            <div key={c._id} className={`case-card p-5 ${!c.isApproved ? "opacity-60" : ""}`}>
              <div className="flex items-start justify-between gap-4">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <p className="font-medium text-ink text-sm">{c.displayName}</p>
                    {c.country && <span className="text-xs text-slate font-mono">{c.country}</span>}
                    <span className="text-xs font-mono text-slate">{new Date(c.createdAt).toLocaleDateString()}</span>
                    {c.isFeatured && <span className="text-xs font-mono text-slate border border-rule px-1.5 py-0.5">Featured</span>}
                    {!c.isApproved && <span className="text-xs font-mono bg-slate-100 text-slate px-1.5 py-0.5 rounded">Hidden</span>}
                  </div>
                  <p className="text-xs text-forest font-mono mt-0.5">{c.opportunityTitle}{c.opportunityProvider && ` · ${c.opportunityProvider}`}</p>
                  {c.user && <p className="text-xs text-slate font-mono mt-0.5">User: {c.user.fullName} ({c.user.email})</p>}
                  <p className="text-sm text-ink-soft mt-2 leading-relaxed">{c.message}</p>
                </div>
              </div>
              <div className="flex gap-3 mt-3 pt-3 border-t border-rule">
                <button onClick={() => handleCelebration(c._id, { isApproved: !c.isApproved })} className="text-xs underline text-ink-soft">
                  {c.isApproved ? "Hide" : "Approve"}
                </button>
                <button onClick={() => handleCelebration(c._id, { isFeatured: !c.isFeatured })} className="text-xs underline text-brass">
                  {c.isFeatured ? "Unfeature" : "Feature"}
                </button>
                <button onClick={() => handleDeleteCelebration(c._id)} className="text-xs underline text-alert">Delete</button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
