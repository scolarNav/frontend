"use client";

import { useState } from "react";
import { Check, ChevronDown, ClipboardCheck, Target, TrendingUp } from "lucide-react";
import { useRouter } from "next/navigation";
import { api, ApiError } from "@/lib/api";
import { useAuth } from "@/lib/auth-context";
import { usesPaystack, COUNTRIES } from "@/lib/countries";
import { Skeleton } from "@/components/ui/Skeleton";
import { Alert } from "@/components/ui/States";

const STRIPE_MONTHLY = process.env.NEXT_PUBLIC_STRIPE_PRICE_MONTHLY!;
const STRIPE_ANNUAL = process.env.NEXT_PUBLIC_STRIPE_PRICE_ANNUAL!;

const FREE_FEATURES = [
  "Browse the full scholarship catalogue",
  "Country guides for 10+ destinations",
  "Save opportunities and track status",
  "CV upload and parsing",
  "Dashboard and deadline tracker",
  "Readiness Score: one calculation",
  "Mentor: 5 questions to try it",
];

const PRO_FEATURES = [
  "Everything in Free",
  "Mentor: unlimited conversations",
  "My Roadmap: week-by-week application plan",
  "Mock Interview: practice with feedback",
  "For You: opportunities matched to your CV",
  "Readiness Score: unlimited refreshes",
  "Application coaching per opportunity",
];

