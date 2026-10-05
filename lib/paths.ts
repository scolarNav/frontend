import { slugify } from "./taxonomy";

const OBJECT_ID = /^[a-f0-9]{24}$/i;

/** Canonical public path: /opportunities/<title-slug>-<objectId>. The id is the lookup key; the slug is cosmetic. */
export function opportunityPath(o: { _id: string; title: string }): string {
  const slug = slugify(o.title).slice(0, 80).replace(/-+$/, "");
  return slug ? `/opportunities/${slug}-${o._id}` : `/opportunities/${o._id}`;
}

/** Extracts the ObjectId from "<slug>-<id>" or a bare "<id>" (legacy URLs). */
export function parseOpportunityParam(param: string): string | null {
  const decoded = decodeURIComponent(param);
  const id = decoded.slice(-24);
  return OBJECT_ID.test(id) && (decoded.length === 24 || decoded[decoded.length - 25] === "-") ? id : null;
}

export function grantPath(g: { _id: string; title: string }): string {
  const slug = slugify(g.title).slice(0, 80).replace(/-+$/, "");
  return slug ? `/grants/${slug}-${g._id}` : `/grants/${g._id}`;
}

export const parseGrantParam = parseOpportunityParam;
