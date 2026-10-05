import { ImageResponse } from "next/og";
import { OG_SIZE, OgCard } from "@/lib/og-card";
import { fetchOpportunity, formatDate, isClosed, isHiddenType } from "@/lib/opportunities";
import { parseOpportunityParam } from "@/lib/paths";
import { typeByValue } from "@/lib/taxonomy";

export const alt = "Opportunity on ScolarNav";
export const size = OG_SIZE;
export const contentType = "image/png";
export const revalidate = 3600;

export default async function OpportunityOgImage({ params }: { params: { id: string } }) {
  const id = parseOpportunityParam(params.id);
  const opp = id ? await fetchOpportunity(id).catch(() => null) : null;

  if (!opp || isHiddenType(opp)) {
    return new ImageResponse(<OgCard eyebrow="Opportunity" title="Scholarships, fellowships & programs" />, size);
  }

  const footnote = opp.deadline
    ? `${isClosed(opp) ? "Closed" : "Deadline"}: ${formatDate(opp.deadline)}`
    : "Dates to be announced";

  return new ImageResponse(
    <OgCard eyebrow={typeByValue(opp.type)?.label ?? "Opportunity"} title={opp.title} subtitle={opp.provider} footnote={footnote} />,
    size
  );
}
