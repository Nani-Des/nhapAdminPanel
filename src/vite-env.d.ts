/// <reference types="vite/client" />

interface ImportMetaEnv {
  /** Override Gemini API base (no trailing slash). Dev uses `/google-ai-api` proxy. */
  readonly VITE_GOOGLE_AI_API_BASE?: string;
  /** Gemini model id, e.g. gemini-2.0-flash or gemini-1.5-flash */
  readonly VITE_GEMINI_MODEL?: string;
  /** If "true", logs `google_ai_studio_api` from Remote Config to the console (insecure). */
  readonly VITE_DEBUG_PRINT_AI_KEY?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
