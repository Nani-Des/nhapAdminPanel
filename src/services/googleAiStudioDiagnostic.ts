import { fetchAndActivate, getValue } from 'firebase/remote-config';
import { remoteConfig } from '../firebase';
import type { DiagnosticRequestBody } from './buildDiagnosticPayload';
import { fetchWithTimeout } from '../utils/fetchWithTimeout';

/** Default model — override with VITE_GEMINI_MODEL if needed. */
const DEFAULT_GEMINI_MODEL =
  import.meta.env.VITE_GEMINI_MODEL?.trim() || 'gemini-2.0-flash';

const REQUEST_TIMEOUT_MS = 90_000;

function getGenerateContentUrl(model: string): string {
  const custom = import.meta.env.VITE_GOOGLE_AI_API_BASE?.trim();
  if (custom) {
    return `${custom.replace(/\/$/, '')}/v1beta/models/${encodeURIComponent(model)}:generateContent`;
  }
  if (import.meta.env.DEV) {
    return `/google-ai-api/v1beta/models/${encodeURIComponent(model)}:generateContent`;
  }
  return `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(model)}:generateContent`;
}

/**
 * API key from Firebase Remote Config parameter `google_ai_studio_api`
 * (Google AI Studio / Gemini API key).
 */
export async function getGoogleAiStudioApiKeyFromRemoteConfig(): Promise<string> {
  try {
    await fetchAndActivate(remoteConfig);
  } catch (e) {
    console.warn('Remote Config fetchAndActivate:', e);
  }
  const key = getValue(remoteConfig, 'google_ai_studio_api').asString().trim();
  if (!key) {
    throw new Error(
      'Remote Config parameter "google_ai_studio_api" is empty. Add your Google AI Studio API key in Firebase Console → Remote Config.'
    );
  }

  const allowPrint =
    import.meta.env.DEV || import.meta.env.VITE_DEBUG_PRINT_AI_KEY === 'true';
  if (allowPrint) {
    console.warn(
      '[NHAP Remote Config] google_ai_studio_api (debug only — rotate key if exposed):',
      key
    );
  }

  return key;
}

function buildUserMessage(body: DiagnosticRequestBody): string {
  const sections: string[] = ['## Presenting clinical note', body.presenting_note];

  if (body.referral_context) {
    sections.push(
      '## Referral record (use only if relevant; loaded from hospital Referrals by serial)',
      JSON.stringify(body.referral_context, null, 2)
    );
  }

  const peerJson = JSON.stringify(body.peer_hospitals, null, 2);
  const maxPeer = 48_000;
  const peerBlock =
    peerJson.length > maxPeer
      ? `${peerJson.slice(0, maxPeer)}\n\n…[peer_hospitals truncated for size]`
      : peerJson;

  sections.push(
    '## Current hospital (capabilities: departments, services, equipment, staff summary)',
    JSON.stringify(body.current_hospital, null, 2),
    '## Other hospitals in the network (for referral matching if current site cannot manage safely)',
    peerBlock
  );

  return sections.join('\n\n');
}

const SYSTEM_PROMPT = `You are a clinical decision support assistant for licensed clinicians. You are NOT replacing a doctor.

Rules:
- Use only the information provided. If data is missing, say what is missing.
- If no referral record appears in the user message, do not invent one.
- Be careful with uncertainty; avoid stating definitive diagnoses as established fact.
- Use bullet lists where helpful. Be concise.

You MUST respond in Markdown and use these exact ### section headings in this order (do not skip sections; write "None" or "Not applicable" if needed):

### Clinical summary
### Differential diagnosis
### Suggested investigations
### Treatment considerations
### Fit with current hospital
### Referral suggestions
### Missing information or limits
### Prescription (draft)
### Disclaimer

In **Referral suggestions**, use the "Other hospitals in the network" JSON to name specific facilities when appropriate. If the current hospital is sufficient, say so clearly.
In **Prescription (draft)**, propose medications ONLY when appropriate from the case and local practice. Use a clear list (one medication per bullet or line): drug name, strength, dose, route, frequency, duration, and brief patient instructions. Prefer generic names where reasonable. If drug treatment is not appropriate or information is insufficient, write "None" or "Not applicable" and explain briefly. Do not invent allergies or contraindications not implied by the note — if unknown, say allergies / renal function / pregnancy status are unknown and must be verified before dispensing. This section is a draft for the clinician to review, edit, and authorize — not a legal prescription until signed off.
In **Disclaimer**, state briefly that the clinician must verify all decisions and that this output is not a substitute for professional judgement.`;

export interface GeminiDiagnosticResult {
  assistant_message: string;
  model: string;
  raw_response: unknown;
}

function extractGeminiText(raw: unknown): string {
  const r = raw as {
    candidates?: Array<{
      content?: { parts?: Array<{ text?: string }> };
      finishReason?: string;
    }>;
    promptFeedback?: { blockReason?: string; blockReasonMessage?: string };
    error?: { message?: string; code?: number };
  };

  if (r.error?.message) {
    throw new Error(r.error.message);
  }

  if (r.promptFeedback?.blockReason) {
    const msg = r.promptFeedback.blockReasonMessage || r.promptFeedback.blockReason;
    throw new Error(`Response was blocked (${r.promptFeedback.blockReason}): ${msg}`);
  }

  const parts = r.candidates?.[0]?.content?.parts;
  if (!parts?.length) {
    throw new Error(
      'Google AI returned no text. Try a shorter clinical note or check that the model name is available to your API key.'
    );
  }

  return parts.map((p) => p.text ?? '').join('').trim();
}

export async function runGeminiDiagnostic(
  apiKey: string,
  body: DiagnosticRequestBody
): Promise<GeminiDiagnosticResult> {
  const model = DEFAULT_GEMINI_MODEL;
  const baseUrl = getGenerateContentUrl(model);
  const url = `${baseUrl}?key=${encodeURIComponent(apiKey)}`;
  const userContent = buildUserMessage(body);

  const res = await fetchWithTimeout(url, {
    method: 'POST',
    timeoutMs: REQUEST_TIMEOUT_MS,
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      systemInstruction: {
        parts: [{ text: SYSTEM_PROMPT }],
      },
      contents: [
        {
          role: 'user',
          parts: [{ text: userContent }],
        },
      ],
      generationConfig: {
        temperature: 0.3,
        maxOutputTokens: 8192,
      },
    }),
  });

  const textBody = await res.text();
  let raw: unknown;
  try {
    raw = textBody ? JSON.parse(textBody) : null;
  } catch {
    raw = { raw_text: textBody };
  }

  if (!res.ok) {
    const msg =
      (raw as { error?: { message?: string; status?: string } })?.error?.message ||
      (typeof raw === 'object' && raw && 'message' in raw
        ? String((raw as { message: string }).message)
        : res.statusText);
    throw new Error(msg || `Google AI request failed (${res.status})`);
  }

  const text = extractGeminiText(raw);
  if (!text) {
    throw new Error('Google AI returned empty content.');
  }

  return {
    assistant_message: text,
    model,
    raw_response: raw,
  };
}
