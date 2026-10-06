/**
 * Scraped descriptions arrive as one run-on string such as
 *   "Glasgow University Masters Degree Deadline: … Study in: UK Brief description: The University … Host Institution(s): …"
 * This splits it at the known field labels so the page can show readable paragraphs.
 * Pure display logic: it never changes the stored text.
 */

const LABELS = [
  "Brief description",
  "Host Institution\\(s\\)",
  "Field\\(s\\) of study",
  "Level\\/Fields of study",
  "Number of Scholarships",
  "Number of Awards",
  "Target group",
  "Scholarship value",
  "Scholarship Provider",
  "Eligibility",
  "Selection criteria",
  "Application procedure",
  "How to apply",
];

const LABEL_RE = new RegExp(`(${LABELS.join("|")}):`, "g");

export interface TextBlock {
  label?: string;
  text: string;
}

export function formatScraped(raw: string): TextBlock[] {
  const text = (raw ?? "").replace(/\s+/g, " ").trim();
  if (!text) return [];

  const parts = text.split(LABEL_RE); // [lead, label, body, label, body, ...]
  const blocks: TextBlock[] = [];

  // The lead is the aggregator header ("<Provider> Masters Degree Deadline: … Study in: …"). The deadline
  // and country are shown elsewhere, so it is dropped when it carries those fields.
  const lead = parts[0].trim();
  if (lead && !/\b(deadline|study in)\s*:/i.test(lead)) blocks.push({ text: lead });

  for (let i = 1; i < parts.length; i += 2) {
    const label = parts[i];
    const body = (parts[i + 1] ?? "").trim();
    if (!body) continue;
    // "Brief description" is the main text; it needs no label.
    blocks.push(label === "Brief description" ? { text: body } : { label, text: body });
  }

  return blocks.length ? blocks : [{ text }];
}

/** True when two scraped strings are the same text (the aggregator often fills both fields identically). */
export function sameText(a: string, b: string): boolean {
  const n = (s: string) => (s ?? "").replace(/\s+/g, " ").trim().toLowerCase().slice(0, 140);
  return n(a) !== "" && n(a) === n(b);
}
