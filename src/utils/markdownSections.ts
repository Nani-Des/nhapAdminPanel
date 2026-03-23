/**
 * Split assistant text that uses `### Heading` sections into UI blocks.
 * If no ### headings are found, returns a single section.
 */
export function splitMarkdownSections(text: string): { heading: string; content: string }[] {
  const t = text.replace(/\r\n/g, '\n').trim();
  if (!t) return [];

  const hasHeadings = t.startsWith('### ') || t.includes('\n### ');
  if (!hasHeadings) {
    return [{ heading: 'Clinical response', content: t }];
  }

  const parts = t.startsWith('### ') ? [t] : t.split(/\n(?=### )/);

  return parts
    .map((part) => {
      const lines = part.trim().split('\n');
      const m = lines[0]?.match(/^###\s+(.+)$/);
      if (!m) {
        return { heading: 'Additional notes', content: part.trim() };
      }
      return {
        heading: m[1].trim(),
        content: lines.slice(1).join('\n').trim(),
      };
    })
    .filter((s) => s.heading && (s.content.length > 0 || parts.length === 1));
}
