import type { PeerHospitalPayload } from '../services/buildDiagnosticPayload';

/**
 * Detects which peer facilities are mentioned in free text (e.g. AI "Referral suggestions").
 * Longer names are checked first so substrings don't steal matches from full names.
 */
export function findPeersMentionedInText(
  content: string,
  peers: PeerHospitalPayload[]
): PeerHospitalPayload[] {
  const normalized = content.replace(/\r\n/g, '\n').toLowerCase();
  const sorted = [...peers].sort((a, b) => b.name.length - a.name.length);
  const seen = new Set<string>();
  const out: PeerHospitalPayload[] = [];

  for (const p of sorted) {
    const name = p.name?.trim();
    if (!name || seen.has(p.hospital_id)) continue;
    if (normalized.includes(name.toLowerCase())) {
      seen.add(p.hospital_id);
      out.push(p);
    }
  }

  return out;
}
