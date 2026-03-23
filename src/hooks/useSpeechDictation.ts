import { useCallback, useEffect, useRef, useState } from 'react';

type SpeechRecognitionCtor = new () => SpeechRecognition;

function getSpeechRecognitionCtor(): SpeechRecognitionCtor | null {
  if (typeof window === 'undefined') return null;
  const w = window as unknown as {
    SpeechRecognition?: SpeechRecognitionCtor;
    webkitSpeechRecognition?: SpeechRecognitionCtor;
  };
  return w.SpeechRecognition || w.webkitSpeechRecognition || null;
}

function speechErrorToUserMessage(code: string): string {
  switch (code) {
    case 'not-allowed':
    case 'service-not-allowed':
      return 'Microphone access was blocked. Allow the microphone in your browser settings, then try again.';
    case 'no-speech':
      return 'No speech was detected. Speak a bit louder or check your microphone.';
    case 'audio-capture':
      return 'No microphone was found. Connect a microphone and try again.';
    case 'network':
      return 'Speech recognition needs a network connection. Check your connection and try again.';
    case 'aborted':
      return '';
    default:
      return 'Voice input stopped unexpectedly. You can keep typing instead.';
  }
}

export const DICTATION_LANGUAGES: { value: string; label: string }[] = [
  { value: 'en-US', label: 'English (US)' },
  { value: 'en-GB', label: 'English (UK)' },
  { value: 'en-GH', label: 'English (Ghana)' },
  { value: 'fr-FR', label: 'Français' },
];

export interface UseSpeechDictationResult {
  supported: boolean;
  isListening: boolean;
  interimText: string;
  error: string | null;
  language: string;
  setLanguage: (lang: string) => void;
  startListening: () => void;
  stopListening: () => void;
  toggleListening: () => void;
}

/**
 * Browser speech-to-text for the clinical note (Chrome / Edge / Safari 14.1+).
 * Uses the device microphone; no audio is sent to your servers for transcription.
 */
export function useSpeechDictation(
  onFinalChunk: (text: string) => void
): UseSpeechDictationResult {
  const Ctor = typeof window !== 'undefined' ? getSpeechRecognitionCtor() : null;
  const supported = Boolean(Ctor);

  const recognitionRef = useRef<SpeechRecognition | null>(null);
  const [isListening, setIsListening] = useState(false);
  const [interimText, setInterimText] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [language, setLanguage] = useState(() => {
    if (typeof navigator !== 'undefined' && navigator.language) {
      const match = DICTATION_LANGUAGES.find((l) => l.value === navigator.language);
      return match ? match.value : 'en-US';
    }
    return 'en-US';
  });

  const onFinalChunkRef = useRef(onFinalChunk);
  onFinalChunkRef.current = onFinalChunk;

  const stopListening = useCallback(() => {
    try {
      recognitionRef.current?.stop();
    } catch {
      /* ignore */
    }
    recognitionRef.current = null;
    setIsListening(false);
    setInterimText('');
  }, []);

  const startListening = useCallback(() => {
    if (!Ctor) return;
    setError(null);
    try {
      const rec = new Ctor();
      rec.lang = language;
      rec.continuous = true;
      rec.interimResults = true;

      rec.onresult = (event: SpeechRecognitionEvent) => {
        let interim = '';
        let finalChunk = '';
        for (let i = event.resultIndex; i < event.results.length; i++) {
          const r = event.results[i];
          const piece = r[0]?.transcript ?? '';
          if (r.isFinal) finalChunk += piece;
          else interim += piece;
        }
        setInterimText(interim.trim());
        if (finalChunk.trim()) {
          onFinalChunkRef.current(finalChunk.trim());
        }
      };

      rec.onerror = (ev: SpeechRecognitionErrorEvent) => {
        const msg = speechErrorToUserMessage(ev.error);
        if (msg) setError(msg);
        if (ev.error !== 'aborted' && ev.error !== 'no-speech') {
          setIsListening(false);
        }
      };

      rec.onend = () => {
        recognitionRef.current = null;
        setIsListening(false);
        setInterimText('');
      };

      recognitionRef.current = rec;
      rec.start();
      setIsListening(true);
    } catch {
      setError('Could not start voice input. Try typing instead.');
      setIsListening(false);
    }
  }, [Ctor, language]);

  const toggleListening = useCallback(() => {
    if (isListening) stopListening();
    else startListening();
  }, [isListening, startListening, stopListening]);

  useEffect(() => {
    return () => {
      try {
        recognitionRef.current?.stop();
      } catch {
        /* ignore */
      }
    };
  }, []);

  return {
    supported,
    isListening,
    interimText,
    error,
    language,
    setLanguage,
    startListening,
    stopListening,
    toggleListening,
  };
}
