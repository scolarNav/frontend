"use client";

import { useCallback, useEffect, useState } from "react";
import { api, ApiError } from "@/lib/api";
import type { AdminPartner } from "@/lib/types";
import { Chip } from "@/components/ui/Chip";
import { Modal } from "@/components/ui/Modal";
import { Skeleton } from "@/components/ui/Skeleton";
import { Alert, EmptyState, ErrorState } from "@/components/ui/States";

interface ReportRow {
  _id: string;
  name?: string;
  status?: string;
  clicks: number;
  uniqueUsers: number;
  conversions: number;
  saleAmountUSD: number;
  commissionUSD: number;
}
interface Report {
  days: number;
  partners: ReportRow[];
  byTest: { _id: string; clicks: number }[];
}

const TESTS = ["ielts", "toefl", "duolingo", "pte", "gre", "gmat", "sat", "other"] as const;
const KINDS: { value: AdminPartner["kind"]; label: string }[] = [
  { value: "prep_centre", label: "Prep centre" },
  { value: "test_body", label: "Test provider" },
  { value: "online_course", label: "Online course" },
  { value: "other", label: "Other" },
];
const STATUS_BADGE = { active: "badge-ok", draft: "", paused: "badge-warn" } as const;

interface Draft {
  name: string;
  slug: string;
  kind: AdminPartner["kind"];
  tests: string[];
  countries: string;
  description: string;
  websiteUrl: string;
  affiliateUrl: string;
  deliveryModes: ("online" | "in_person")[];
  priceNote: string;
  discountCode: string;
  discountNote: string;
  commissionModel: "none" | "cpa" | "revshare" | "flat";
  commissionRate: string;
  commissionNotes: string;
  status: AdminPartner["status"];
  featured: boolean;
  sortOrder: string;
}

const blank: Draft = {
  name: "", slug: "", kind: "prep_centre", tests: [], countries: "*", description: "", websiteUrl: "", affiliateUrl: "",
  deliveryModes: ["online"], priceNote: "", discountCode: "", discountNote: "", commissionModel: "none", commissionRate: "",
  commissionNotes: "", status: "draft", featured: false, sortOrder: "100",
};

const toDraft = (p: AdminPartner): Draft => ({
  name: p.name, slug: p.slug, kind: p.kind, tests: p.tests, countries: p.countries.join(", "), description: p.description,
  websiteUrl: p.websiteUrl, affiliateUrl: p.affiliateUrl ?? "", deliveryModes: p.deliveryModes, priceNote: p.priceNote ?? "",
  discountCode: p.discountCode ?? "", discountNote: p.discountNote ?? "", commissionModel: p.commission?.model ?? "none",
  commissionRate: p.commission?.rate !== undefined ? String(p.commission.rate) : "", commissionNotes: p.commission?.notes ?? "",
  status: p.status, featured: p.featured, sortOrder: String(p.sortOrder),
});

const slugify = (s: string) => s.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");

function toBody(d: Draft) {
  const opt = (v: string) => v.trim() || undefined;
  return {
    name: d.name.trim(),
    slug: d.slug.trim(),
    kind: d.kind,
    tests: d.tests,
    countries: d.countries.split(",").map((c) => c.trim()).filter(Boolean),
    description: d.description.trim(),
    websiteUrl: d.websiteUrl.trim(),
    affiliateUrl: opt(d.affiliateUrl),
    deliveryModes: d.deliveryModes,
    priceNote: opt(d.priceNote),
    discountCode: opt(d.discountCode),
    discountNote: opt(d.discountNote),
    commission: {
      model: d.commissionModel,
      rate: d.commissionRate ? Number(d.commissionRate) : undefined,
      notes: opt(d.commissionNotes),
    },
    status: d.status,
    featured: d.featured,
    sortOrder: Number(d.sortOrder) || 100,
  };
}

const usd = (n: number) => `$${n.toFixed(2)}`;

