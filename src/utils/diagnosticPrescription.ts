import { splitMarkdownSections } from "./markdownSections";

function normalizeHeading(h: string): string {
  return h
    .trim()
    .toLowerCase()
    .replace(/[*_#`]/g, "")
    .replace(/\s+/g, " ");
}

/** Detects the AI prescription block (heading must stay in sync with system prompts). */
export function isPrescriptionDraftHeading(heading: string): boolean {
  const n = normalizeHeading(heading);
  return (
    n === "prescription (draft)" ||
    (n.includes("prescription") && n.includes("draft"))
  );
}

export function extractPrescriptionDraftFromSummary(summary: string): string {
  if (!summary.trim()) return "";
  const sections = splitMarkdownSections(summary);
  const presc = sections.find((s) => isPrescriptionDraftHeading(s.heading));
  return presc?.content.trim() ?? "";
}

export function filterSectionsExcludingPrescription<
  T extends { heading: string; content: string },
>(sections: T[]): T[] {
  return sections.filter((s) => !isPrescriptionDraftHeading(s.heading));
}
