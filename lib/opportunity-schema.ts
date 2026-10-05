import type { JsonLdNode } from "./jsonld";
import { truncate, absoluteUrl } from "./site";
import type { Opportunity } from "./types";

const isoDate = (d?: string) => (d ? new Date(d).toISOString().slice(0, 10) : undefined);

/**
 * Picks the most accurate schema.org type per opportunity kind, using only properties that exist
 * on that type, and only values present on the record:
 *  - scholarship / fellowship -> Grant (funder)
 *  - study_program            -> EducationalOccupationalProgram (provider, applicationDeadline, applicationStartDate)
 *  - immigration_pathway / incubator -> no mainEntity (no schema.org type fits honestly); the WebPage still describes the page
 */
export function opportunityJsonLd(opp: Opportunity, path: string): JsonLdNode {
  const url = absoluteUrl(path);
  const description = truncate(opp.objectives || opp.eligibilitySummary || "", 500) || undefined;
  const provider = { "@type": "Organization", name: opp.provider };

  let mainEntity: JsonLdNode | undefined;
  if (opp.type === "scholarship" || opp.type === "fellowship") {
    mainEntity = {
      "@type": "Grant",
      name: opp.title,
      description,
      url,
      sameAs: opp.officialUrl || undefined,
      funder: provider,
    };
  } else if (opp.type === "study_program") {
    mainEntity = {
      "@type": "EducationalOccupationalProgram",
      name: opp.title,
      description,
      url,
      provider,
      applicationDeadline: isoDate(opp.deadline),
      applicationStartDate: isoDate(opp.applicationOpens),
    };
  }

  return {
    "@type": "WebPage",
    "@id": `${url}#webpage`,
    url,
    name: opp.title,
    description,
    inLanguage: "en",
    datePublished: opp.createdAt,
    dateModified: opp.updatedAt,
    isPartOf: { "@id": absoluteUrl("/#website") },
    ...(mainEntity ? { mainEntity } : {}),
  };
}
