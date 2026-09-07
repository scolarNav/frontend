import { Metadata } from "next";
import { notFound } from "next/navigation";
import Script from "next/script";
import OpportunityDetail from "./OpportunityDetail";
import { Opportunity } from "@/lib/types";

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000/api";
const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || "https://scolarnav.com";

async function fetchOpportunity(id: string): Promise<Opportunity | null> {
  try {
    const res = await fetch(`${API_URL}/opportunities/${id}`, {
      next: { revalidate: 3600 },
    });
    if (!res.ok) return null;
    const data = await res.json();
    return data.opportunity ?? null;
  } catch {
    return null;
  }
}

export async function generateMetadata(
  { params }: { params: { id: string } }
): Promise<Metadata> {
  const opp = await fetchOpportunity(params.id);
  if (!opp) return { title: "Opportunity Not Found" };

  const raw = opp.eligibilitySummary ?? opp.objectives ?? "";
  const description = raw.length > 155 ? raw.slice(0, 152) + "…" : raw;
  const deadlineStr = opp.deadline
    ? ` · Deadline: ${new Date(opp.deadline).toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric" })}`
    : "";
  const fullDescription = `${description}${deadlineStr}`;

  return {
    title: `${opp.title} ${new Date().getFullYear()} — ${opp.provider}`,
    description: fullDescription,
    alternates: { canonical: `${SITE_URL}/opportunities/${params.id}` },
    openGraph: {
      title: `${opp.title} | ScolarNav`,
      description: fullDescription,
      type: "article",
      url: `${SITE_URL}/opportunities/${params.id}`,
    },
    twitter: {
      card: "summary",
      title: `${opp.title} | ScolarNav`,
      description: fullDescription,
    },
  };
}

function buildJsonLd(opp: Opportunity, id: string): object {
  const schema: Record<string, any> = {
    "@context": "https://schema.org",
    "@type": "EducationalOccupationalProgram",
    name: opp.title,
    provider: {
      "@type": "Organization",
      name: opp.provider,
    },
    description: opp.objectives ?? opp.eligibilitySummary ?? "",
    url: `${SITE_URL}/opportunities/${id}`,
    programType: opp.type,
    occupationalCategory: opp.fieldsOfStudy?.join(", "),
    educationalProgramMode: "full-time",
    inLanguage: "en",
  };
  if (opp.deadline) {
    schema.applicationDeadline = opp.deadline.slice(0, 10);
  }
  if (opp.officialUrl) {
    schema.applicationContact = {
      "@type": "ContactPoint",
      url: opp.officialUrl,
    };
  }
  return schema;
}

export default async function OpportunityPage({ params }: { params: { id: string } }) {
  const opportunity = await fetchOpportunity(params.id);
  if (!opportunity) notFound();

  return (
    <>
      <Script
        id="opp-jsonld"
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(buildJsonLd(opportunity, params.id)) }}
      />
      <OpportunityDetail initial={opportunity} />
    </>
  );
}
