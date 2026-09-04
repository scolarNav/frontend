import { Metadata } from "next";
import { notFound } from "next/navigation";
import OpportunityDetail from "./OpportunityDetail";
import { Opportunity } from "@/lib/types";

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000/api";

async function fetchOpportunity(id: string): Promise<Opportunity | null> {
  try {
    const res = await fetch(`${API_URL}/opportunities/${id}`, {
      next: { revalidate: 60 },
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

  const description = `${opp.eligibilitySummary.slice(0, 155)}…`;

  return {
    title: opp.title,
    description,
    openGraph: {
      title: `${opp.title} | ScolarNav`,
      description,
      type: "article",
    },
    twitter: {
      card: "summary",
      title: `${opp.title} | ScolarNav`,
      description,
    },
  };
}

export default async function OpportunityPage({ params }: { params: { id: string } }) {
  const opportunity = await fetchOpportunity(params.id);
  if (!opportunity) notFound();

  return <OpportunityDetail initial={opportunity} />;
}
