import type { DiagnosticRunPhase } from '../types/diagnostic';

/** Status line while analysis runs — plain language for clinicians. */
export function phaseLabelUserFriendly(phase: DiagnosticRunPhase): string {
  switch (phase) {
    case 'remote_config':
      return 'Connecting…';
    case 'building_local':
      return 'Loading your hospital’s services, equipment, and team…';
    case 'building_network':
      return 'Loading other hospitals for referral suggestions…';
    case 'gemini':
      return 'Generating clinical guidance (may take up to a minute)…';
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
        'The app could not read the AI connection from your organisation’s settings. Ask your administrator to check Firebase Remote Config.',
      tryAgain: true,
    };
  }

  if (lower.includes('timed out') || lower.includes('cancelled')) {
    return {
      title: 'Request took too long',
      detail:
        'The analysis didn’t finish in time. Your network may be slow, or there is a lot of hospital data to process. Try again in a moment.',
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
        'The Google AI service didn’t accept this request. Check that Remote Config has a valid google_ai_studio_api key and that the Gemini model is enabled for your project.',
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
        'We couldn’t reach the AI service. Check your internet connection. If this keeps happening, contact support.',
      tryAgain: true,
    };
  }

  return {
    title: 'Something went wrong',
    detail: raw.length > 200 ? `${raw.slice(0, 200)}…` : raw,
    tryAgain: true,
  };
}
