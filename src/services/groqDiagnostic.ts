/**
 * ─────────────────────────────────────────────────────────────
 *  Groq — free LLM inference provider
 * ─────────────────────────────────────────────────────────────
 *
 *  WHAT IS GROQ?
 *  Groq offers free, ultra-fast inference for open-source models
 *  like Meta's Llama 3.3 70B. Their free tier is generous:
 *    - 30 requests / minute
 *    - 14,400 requests / day
 *    - 131,072 token context window (Llama 3.3 70B)
 *
 *  SETUP STEPS:
 *
 *  1. Go to https://console.groq.com and create a free account.
 *
 *  2. Generate an API key at https://console.groq.com/keys
 *
 *  3. Store the key in Firebase Remote Config (same pattern as Gemini):
 *       - Open Firebase Console -> Remote Config
 *       - Add a parameter called: groq_api_key
 *       - Paste your Groq API key as the value
 *       - Publish the changes
 *
 *  4. (Optional) Override the default model with env var:
 *       VITE_GROQ_MODEL=llama-3.1-8b-instant
 *
 *  AVAILABLE FREE MODELS (as of 2025):
 *    - llama-3.3-70b-versatile   (default, best quality)
 *    - llama-3.1-8b-instant      (fastest, smaller)
 *    - mixtral-8x7b-32768        (Mixtral alternative)
 *    - gemma2-9b-it              (Google Gemma 2)
 *
 *  HOW IT WORKS:
 *  Groq's API is OpenAI-compatible. We POST to
 *  https://api.groq.com/openai/v1/chat/completions
 *  with a standard messages array. This file mirrors
 *  googleAiStudioDiagnostic.ts so the page can swap
 *  providers with minimal changes.
 * ─────────────────────────────────────────────────────────────
 */

import { fetchAndActivate, getValue } from 'firebase/remote-config';
import { remoteConfig } from '../firebase';
import type { DiagnosticRequestBody } from './buildDiagnosticPayload';
import { fetchWithTimeout } from '../utils/fetchWithTimeout';

/** Default model — override with VITE_GROQ_MODEL env var. */
const DEFAULT_GROQ_MODEL =
  import.meta.env.VITE_GROQ_MODEL?.trim() || 'llama-3.3-70b-versatile';

const REQUEST_TIMEOUT_MS = 90_000;

function getGroqApiUrl(): string {
  const custom = import.meta.env.VITE_GROQ_API_BASE?.trim();
  if (custom) {
    return `${custom.replace(/\/$/, '')}/chat/completions`;
  }
  if (import.meta.env.DEV) {
    return '/groq-api/chat/completions';
  }
  return 'https://api.groq.com/openai/v1/chat/completions';
}

/**
 * Read the Groq API key from Firebase Remote Config.
 * Parameter name: groq_api_key
 */
export async function getGroqApiKeyFromRemoteConfig(): Promise<string> {
  try {
    await fetchAndActivate(remoteConfig);
  } catch (e) {
    console.warn('Remote Config fetchAndActivate:', e);
  }
  const key = getValue(remoteConfig, 'groq_api_key').asString().trim();
  if (!key) {
    throw new Error(
      'Remote Config parameter "groq_api_key" is empty. ' +
        'Add your Groq API key in Firebase Console → Remote Config. ' +
        'Get a free key at https://console.groq.com/keys'
    );
  }
  return key;
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
### Disclaimer

In **Referral suggestions**, use the "Other hospitals in the network" JSON to name specific facilities when appropriate. If the current hospital is sufficient, say so clearly.
In **Disclaimer**, state briefly that the clinician must verify all decisions and that this output is not a substitute for professional judgement.`;

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

export interface GroqDiagnosticResult {
  assistant_message: string;
  model: string;
  raw_response: unknown;
}

function extractGroqText(raw: unknown): string {
  const r = raw as {
    choices?: Array<{
      message?: { content?: string };
      finish_reason?: string;
    }>;
    error?: { message?: string; type?: string; code?: string };
  };

  if (r.error?.message) {
    throw new Error(r.error.message);
  }

  const content = r.choices?.[0]?.message?.content;
  if (!content) {
    throw new Error(
      'Groq returned no text. Try a shorter clinical note or check your API key and model.'
    );
  }

  return content.trim();
}

export async function runGroqDiagnostic(
  apiKey: string,
  body: DiagnosticRequestBody
): Promise<GroqDiagnosticResult> {
  const model = DEFAULT_GROQ_MODEL;
  const url = getGroqApiUrl();
  const userContent = buildUserMessage(body);

  const res = await fetchWithTimeout(url, {
    method: 'POST',
    timeoutMs: REQUEST_TIMEOUT_MS,
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model,
      messages: [
        { role: 'system', content: SYSTEM_PROMPT },
        { role: 'user', content: userContent },
      ],
      temperature: 0.3,
      max_tokens: 8192,
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
      (raw as { error?: { message?: string } })?.error?.message ||
      (typeof raw === 'object' && raw && 'message' in raw
        ? String((raw as { message: string }).message)
        : res.statusText);
    throw new Error(msg || `Groq request failed (${res.status})`);
  }

  const text = extractGroqText(raw);
  if (!text) {
    throw new Error('Groq returned empty content.');
  }

  return {
    assistant_message: text,
    model,
    raw_response: raw,
  };
}