export default function PricingPage() {
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();
  const [billing, setBilling] = useState<"monthly" | "annual">("annual");
  const [loading, setLoading] = useState<"monthly" | "annual" | "portal" | null>(null);
  const [error, setError] = useState<string | null>(null);

  const isPro = user?.subscription?.plan === "pro" && user?.subscription?.status === "active";
  const countryCode = user?.country || "";
  const usePaystack = usesPaystack(countryCode);
  // Treat user as Paystack if their gateway is paystack OR their country routes to Paystack.
  // This handles users who paid before gateway was stored, or haven't paid yet.
  const isPaystackUser = user?.subscription?.gateway === "paystack" || usePaystack;
  const countryName = COUNTRIES.find((c) => c.code === countryCode)?.name;

  const cancelAtPeriodEnd = user?.subscription?.cancelAtPeriodEnd;
  const periodEnd = user?.subscription?.currentPeriodEnd
    ? new Date(user.subscription.currentPeriodEnd).toLocaleDateString("en-GB", {
        day: "numeric", month: "long", year: "numeric",
      })
    : null;

  async function handleStripeCheckout(type: "monthly" | "annual") {
    if (!user) { router.push("/register"); return; }
    const priceId = type === "monthly" ? STRIPE_MONTHLY : STRIPE_ANNUAL;
    setLoading(type);
    setError(null);
    try {
      const { url } = await api.post<{ url: string }>("/billing/checkout", { priceId });
      window.location.href = url;
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Couldn't start checkout. Please try again.");
      setLoading(null);
    }
  }

  async function handlePaystackCheckout() {
    if (!user) { router.push("/register"); return; }
    setLoading("monthly");
    setError(null);
    try {
      const { url } = await api.post<{ url: string }>("/billing/paystack/checkout");
      window.location.href = url;
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Couldn't start checkout. Please try again.");
      setLoading(null);
    }
  }

  async function handleStripePortal() {
    setLoading("portal");
    try {
      const { url } = await api.post<{ url: string }>("/billing/portal");
      window.location.href = url;
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Couldn't open billing portal.");
      setLoading(null);
    }
  }

  async function handlePaystackCancel() {
    if (!confirm("Cancel your Pro subscription? You'll keep access until the end of your billing period.")) return;
    setLoading("portal");
    try {
      await api.post("/billing/paystack/cancel");
      window.location.href = "/dashboard";
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Couldn't cancel subscription.");
      setLoading(null);
    }
  }

  function handleCheckout(type: "monthly" | "annual") {
    if (usePaystack) handlePaystackCheckout();
    else handleStripeCheckout(type);
  }

  // Rendered in both states so the heading and intro are always in the server HTML.
  const header = (
    <div className="mx-auto max-w-xl text-center">
      <h1 className="h1">
        Better prepared.<br />Better odds.
      </h1>
      <p className="lead mx-auto mt-4">
        ScolarNav does not decide who gets the scholarship. Committees do. What we do is help you show up as the strongest version of yourself on paper.
      </p>
    </div>
  );

  // Don't render gateway-dependent UI until auth has resolved. This prevents Stripe
  // pricing flashing briefly for African users while the user object loads.
  if (authLoading) {
    return (
      <div className="page">
        {header}
        <div className="mx-auto mt-12 grid max-w-4xl gap-6 sm:grid-cols-2" role="status" aria-label="Loading plans">
          {[0, 1].map((i) => (
            <div key={i} aria-hidden="true" className="card card-pad space-y-4 sm:p-8">
              <Skeleton className="h-3 w-12" />
              <Skeleton className="h-10 w-24" />
              <Skeleton className="h-4 w-40" />
              <div className="space-y-3 pt-4">
                {[0, 1, 2, 3].map((j) => <Skeleton key={j} className="h-4 w-full" />)}
              </div>
              <Skeleton className="h-11 w-full" />
            </div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="page">
      {header}

      {/* What the product does, and what it does not promise */}
      <section className="card card-pad mx-auto mt-10 max-w-2xl" aria-labelledby="does-heading">
        <h2 id="does-heading" className="eyebrow mb-4">What ScolarNav actually does</h2>
        <ul className="grid gap-5 text-center sm:grid-cols-3">
          {[
            { Icon: ClipboardCheck, label: "Closes gaps", desc: "Shows you exactly what strong applicants have that you do not have yet." },
            { Icon: Target, label: "Saves time", desc: "Surfaces opportunities you are actually competitive for, not just broadly eligible." },
            { Icon: TrendingUp, label: "Builds strength", desc: "Helps you prepare, practise, and write at your best before you submit." },
          ].map(({ Icon, label, desc }) => (
            <li key={label}>
              <Icon size={24} className="mx-auto mb-2 text-forest" aria-hidden="true" />
              <p className="text-sm font-semibold text-ink">{label}</p>
              <p className="mt-1 text-sm leading-relaxed text-slate">{desc}</p>
            </li>
          ))}
        </ul>
        <p className="mt-5 border-t border-rule pt-4 text-center text-sm text-slate">
          Final scholarship decisions rest entirely with the awarding committee. No platform can guarantee an outcome.
        </p>
      </section>

      {/* Billing toggle: only for non-Paystack users */}
      {!usePaystack && (
        <div className="mt-12 flex justify-center">
          <div role="radiogroup" aria-label="Billing period" className="inline-flex gap-1 rounded-lg bg-surface-2 p-1">
            {(["monthly", "annual"] as const).map((p) => {
              const selected = billing === p;
              return (
                <button
                  key={p}
                  type="button"
                  role="radio"
                  aria-checked={selected}
                  onClick={() => setBilling(p)}
                  className={`min-h-touch rounded-md px-5 text-sm font-semibold transition-colors ${
                    selected ? "bg-white text-forest" : "text-slate hover:text-ink"
                  }`}
                >
                  {p === "monthly" ? "Monthly" : "Annual"}
                  {p === "annual" && <span className="ml-1.5 text-xs font-semibold text-ok">save 35%</span>}
                </button>
              );
            })}
          </div>
        </div>
      )}

      {countryName && (
        <p className="mt-3 text-center text-sm text-slate">
          Payment via {usePaystack ? "Paystack" : "Stripe"} · {countryName}
        </p>
      )}

      {error && <Alert variant="danger" className="mx-auto mt-4 max-w-xl">{error}</Alert>}

      {/* Plans */}
      <div className="mx-auto mt-8 grid max-w-4xl gap-6 sm:grid-cols-2">
        {/* Free */}
        <section className="card card-pad flex flex-col sm:p-8" aria-labelledby="free-heading">
          <h2 id="free-heading" className="eyebrow">Free</h2>
          <p className="mt-2 font-display text-4xl text-ink">{usePaystack ? "₦0" : "$0"}</p>
          <p className="mt-1 text-sm text-ink-soft">Forever. No card needed.</p>

          <ul className="mt-6 flex-1 space-y-2.5">
            {FREE_FEATURES.map((f) => (
              <li key={f} className="flex gap-2.5 text-sm text-ink-soft">
                <Check size={16} className="mt-0.5 shrink-0 text-forest" aria-hidden="true" />
                {f}
              </li>
            ))}
          </ul>

          <div className="mt-8">
            {!user ? (
              <button type="button" onClick={() => router.push("/register")} className="btn-secondary btn-block">
                Get started free
              </button>
            ) : (
              <p className="text-center text-sm text-slate">{isPro ? "Your previous plan" : "Your current plan"}</p>
            )}
          </div>
        </section>

        {/* Pro */}
        <section className="card card-pad flex flex-col ring-2 ring-forest sm:p-8" aria-labelledby="pro-heading">
          <div className="flex items-center justify-between">
            <h2 id="pro-heading" className="eyebrow text-forest">Pro</h2>
            {!usePaystack && <span className="badge badge-brand">7-day free trial</span>}
          </div>

          <div className="mt-3">
            {usePaystack ? (
              <>
                <div className="flex items-baseline gap-1.5">
                  <span className="font-display text-4xl text-ink">₦10,000</span>
                  <span className="text-sm text-ink-soft">first month</span>
                </div>
                <p className="mt-1.5 text-sm text-slate">then ₦5,000 a month, renewed automatically from your saved card</p>
              </>
            ) : billing === "monthly" ? (
              <>
                <span className="font-display text-4xl text-ink">$7</span>
                <span className="text-sm text-ink-soft"> / month</span>
                <p className="mt-1 text-sm text-slate">or $55 a year, save 35%</p>
              </>
            ) : (
              <>
                <span className="font-display text-4xl text-ink">$55</span>
                <span className="text-sm text-ink-soft"> / year</span>
                <p className="mt-1 text-sm text-slate">
                  <span className="mr-1 line-through">$84</span>
                  $4.58 a month, billed annually
                </p>
              </>
            )}
          </div>

          <ul className="mt-6 flex-1 space-y-2.5">
            {PRO_FEATURES.map((f) => (
              <li key={f} className="flex gap-2.5 text-sm text-ink-soft">
                <Check size={16} className="mt-0.5 shrink-0 text-forest" aria-hidden="true" />
                {f}
              </li>
            ))}
          </ul>

          <div className="mt-8 flex flex-col gap-3">
            {isPro ? (
              <>
                <div className="mb-1 text-center">
                  {cancelAtPeriodEnd ? (
                    <p className="text-sm text-slate">
                      Cancels {periodEnd ? `on ${periodEnd}` : "at the end of the billing period"}. Pro access remains until then.
                    </p>
                  ) : periodEnd ? (
                    <p className="text-sm text-slate">Renews automatically on {periodEnd}</p>
                  ) : null}
                </div>
                {isPaystackUser ? (
                  <button
                    type="button"
                    onClick={handlePaystackCancel}
                    disabled={loading !== null || !!cancelAtPeriodEnd}
                    aria-busy={loading === "portal"}
                    className="btn-secondary btn-block"
                  >
                    {loading === "portal" ? "Processing" : cancelAtPeriodEnd ? "Cancellation scheduled" : "Cancel subscription"}
                  </button>
                ) : (
                  <button type="button" onClick={handleStripePortal} disabled={loading !== null} aria-busy={loading === "portal"} className="btn-secondary btn-block">
                    {loading === "portal" ? "Redirecting" : "Manage subscription"}
                  </button>
                )}
              </>
            ) : (
              <>
                <button type="button" onClick={() => handleCheckout(billing)} disabled={loading !== null} aria-busy={loading !== null} className="btn-primary btn-block">
                  {loading
                    ? "Redirecting"
                    : usePaystack
                      ? "Subscribe: ₦10,000 first month"
                      : billing === "monthly"
                        ? "Start free trial, then $7/mo"
                        : "Start free trial, then $55/yr"}
                </button>
                <p className="text-center text-sm text-slate">
                  {usePaystack
                    ? "Renews at ₦5,000 a month. Cancel any time."
                    : "7 days free. No card required to trial. Cancel any time."}
                </p>
              </>
            )}
          </div>
        </section>
      </div>

      {/* FAQ */}
      <section className="mx-auto mt-16 max-w-2xl" aria-labelledby="faq-heading">
        <h2 id="faq-heading" className="h2 mb-5">Common questions</h2>
        <div className="space-y-3">
          {[
            {
              q: "Does ScolarNav guarantee I'll get a scholarship?",
              a: "No. Any platform that claims otherwise should be treated with suspicion. Scholarship committees make final decisions based on their own criteria. ScolarNav helps you understand those criteria, close the gaps in your profile, and submit the strongest application you can. That's all preparation can do, and it's worth a lot.",
            },
            {
              q: "How does billing work in Nigeria?",
              a: "Your first month is ₦10,000. From month 2 onwards, you're charged ₦5,000/month automatically from the card you paid with, no need to do anything. You can cancel at any time and keep Pro access until your current billing period ends.",
            },
            {
              q: "What happens when my subscription renews?",
              a: "Renewals are fully automatic. Paystack charges the card you used for your first payment on the same date each month. If the charge fails, you'll receive an email from Paystack, and your access will remain active during a short retry window.",
            },
            {
              q: "Can I pay in my local currency?",
              a: "Yes. We support local currency payments via Paystack (Naira, Cedis, Shillings, and more) as well as global card payments via Stripe in USD. Your payment gateway is selected automatically based on your country.",
            },
            {
              q: "What's the difference between Free and Pro, practically?",
              a: "Free lets you explore the catalogue, save opportunities, upload your CV, and get a taste of the mentor. Pro is where the preparation happens: your personalised plan, interview practice, coaching per opportunity, and unlimited mentor access.",
            },
            {
              q: "What if I can't afford Pro?",
              a: "Start with Free. It's genuinely useful on its own. Upgrade when you're ready to apply seriously, or when you've identified specific opportunities you want to prepare properly for.",
            },
          ].map(({ q, a }) => (
            <details key={q} className="card group">
              <summary className="flex min-h-touch cursor-pointer list-none items-center justify-between gap-3 px-5 py-3 text-sm font-semibold text-ink">
                {q}
                <ChevronDown size={18} className="shrink-0 text-slate transition-transform duration-150 group-open:rotate-180" aria-hidden="true" />
              </summary>
              <p className="px-5 pb-5 text-sm leading-relaxed text-ink-soft">{a}</p>
            </details>
          ))}
        </div>
      </section>

      <p className="mt-12 text-center text-sm text-slate">Secure payments · Cancel any time · No hidden fees</p>
    </div>
  );
}
