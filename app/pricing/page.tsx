"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { api, ApiError } from "@/lib/api";
import { useAuth } from "@/lib/auth-context";
import { usesPaystack, COUNTRIES } from "@/lib/countries";

const STRIPE_MONTHLY = process.env.NEXT_PUBLIC_STRIPE_PRICE_MONTHLY!;
const STRIPE_ANNUAL = process.env.NEXT_PUBLIC_STRIPE_PRICE_ANNUAL!;
const PAYSTACK_MONTHLY = process.env.NEXT_PUBLIC_PAYSTACK_PLAN_MONTHLY!;
const PAYSTACK_ANNUAL = process.env.NEXT_PUBLIC_PAYSTACK_PLAN_ANNUAL!;

const FREE_FEATURES = [
  "Browse the full scholarship catalogue",
  "Country guides for 10+ destinations",
  "Save opportunities and track status",
  "CV upload and parsing",
  "Dashboard and deadline tracker",
  "Readiness Score — one calculation",
  "Mentor — 5 questions to try it",
];

const PRO_FEATURES = [
  "Everything in Free",
  "Mentor — unlimited conversations",
  "My Roadmap — week-by-week application plan",
  "Mock Interview — practice with feedback",
  "For You — opportunities matched to your CV",
  "Readiness Score — unlimited refreshes",
  "Application coaching per opportunity",
  "7-day free trial — no card required",
];

