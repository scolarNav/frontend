"use client";

import Link from "next/link";
import { Lock } from "lucide-react";

interface Props {
  feature: "coaching" | "essays" | "recommendations" | "roadmap" | "interview" | "mentor" | "reference_letters" | "application_documents" | "breakdown";
}

const COPY: Record<Props["feature"], { heading: string; body: string }> = {
  coaching: {
    heading: "Coaching is a Pro feature",
    body: "Upgrade to Pro for coaching on every opportunity, each one tailored to your exact CV and the scholarship's real requirements. The 7-day free trial needs no card.",
  },
  essays: {
    heading: "Essay review is a Pro feature",
    body: "Upgrade to Pro to submit essay drafts and get line-by-line feedback against your CV and the opportunity's criteria.",
  },
  recommendations: {
    heading: "Personalised matching is a Pro feature",
    body: "Upgrade to Pro to see every opportunity sorted by how well your profile fits the criteria, so you put your time into the applications you're actually competitive for.",
  },
  roadmap: {
    heading: "Your Roadmap is a Pro feature",
    body: "Upgrade to Pro to get a dated plan for each saved scholarship, counted from today, with email reminders and calendar sync.",
  },
  interview: {
    heading: "Mock Interview is a Pro feature",
    body: "Upgrade to Pro to practise the questions panels ask for any scholarship in your list, and see why they ask each one and a range of strong ways to answer.",
  },
  mentor: {
    heading: "Mentor chat is a Pro feature",
    body: "Upgrade to Pro to ask your mentor about any scholarship, application or study destination, with answers based on your actual profile. The 7-day free trial needs no card.",
  },
  reference_letters: {
    heading: "Reference letter review is a Pro feature",
    body: "Upgrade to Pro to upload your referee's letters for AI review and get a suggested improved draft you can share with your referee, written to answer every form question.",
  },
  breakdown: {
    heading: "Breakdowns are a Pro feature",
    body: "Upgrade to Pro to generate this summary of what a strong applicant looks like. Once a breakdown exists, everyone can read it.",
  },
  application_documents: {
    heading: "Document review is a Pro feature",
    body: "Upgrade to Pro to upload your required documents for AI review and get improved draft content aligned with the scholarship's specific criteria.",
  },
};

export default function UpgradePrompt({ feature }: Props) {
  const { heading, body } = COPY[feature];
  return (
    <section className="card card-pad mt-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start">
        <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-forest-soft text-forest">
          <Lock size={20} aria-hidden="true" />
        </span>
        <div className="min-w-0 flex-1">
          <p className="eyebrow">Pro feature</p>
          <h2 className="h3 mt-1">{heading}</h2>
          <p className="mt-2 max-w-prose text-sm leading-relaxed text-ink-soft">{body}</p>
          <Link href="/pricing" className="btn-primary mt-4">
            See Pro plans
          </Link>
        </div>
      </div>
    </section>
  );
}
