"use client";

import Link from "next/link";
import { useAuth } from "@/lib/auth-context";
import { Check } from "lucide-react";


const HOW_IT_WORKS = [
  {
    step: "01",
    title: "Apply",
    body: "Submit your credentials, scholarship year, institution, and a short note on what you bring. Takes about 10 minutes.",
  },
  {
    step: "02",
    title: "Get verified",
    body: "Our team reviews your application and may ask for supporting evidence. Most reviews complete within a few business days.",
  },
  {
    step: "03",
    title: "Go live",
    body: "Your profile appears on the relevant scholarship pages. Students can book directly, no chasing, no invoicing.",
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
    desc: "You were awarded the scholarship you want to coach for, any year, any institution.",
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
    <div className="page">
      {/* Hero */}
      <section className="max-w-2xl">
        <p className="eyebrow mb-4 text-forest">Coach on ScolarNav</p>
        <h1 className="h1">
          You got the scholarship.
          <br />
          <span className="text-forest">Help the next person get it too.</span>
        </h1>
        <p className="lead mt-5">
          ScolarNav connects scholarship alumni and panel members with serious applicants who need real guidance, not generic advice. You set your rate, choose your availability, and we handle the rest.
        </p>
        <div className="mt-8 flex flex-wrap gap-3">
          <Link href={applyHref} className="btn-primary">
            Apply to coach
          </Link>
          <a href="#how-it-works" className="btn-secondary">
            How it works
          </a>
        </div>
      </section>

      {/* Trust bar */}
      <ul className="mt-14 grid gap-4 sm:grid-cols-3">
        {[
          { value: "Verified only", label: "Every coach is a genuine alumnus or panel member" },
          { value: "You set the rate", label: "Charge what your time is worth, from $50 upward" },
          { value: "Zero admin", label: "Bookings, reminders and payment handled by the platform" },
        ].map(({ value, label }) => (
          <li key={value} className="card card-pad">
            <p className="font-display text-lg text-ink">{value}</p>
            <p className="mt-1 text-sm leading-relaxed text-slate">{label}</p>
          </li>
        ))}
      </ul>

      {/* Who qualifies */}
      <section className="mt-16" aria-labelledby="who-heading">
        <h2 id="who-heading" className="h2 mb-5">Who can apply</h2>
        <ul className="grid gap-4 sm:grid-cols-2">
          {WHO_QUALIFIES.map(({ label, desc }) => (
            <li key={label} className="card card-pad flex gap-4">
              <Check size={20} className="mt-0.5 shrink-0 text-ok" aria-hidden="true" />
              <div>
                <p className="font-semibold text-ink">{label}</p>
                <p className="mt-1 text-sm leading-relaxed text-slate">{desc}</p>
              </div>
            </li>
          ))}
        </ul>
        <p className="help">We verify credentials before your profile goes live. Self-reported awards are not accepted.</p>
      </section>

      {/* What coaches do */}
      <section className="mt-16" aria-labelledby="sessions-heading">
        <h2 id="sessions-heading" className="h2 mb-5">What sessions look like</h2>
        <ul className="grid gap-4 sm:grid-cols-2">
          {WHAT_YOU_DO.map(({ title, desc }) => (
            <li key={title} className="card card-pad">
              <p className="mb-1 font-semibold text-ink">{title}</p>
              <p className="text-sm leading-relaxed text-slate">{desc}</p>
            </li>
          ))}
        </ul>
      </section>

      {/* How it works */}
      <section className="mt-16" id="how-it-works" aria-labelledby="how-heading">
        <h2 id="how-heading" className="h2 mb-8">How it works</h2>
        <ol className="grid gap-8 sm:grid-cols-2">
          {HOW_IT_WORKS.map(({ step, title, body }) => (
            <li key={step} className="flex gap-4">
              <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-forest-soft text-sm font-semibold text-forest">
                {step}
              </span>
              <div>
                <p className="font-semibold text-ink">{title}</p>
                <p className="mt-1 text-sm leading-relaxed text-slate">{body}</p>
              </div>
            </li>
          ))}
        </ol>
      </section>

      {/* Revenue model */}
      <section className="card card-pad mt-16 sm:p-8" aria-labelledby="earn-heading">
        <h2 id="earn-heading" className="h3 mb-3">Your earnings</h2>
        <p className="max-w-prose leading-relaxed text-ink-soft">
          You set your session fee in USD. ScolarNav adds a platform fee (currently 20%) on top, so if you charge{" "}
          <span className="font-semibold text-ink">$150</span>, the student pays <span className="font-semibold text-ink">$180</span> and you
          receive <span className="font-semibold text-ink">$150</span> in full. Your rate is never discounted.
        </p>
        <p className="mt-4 border-t border-rule pt-4 text-sm text-slate">
          Payment is released once you mark a session as completed. We support international payouts, with details confirmed during onboarding.
        </p>
      </section>

      {/* CTA */}
      <section className="mt-16 text-center">
        <h2 className="h2">Ready to coach?</h2>
        <p className="mx-auto mt-3 max-w-md leading-relaxed text-ink-soft">
          The application takes about 10 minutes. You will need your scholarship year, the name of your scholarship, and a short note on what you bring to applicants.
        </p>
        <Link href={applyHref} className="btn-primary mt-7">
          Start your application
        </Link>
        <p className="mt-4 text-sm text-slate">
          Questions? Email us at{" "}
          <a href="mailto:coaches@scolarnav.com" className="font-medium text-forest underline">
            coaches@scolarnav.com
          </a>
        </p>
      </section>
    </div>
  );
}