export default function PricingPage() {
  const { user } = useAuth();
  const router = useRouter();
  const [billing, setBilling] = useState<"monthly" | "annual">("annual");
  const [loading, setLoading] = useState<"monthly" | "annual" | "portal" | null>(null);
  const [error, setError] = useState<string | null>(null);

  const isPro = user?.subscription?.plan === "pro" && user?.subscription?.status === "active";
  const isPaystackUser = user?.subscription?.gateway === "paystack";
  const countryCode = user?.country || "";
  const usePaystack = usesPaystack(countryCode);
  const countryName = COUNTRIES.find((c) => c.code === countryCode)?.name;

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

  async function handlePaystackCheckout(type: "monthly" | "annual") {
    if (!user) { router.push("/register"); return; }
    const planCode = type === "monthly" ? PAYSTACK_MONTHLY : PAYSTACK_ANNUAL;
    setLoading(type);
    setError(null);
    try {
      const { url } = await api.post<{ url: string }>("/billing/paystack/checkout", { planCode });
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
    if (usePaystack) handlePaystackCheckout(type);
    else handleStripeCheckout(type);
  }

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 py-14 sm:py-20">

      {/* Header */}
      <div className="text-center max-w-xl mx-auto">
        <h1 className="font-display text-4xl sm:text-5xl text-ink leading-tight">
          Better prepared.<br />Better odds.
        </h1>
        <p className="text-ink-soft mt-4 leading-relaxed">
          Apexli doesn't decide who gets the scholarship — committees do. What we do is help you show up as the strongest version of yourself on paper.
        </p>
      </div>

      {/* Honest positioning */}
      <div className="mt-10 case-card p-6 max-w-2xl mx-auto">
        <p className="font-mono text-xs text-slate uppercase tracking-widest mb-3">What Apexli actually does</p>
        <div className="grid sm:grid-cols-3 gap-4 text-center">
          {[
            { icon: "📋", label: "Closes gaps", desc: "Shows you exactly what strong applicants have that you don't — yet." },
            { icon: "🎯", label: "Saves time", desc: "Surfaces opportunities you're actually competitive for, not just broadly eligible." },
            { icon: "💪", label: "Builds strength", desc: "Helps you prepare, practise, and write at your best before you submit." },
          ].map(({ icon, label, desc }) => (
            <div key={label}>
              <p className="text-2xl mb-2">{icon}</p>
              <p className="text-sm font-medium text-ink">{label}</p>
              <p className="text-xs text-slate mt-1 leading-relaxed">{desc}</p>
            </div>
          ))}
        </div>
        <p className="text-xs text-slate font-mono mt-5 text-center border-t border-rule pt-4">
          Final scholarship decisions rest entirely with the awarding committee. No platform can guarantee an outcome.
        </p>
      </div>

      {/* Billing toggle */}
      <div className="mt-12 flex justify-center">
        <div
          className="inline-flex rounded-lg p-1 gap-1"
          style={{ background: "#dce8f5" }}
        >
          <button
            onClick={() => setBilling("monthly")}
            className="px-5 py-2 text-sm font-medium rounded-md transition-all"
            style={
              billing === "monthly"
                ? { background: "#fff", color: "#d3622c" }
                : { background: "transparent", color: "#64748B" }
            }
          >
            Monthly
          </button>
          <button
            onClick={() => setBilling("annual")}
            className="px-5 py-2 text-sm font-medium rounded-md transition-all"
            style={
              billing === "annual"
                ? { background: "#fff", color: "#d3622c" }
                : { background: "transparent", color: "#64748B" }
            }
          >
            Annual
            <span className="ml-1.5 text-xs font-mono text-brass">save 35%</span>
          </button>
        </div>
      </div>

      {countryName && (
        <p className="text-center text-xs font-mono text-slate mt-3">
          Payment via {usePaystack ? "Paystack" : "Stripe"} · {countryName}
        </p>
      )}

      {error && <p className="text-alert text-sm text-center mt-4">{error}</p>}

      {/* Plans */}
      <div className="mt-8 grid sm:grid-cols-2 gap-6">

        {/* Free */}
        <div className="case-card p-8 flex flex-col">
          <p className="font-mono text-xs tracking-widest uppercase text-slate">Free</p>
          <p className="font-display text-4xl text-ink mt-2">$0</p>
          <p className="text-ink-soft text-sm mt-1">Forever. No card needed.</p>

          <ul className="mt-6 space-y-2.5 flex-1">
            {FREE_FEATURES.map((f) => (
              <li key={f} className="flex gap-2.5 text-sm text-ink-soft">
                <span className="text-forest mt-0.5 shrink-0">✓</span>{f}
              </li>
            ))}
          </ul>

          <div className="mt-8">
            {!user ? (
              <button onClick={() => router.push("/register")} className="btn-secondary w-full">
                Get started free
              </button>
            ) : (
              <p className="text-sm text-slate font-mono text-center">
                {isPro ? "Your previous plan" : "Your current plan"}
              </p>
            )}
          </div>
        </div>

        {/* Pro */}
        <div className="case-card p-8 flex flex-col" style={{ borderColor: "#d3622c", borderWidth: "1.5px" }}>
          <div className="flex items-center justify-between">
            <p className="font-mono text-xs tracking-widest uppercase text-forest">Pro</p>
            <span className="badge border border-rule text-slate">7-day free trial</span>
          </div>

          <div className="mt-3">
            {billing === "monthly" ? (
              <>
                <span className="font-display text-4xl text-ink">$7</span>
                <span className="text-ink-soft text-sm"> / month</span>
                <p className="text-xs text-slate font-mono mt-1">or $55/year — save 35%</p>
              </>
            ) : (
              <>
                <span className="font-display text-4xl text-ink">$55</span>
                <span className="text-ink-soft text-sm"> / year</span>
                <p className="text-xs text-slate font-mono mt-1">
                  <span className="line-through text-slate/60 mr-1">$84</span>
                  $4.58/month · billed annually
                </p>
              </>
            )}
          </div>

          <ul className="mt-6 space-y-2.5 flex-1">
            {PRO_FEATURES.map((f) => (
              <li key={f} className="flex gap-2.5 text-sm text-ink-soft">
                <span className="text-forest mt-0.5 shrink-0">✓</span>{f}
              </li>
            ))}
          </ul>

          <div className="mt-8 flex flex-col gap-3">
            {isPro ? (
              isPaystackUser ? (
                <button
                  onClick={handlePaystackCancel}
                  disabled={loading !== null}
                  className="btn-secondary w-full disabled:opacity-60"
                >
                  {loading === "portal" ? "Processing…" : "Cancel subscription"}
                </button>
              ) : (
                <button
                  onClick={handleStripePortal}
                  disabled={loading !== null}
                  className="btn-secondary w-full disabled:opacity-60"
                >
                  {loading === "portal" ? "Redirecting…" : "Manage subscription"}
                </button>
              )
            ) : (
              <>
                <button
                  onClick={() => handleCheckout(billing)}
                  disabled={loading !== null}
                  className="btn-primary w-full disabled:opacity-60"
                >
                  {loading ? "Redirecting…" : billing === "monthly" ? "Start free trial — $7/mo after" : "Start free trial — $55/yr after"}
                </button>
                <p className="text-xs text-slate font-mono text-center">
                  7 days free · No card required to trial · Cancel anytime
                </p>
              </>
            )}
          </div>
        </div>
      </div>

      {/* FAQ */}
      <div className="mt-16 max-w-2xl mx-auto space-y-5">
        <h2 className="font-display text-2xl text-ink">Common questions</h2>
        {[
          {
            q: "Does Apexli guarantee I'll get a scholarship?",
            a: "No — and any platform that claims otherwise should be treated with suspicion. Scholarship committees make final decisions based on their own criteria. Apexli helps you understand those criteria, close the gaps in your profile, and submit the strongest application you can. That's all preparation can do — and it's worth a lot.",
          },
          {
            q: "What does the 7-day free trial include?",
            a: "Full Pro access — Mentor, Roadmap, Mock Interview, For You matching, and unlimited Readiness Score refreshes. No card needed to start the trial.",
          },
          {
            q: "Can I pay in my local currency?",
            a: "Yes. Students in African countries pay via Paystack in their local currency (Naira, Cedis, Shillings, etc.). All other users pay via Stripe in USD.",
          },
          {
            q: "What's the difference between Free and Pro, practically?",
            a: "Free lets you explore the catalogue, save opportunities, upload your CV, and get a taste of the mentor. Pro is where the preparation happens — your personalised plan, interview practice, coaching per opportunity, and unlimited mentor access.",
          },
          {
            q: "What if I can't afford Pro?",
            a: "Start with Free — it's genuinely useful on its own. Upgrade when you're ready to apply seriously, or when you've identified specific opportunities you want to prepare properly for.",
          },
        ].map(({ q, a }) => (
          <details key={q} className="case-card p-5 group">
            <summary className="text-sm font-medium text-ink cursor-pointer list-none flex items-center justify-between gap-3">
              {q}
              <span className="text-slate text-xs shrink-0 group-open:rotate-180 transition-transform">▼</span>
            </summary>
            <p className="text-sm text-ink-soft mt-3 leading-relaxed">{a}</p>
          </details>
        ))}
      </div>

      <p className="text-center text-xs text-slate font-mono mt-12">
        Secure payments · Cancel anytime · No hidden fees
      </p>
    </div>
  );
}
