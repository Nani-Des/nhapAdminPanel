/**
 * fetch with AbortController timeout (robust against hung requests).
 */
export async function fetchWithTimeout(
  input: RequestInfo | URL,
  init: RequestInit & { timeoutMs?: number } = {}
): Promise<Response> {
  const { timeoutMs = 120_000, signal: outerSignal, ...rest } = init;
  const controller = new AbortController();
  const timeoutId = window.setTimeout(() => controller.abort(), timeoutMs);

  if (outerSignal) {
    if (outerSignal.aborted) controller.abort();
    outerSignal.addEventListener('abort', () => controller.abort(), { once: true });
  }

  try {
    return await fetch(input, {
      ...rest,
      signal: controller.signal,
    });
  } catch (e) {
    if (e instanceof Error && e.name === 'AbortError') {
      throw new Error(
        `Request timed out or was cancelled (limit ${Math.round(timeoutMs / 1000)}s). Try again or reduce network hospital data.`
      );
    }
    throw e;
  } finally {
    window.clearTimeout(timeoutId);
  }
}