function PartnerDialog({ partner, onClose, onSaved }: { partner: AdminPartner | null; onClose: () => void; onSaved: () => void }) {
  const [d, setD] = useState<Draft>(partner ? toDraft(partner) : blank);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const set = <K extends keyof Draft>(k: K, v: Draft[K]) => setD((prev) => ({ ...prev, [k]: v }));
  const toggle = <T extends string>(list: T[], item: T) => (list.includes(item) ? list.filter((x) => x !== item) : [...list, item]);

  async function save(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError(null);
    try {
      if (partner) await api.patch(`/admin/partners/${partner._id}`, toBody(d));
      else await api.post("/admin/partners", toBody(d));
      onSaved();
      onClose();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Could not save this partner.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <Modal open onClose={onClose} title={partner ? `Edit ${partner.name}` : "Add partner"}>
      <form onSubmit={save} className="space-y-4">
        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <label htmlFor="pt-name" className="label">Name</label>
            <input id="pt-name" required value={d.name} onChange={(e) => { set("name", e.target.value); if (!partner && !d.slug) set("slug", slugify(e.target.value)); }} className="input" />
          </div>
          <div>
            <label htmlFor="pt-slug" className="label">Slug</label>
            <input id="pt-slug" required value={d.slug} onChange={(e) => set("slug", slugify(e.target.value))} className="input" />
          </div>
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <label htmlFor="pt-kind" className="label">Type</label>
            <select id="pt-kind" value={d.kind} onChange={(e) => set("kind", e.target.value as Draft["kind"])} className="input">
              {KINDS.map((k) => <option key={k.value} value={k.value}>{k.label}</option>)}
            </select>
          </div>
          <div>
            <label htmlFor="pt-status" className="label">Status</label>
            <select id="pt-status" value={d.status} onChange={(e) => set("status", e.target.value as Draft["status"])} className="input">
              <option value="draft">Draft (hidden)</option>
              <option value="active">Active (shown to students)</option>
              <option value="paused">Paused (hidden)</option>
            </select>
          </div>
        </div>

        <fieldset>
          <legend className="label">Tests they cover</legend>
          <div className="flex flex-wrap gap-2">
            {TESTS.map((t) => <Chip key={t} active={d.tests.includes(t)} onClick={() => set("tests", toggle(d.tests, t))}>{t.toUpperCase()}</Chip>)}
          </div>
        </fieldset>

        <div>
          <label htmlFor="pt-countries" className="label">Countries served</label>
          <input id="pt-countries" value={d.countries} onChange={(e) => set("countries", e.target.value)} className="input" />
          <p className="help">Two-letter country codes separated by commas, for example NG, GH, KE. Use * for everywhere.</p>
        </div>

        <fieldset>
          <legend className="label">Delivery</legend>
          <div className="flex flex-wrap gap-2">
            <Chip active={d.deliveryModes.includes("online")} onClick={() => set("deliveryModes", toggle(d.deliveryModes, "online"))}>Online</Chip>
            <Chip active={d.deliveryModes.includes("in_person")} onClick={() => set("deliveryModes", toggle(d.deliveryModes, "in_person"))}>In person</Chip>
          </div>
        </fieldset>

        <div>
          <label htmlFor="pt-desc" className="label">Short description <span className="font-normal text-slate">(shown to students)</span></label>
          <textarea id="pt-desc" rows={2} maxLength={600} value={d.description} onChange={(e) => set("description", e.target.value)} className="textarea !min-h-0" />
        </div>

        <div>
          <label htmlFor="pt-web" className="label">Website</label>
          <input id="pt-web" type="url" required value={d.websiteUrl} onChange={(e) => set("websiteUrl", e.target.value)} className="input" />
        </div>
        <div>
          <label htmlFor="pt-aff" className="label">Affiliate link <span className="font-normal text-slate">(optional)</span></label>
          <input id="pt-aff" value={d.affiliateUrl} onChange={(e) => set("affiliateUrl", e.target.value)} className="input" />
          <p className="help">Use {"{clickId}"} and {"{userId}"} where the partner expects a tracking value. Students see a "partner link" notice when this is set.</p>
        </div>

        <div className="grid gap-4 sm:grid-cols-3">
          <div>
            <label htmlFor="pt-price" className="label">Price note</label>
            <input id="pt-price" maxLength={200} value={d.priceNote} onChange={(e) => set("priceNote", e.target.value)} className="input" />
          </div>
          <div>
            <label htmlFor="pt-code" className="label">Discount code</label>
            <input id="pt-code" maxLength={60} value={d.discountCode} onChange={(e) => set("discountCode", e.target.value)} className="input" />
          </div>
          <div>
            <label htmlFor="pt-dnote" className="label">Discount note</label>
            <input id="pt-dnote" maxLength={200} value={d.discountNote} onChange={(e) => set("discountNote", e.target.value)} className="input" />
          </div>
        </div>

        <fieldset className="rounded-lg bg-surface p-4">
          <legend className="label px-1">Commercial terms (admins only)</legend>
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label htmlFor="pt-cm" className="label">Model</label>
              <select id="pt-cm" value={d.commissionModel} onChange={(e) => set("commissionModel", e.target.value as Draft["commissionModel"])} className="input">
                <option value="none">None, plain referral</option>
                <option value="cpa">Fixed amount per sale</option>
                <option value="revshare">Percentage of sale</option>
                <option value="flat">Flat fee</option>
              </select>
            </div>
            <div>
              <label htmlFor="pt-cr" className="label">Rate or amount</label>
              <input id="pt-cr" type="number" min="0" step="any" value={d.commissionRate} onChange={(e) => set("commissionRate", e.target.value)} className="input" />
            </div>
          </div>
          <div className="mt-4">
            <label htmlFor="pt-cn" className="label">Notes</label>
            <input id="pt-cn" maxLength={500} value={d.commissionNotes} onChange={(e) => set("commissionNotes", e.target.value)} className="input" />
          </div>
        </fieldset>

        <div className="grid gap-4 sm:grid-cols-2">
          <label className="flex min-h-touch items-center gap-3 text-sm font-medium text-ink">
            <input type="checkbox" checked={d.featured} onChange={(e) => set("featured", e.target.checked)} className="h-5 w-5 accent-forest" />
            Feature at the top
          </label>
          <div>
            <label htmlFor="pt-order" className="label">Sort order</label>
            <input id="pt-order" type="number" value={d.sortOrder} onChange={(e) => set("sortOrder", e.target.value)} className="input" />
          </div>
        </div>

        {error && <Alert variant="danger">{error}</Alert>}
        <button type="submit" disabled={saving} aria-busy={saving} className="btn-primary btn-block">
          {saving ? "Saving" : partner ? "Save changes" : "Add partner"}
        </button>
      </form>
    </Modal>
  );
}

export default function PartnersPanel() {
  const [partners, setPartners] = useState<AdminPartner[] | null>(null);
  const [report, setReport] = useState<Report | null>(null);
  const [days, setDays] = useState(90);
  const [error, setError] = useState<string | null>(null);
  const [editing, setEditing] = useState<AdminPartner | "new" | null>(null);
  const [deleting, setDeleting] = useState<AdminPartner | null>(null);
  const [deleteBusy, setDeleteBusy] = useState(false);

  const load = useCallback(async () => {
    setError(null);
    try {
      const [list, rep] = await Promise.all([
        api.get<{ partners: AdminPartner[] }>("/admin/partners"),
        api.get<Report>(`/admin/partners/report?days=${days}`),
      ]);
      setPartners(list.partners);
      setReport(rep);
    } catch (e) {
      setError(e instanceof ApiError ? e.message : "Could not load partners.");
    }
  }, [days]);

  useEffect(() => {
    load();
  }, [load]);

  async function confirmDelete() {
    if (!deleting) return;
    setDeleteBusy(true);
    try {
      await api.delete(`/admin/partners/${deleting._id}`);
      setDeleting(null);
      await load();
    } catch (e) {
      setError(e instanceof ApiError ? e.message : "Could not delete this partner.");
      setDeleting(null);
    } finally {
      setDeleteBusy(false);
    }
  }

  if (error && !partners) return <div className="mt-8"><ErrorState title="Partners did not load" message={error} onRetry={load} /></div>;
  if (!partners) return <div className="mt-8"><Skeleton className="h-64" /></div>;

  const stats = new Map((report?.partners ?? []).map((r) => [r._id, r]));

  return (
    <div className="mt-8 space-y-10">
      <section aria-labelledby="partners-list">
        <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
          <p id="partners-list" className="max-w-xl text-sm text-slate">
            Language test prep centres and test providers shown to students who need a test. Only active partners appear.
          </p>
          <button type="button" onClick={() => setEditing("new")} className="btn-primary">Add partner</button>
        </div>

        {error && <Alert variant="danger" className="mb-4">{error}</Alert>}

        {partners.length === 0 ? (
          <EmptyState title="No partners yet" description="Add your first prep centre or test provider. Students will see it once you set it to active." action={<button type="button" onClick={() => setEditing("new")} className="btn-primary">Add partner</button>} />
        ) : (
          <div className="table-wrap">
            <table className="table">
              <thead>
                <tr>
                  <th scope="col">Partner</th>
                  <th scope="col">Tests</th>
                  <th scope="col">Status</th>
                  <th scope="col">Clicks</th>
                  <th scope="col">Sales</th>
                  <th scope="col"><span className="sr-only">Actions</span></th>
                </tr>
              </thead>
              <tbody>
                {partners.map((p) => {
                  const s = stats.get(p._id);
                  return (
                    <tr key={p._id}>
                      <td>
                        <p className="font-semibold text-ink">{p.name}</p>
                        <p className="text-slate">{p.affiliateUrl ? "Affiliate link" : "Plain referral"} · {p.countries.join(", ")}</p>
                      </td>
                      <td>{p.tests.map((t) => t.toUpperCase()).join(", ") || "None set"}</td>
                      <td><span className={`badge capitalize ${STATUS_BADGE[p.status]}`}>{p.status}</span></td>
                      <td className="tabular-nums">{s?.clicks ?? 0}</td>
                      <td className="tabular-nums">{s?.conversions ?? 0}</td>
                      <td>
                        <div className="flex gap-2">
                          <button type="button" onClick={() => setEditing(p)} className="btn-secondary btn-sm" aria-label={`Edit ${p.name}`}>Edit</button>
                          <button type="button" onClick={() => setDeleting(p)} className="btn-secondary btn-sm text-danger" aria-label={`Delete ${p.name}`}>Delete</button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </section>

      <section aria-labelledby="partners-report" className="space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h2 id="partners-report" className="h3">Clicks and conversions</h2>
          <div role="group" aria-label="Period" className="flex gap-2">
            {[30, 90, 365].map((p) => (
              <button
                key={p}
                type="button"
                aria-pressed={days === p}
                onClick={() => setDays(p)}
                className={`min-h-touch rounded-md px-4 text-sm font-semibold transition-colors duration-150 ${days === p ? "bg-navy text-white" : "bg-white text-ink-soft hover:bg-surface-2"}`}
              >
                {p} days
              </button>
            ))}
          </div>
        </div>

        {!report || report.partners.length === 0 ? (
          <p className="text-sm text-slate">No clicks in this period yet.</p>
        ) : (
          <div className="table-wrap">
            <table className="table">
              <thead>
                <tr>
                  <th scope="col">Partner</th>
                  <th scope="col">Clicks</th>
                  <th scope="col">Students</th>
                  <th scope="col">Sales</th>
                  <th scope="col">Sale value</th>
                  <th scope="col">Commission</th>
                </tr>
              </thead>
              <tbody>
                {report.partners.map((r) => (
                  <tr key={r._id}>
                    <td className="font-semibold text-ink">{r.name ?? "Removed partner"}</td>
                    <td className="tabular-nums">{r.clicks}</td>
                    <td className="tabular-nums">{r.uniqueUsers}</td>
                    <td className="tabular-nums">{r.conversions}</td>
                    <td className="tabular-nums">{usd(r.saleAmountUSD)}</td>
                    <td className="tabular-nums">{usd(r.commissionUSD)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {report && report.byTest.length > 0 && (
          <div>
            <h3 className="text-sm font-semibold text-ink">Tests students are sent off to prepare for</h3>
            <ul className="mt-2 flex flex-wrap gap-2">
              {report.byTest.map((t) => <li key={t._id} className="badge">{t._id.toUpperCase()}: {t.clicks}</li>)}
            </ul>
            <p className="mt-2 text-sm text-slate">Useful when you talk to a test body or prep centre about a partnership.</p>
          </div>
        )}
      </section>

      {editing && (
        <PartnerDialog
          partner={editing === "new" ? null : editing}
          onClose={() => setEditing(null)}
          onSaved={load}
        />
      )}

      <Modal open={!!deleting} onClose={() => setDeleting(null)} title="Delete this partner?">
        <p className="text-sm text-ink-soft">
          {deleting?.name} will be removed for good, and students will no longer see it. Past click records are kept. To hide it for now, set it to paused instead.
        </p>
        <div className="mt-6 flex gap-3">
          <button type="button" onClick={() => setDeleting(null)} className="btn-secondary flex-1">Keep partner</button>
          <button type="button" onClick={confirmDelete} disabled={deleteBusy} aria-busy={deleteBusy} className="btn-danger flex-1">
            {deleteBusy ? "Deleting" : `Delete ${deleting?.name ?? ""}`}
          </button>
        </div>
      </Modal>
    </div>
  );
}
