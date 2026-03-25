export type DiagnosticRunPhase =
  | 'idle'
  | 'remote_config'
  | 'building_local'
  | 'building_network'
  | 'gemini'
  | 'groq';

export type AiProvider = 'gemini' | 'groq';
