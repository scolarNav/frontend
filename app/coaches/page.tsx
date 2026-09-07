"use client";

import Link from "next/link";
import { useAuth } from "@/lib/auth-context";


const HOW_IT_WORKS = [
  {
    step: "01",
    title: "Apply",
    body: "Submit your credentials — scholarship year, institution, and a short note on what you bring. Takes about 10 minutes.",
  },
  {
    step: "02",
    title: "Get verified",
    body: "Our team reviews your application and may ask for supporting evidence. Most reviews complete within a few business days.",
  },
  {
    step: "03",
    title: "Go live",
    body: "Your profile appears on the relevant scholarship pages. Students can book directly — no chasing, no invoicing.",
  },
  {
    step: "04",
    title: "Get paid",
    body: "You set your rate. We add our platform fee on top so your earnings are always what you quoted. Payment is released once you confirm each session.",
  },
];

const WHO_QUALIFIES = [
  {
    label: "Scholarship alumni",
    desc: "You were awarded the scholarship you want to coach for — any year, any institution.",
  },
  {
    label: "Selection panel members",
    desc: "You sit or have sat on the review committee for a scholarship in our catalogue.",
  },
];

const WHAT_YOU_DO = [
  {
    title: "Strategy coaching",
    desc: "Help applicants understand what the committee is really looking for, close gaps in their profile, and plan their timeline.",
  },
  {
    title: "Essay & document review",
    desc: "Read drafts, give structured feedback, and help applicants present themselves at their strongest.",
  },
];

export default function CoachLandingPage() {
  const { user } = useAuth();
  const applyHref = user ? "/coaches/apply" : "/register?next=/coaches/apply";

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 py-12 sm:py-20">

      {/* Hero */}
      <div className="max-w-2xl">
        <p className="font-mono text-xs tracking-widest uppercase mb-4" style={{ color: "#d3622c" }}>
          Coach on ScolarNav
        </p>
        <h1 className="font-display text-4xl sm:text-5xl text-ink leading-tight">
          You got the scholarship.<br />
          <span style={{ color: "#3d7a5a" }}>Help the next person get it too.</span>
        </h1>
        <p className="text-ink-soft mt-5 text-lg leading-relaxed">
          ScolarNav connects scholarship alumni and panel members with serious applicants who need real guidance — not generic advice. You set your rate, choose your availability, and we handle the rest.
        </p>
        <div className="mt-8 flex flex-wrap gap-3">
          <Link href={applyHref} className="btn-primary">
            Apply to coach →
          </Link>
          <a href="#how-it-works" className="btn-secondary">
            How it works
          </a>
        </div>
      </div>

      {/* Trust bar */}
      <div className="mt-14 grid sm:grid-cols-3 gap-4">
        {[
          { value: "Verified only", label: "Every coach is a genuine alumnus or panel member" },
          { value: "You set the rate", label: "Charge what your time is worth — from $50 upward" },
          { value: "Zero admin", label: "Bookings, reminders, and payment handled by the platform" },
        ].map(({ value, label }) => (
          <div key={value} className="case-card px-5 py-4">
            <p className="font-display text-lg text-ink">{value}</p>
            <p className="text-sm text-slate mt-1 leading-relaxed">{label}</p>
          </div>
        ))}
      </div>

      {/* Who qualifies */}
      <section className="mt-16">
        <p className="font-mono text-xs tracking-widest uppercase text-slate mb-5">Who can apply</p>
        <div className="grid sm:grid-cols-2 gap-4">
          {WHO_QUALIFIES.map(({ label, desc }) => (
            <div key={label} className="case-card p-6 flex gap-4">
              <span className="mt-0.5 shrink-0 text-forest text-lg">✓</span>
              <div>
                <p className="font-medium text-ink">{label}</p>
                <p className="text-sm text-slate mt-1 leading-relaxed">{desc}</p>
              </div>
            </div>
          ))}
        </div>
        <p className="text-xs text-slate font-mono mt-4">
          We verify credentials before your profile goes live. Self-reported awards are not accepted.
        </p>
      </section>

      {/* What coaches do */}
      <section className="mt-16">
        <p className="font-mono text-xs tracking-widest uppercase text-slate mb-5">What sessions look like</p>
        <div className="grid sm:grid-cols-2 gap-4">
          {WHAT_YOU_DO.map(({ title, desc }) => (
            <div key={title} className="case-card p-6">
              <p className="font-medium text-ink mb-1">{title}</p>
              <p className="text-sm text-slate leading-relaxed">{desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* How it works */}
      <section className="mt-16" id="how-it-works">
        <p className="font-mono text-xs tracking-widest uppercase text-slate mb-8">How it works</p>
        <div className="grid sm:grid-cols-2 gap-6">
          {HOW_IT_WORKS.map(({ step, title, body }) => (
            <div key={step} className="flex gap-5">
              <span
                className="shrink-0 font-mono text-xs tracking-widest pt-0.5"
                style={{ color: "#d3622c" }}
              >
                {step}
              </span>
              <div>
                <p className="font-medium text-ink">{title}</p>
                <p className="text-sm text-slate mt-1 leading-relaxed">{body}</p>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Revenue model */}
      <section className="mt-16 case-card p-7">
        <p className="font-mono text-xs tracking-widest uppercase text-slate mb-4">Your earnings</p>
        <p className="text-ink leading-relaxed">
          You set your session fee in USD. ScolarNav adds a platform fee (currently 20%) on top — so if you charge{" "}
          <span className="font-medium text-ink">$150</span>, the student pays{" "}
          <span className="font-medium text-ink">$180</span> and you receive{" "}
          <span className="font-medium text-ink">$150</span> in full. Your rate is never discounted.
        </p>
        <p className="text-sm text-slate mt-4 font-mono border-t border-rule pt-4">
          Payment is released once you mark a session as completed. We support international payouts — details confirmed during onboarding.
        </p>
      </section>

      {/* CTA */}
      <section className="mt-16 text-center">
        <h2 className="font-display text-3xl text-ink">Ready to coach?</h2>
        <p className="text-ink-soft mt-3 leading-relaxed max-w-md mx-auto">
          The application takes about 10 minutes. You'll need your scholarship year, the name of your scholarship, and a short note on what you bring to applicants.
        </p>
        <Link href={applyHref} className="btn-primary inline-flex mt-7">
          Start your application →
        </Link>
        <p className="text-xs text-slate font-mono mt-4">
          Questions? Email us at{" "}
          <a href="mailto:coaches@scolarnav.com" className="text-forest underline">
            coaches@scolarnav.com
          </a>
        </p>
      </section>

    </div>
  );
}
