import type { DiagnosticRunPhase } from '../types/diagnostic';

/** Status line while analysis runs — plain language for clinicians. */
export function phaseLabelUserFriendly(phase: DiagnosticRunPhase): string {
  switch (phase) {
    case 'remote_config':
      return 'Connecting\u2026';
    case 'building_local':
      return "Loading your hospital\u2019s services, equipment, and team\u2026";
    case 'building_network':
      return 'Loading other hospitals for referral suggestions\u2026';
    case 'gemini':
      return 'Generating clinical guidance via Gemini (may take up to a minute)\u2026';
    case 'groq':
      return 'Generating clinical guidance via Groq (may take up to a minute)\u2026';
    default:
      return '';
  }
}

/** Map thrown errors to short, actionable copy for the UI and toasts. */
export function mapDiagnosticError(err: unknown): { title: string; detail: string; tryAgain: boolean } {
  const raw = err instanceof Error ? err.message : String(err);
  const lower = raw.toLowerCase();

  if (
    lower.includes('remote config') &&
    (lower.includes('empty') || lower.includes('google_ai_studio_api'))
  ) {
    return {
      title: 'Setup incomplete',
      detail:
        "The app could not read the AI connection from your organisation\u2019s settings. Ask your administrator to check Firebase Remote Config.",
      tryAgain: true,
    };
  }

  if (lower.includes('timed out') || lower.includes('cancelled')) {
    return {
      title: 'Request took too long',
      detail:
        "The analysis didn\u2019t finish in time. Your network may be slow, or there is a lot of hospital data to process. Try again in a moment.",
      tryAgain: true,
    };
  }

  if (
    lower.includes('401') ||
    lower.includes('403') ||
    lower.includes('api key') ||
    (lower.includes('invalid') && lower.includes('key'))
  ) {
    return {
      title: 'AI connection problem',
      detail:
        "The AI service didn\u2019t accept this request. Check that Remote Config has a valid API key (google_ai_studio_api for Gemini, or groq_api_key for Groq).",
      tryAgain: true,
    };
  }

  if (lower.includes('groq_api_key') && lower.includes('empty')) {
    return {
      title: 'Groq not configured',
      detail:
        'Add your free Groq API key in Firebase Console \u2192 Remote Config (parameter: groq_api_key). Get one at console.groq.com/keys',
      tryAgain: true,
    };
  }

  if (lower.includes('429') || lower.includes('rate limit')) {
    return {
      title: 'Too many requests',
      detail: 'Please wait a short time and try again.',
      tryAgain: true,
    };
  }

  if (lower.includes('cors') || lower.includes('network') || lower.includes('failed to fetch')) {
    return {
      title: 'Connection problem',
      detail:
        "We couldn\u2019t reach the AI service. Check your internet connection. If this keeps happening, contact support.",
      tryAgain: true,
    };
  }

  return {
    title: 'Something went wrong',
    detail: raw.length > 200 ? `${raw.slice(0, 200)}\u2026` : raw,
    tryAgain: true,
  };
}
