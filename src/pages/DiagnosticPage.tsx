import React, { useCallback, useMemo, useState } from "react";
import {
  Stethoscope,
  Loader2,
  Search,
  ChevronDown,
  Mic,
  Sparkles,
  Building2,
  ClipboardList,
  CheckCircle2,
  AlertCircle,
  FileText,
  X,
  Activity,
  Shield,
} from "lucide-react";
import Layout from "../components/layout/Layout";
import { Card, CardContent } from "../components/ui/Card";
import Input from "../components/ui/Input";
import Button from "../components/ui/Button";
import { useHospital } from "../contexts/HospitalContext";
import { useAuth, isDoctorUser } from "../contexts/AuthContext";
import {
  buildCurrentHospitalPayload,
  fetchReferralBySerial,
  fetchPeerHospitalsPayload,
  type DiagnosticRequestBody,
} from "../services/buildDiagnosticPayload";
import {
  getGoogleAiStudioApiKeyFromRemoteConfig,
  runGeminiDiagnostic,
} from "../services/googleAiStudioDiagnostic";
import {
  getGroqApiKeyFromRemoteConfig,
  runGroqDiagnostic,
} from "../services/groqDiagnostic";
import { splitMarkdownSections } from "../utils/markdownSections";
import {
  phaseLabelUserFriendly,
  mapDiagnosticError,
} from "../utils/diagnosticUserMessages";
import {
  useSpeechDictation,
  DICTATION_LANGUAGES,
} from "../hooks/useSpeechDictation";
import type { DiagnosticRunPhase, AiProvider } from "../types/diagnostic";
import { toast } from "react-hot-toast";

/* ── Progress stepper ─────────────────────────────────────── */

const RUN_PHASES_GEMINI: { key: DiagnosticRunPhase; label: string }[] = [
  { key: "remote_config", label: "Connecting" },
  { key: "building_local", label: "Hospital data" },
  { key: "building_network", label: "Network" },
  { key: "gemini", label: "AI analysis" },
];

const RUN_PHASES_GROQ: { key: DiagnosticRunPhase; label: string }[] = [
  { key: "remote_config", label: "Connecting" },
  { key: "building_local", label: "Hospital data" },
  { key: "building_network", label: "Network" },
  { key: "groq", label: "AI analysis" },
];

const ProgressStepper: React.FC<{
  current: DiagnosticRunPhase;
  phases: { key: DiagnosticRunPhase; label: string }[];
}> = ({ current, phases }) => {
  const currentIdx = phases.findIndex((p) => p.key === current);
  return (
    <div
      className="w-full"
      role="progressbar"
      aria-valuenow={currentIdx + 1}
      aria-valuemax={phases.length}
    >
      <div className="flex items-center gap-1">
        {phases.map((phase, i) => {
          const done = i < currentIdx;
          const active = i === currentIdx;
          return (
            <div key={phase.key} className="flex-1 min-w-0">
              <div
                className={`h-2 rounded-full transition-all duration-700 ease-out ${
                  done
                    ? "bg-teal-500"
                    : active
                      ? "bg-teal-400 animate-pulse"
                      : "bg-gray-200"
                }`}
              />
              <div className="flex items-center gap-1 mt-1.5">
                {done && (
                  <CheckCircle2 className="w-3 h-3 text-teal-500 shrink-0" />
                )}
                {active && (
                  <Loader2 className="w-3 h-3 text-teal-500 animate-spin shrink-0" />
                )}
                <span
                  className={`text-[11px] leading-tight truncate ${
                    done
                      ? "text-teal-600 font-medium"
                      : active
                        ? "text-teal-700 font-semibold"
                        : "text-gray-400"
                  }`}
                >
                  {phase.label}
                </span>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

/* ── Step badge ────────────────────────────────────────────── */

const StepBadge: React.FC<{ n: number }> = ({ n }) => (
  <span className="flex h-7 w-7 items-center justify-center rounded-full bg-teal-600 text-white text-xs font-bold shrink-0">
    {n}
  </span>
);

/* ── Section heading colors for results ────────────────────── */

const SECTION_ACCENTS = [
  "border-l-teal-500",
  "border-l-blue-500",
  "border-l-emerald-500",
  "border-l-violet-500",
  "border-l-amber-500",
  "border-l-rose-500",
  "border-l-cyan-500",
  "border-l-indigo-500",
];

/* ── Main component ────────────────────────────────────────── */

const DiagnosticPage: React.FC = () => {
  const { hospital } = useHospital();
  const { currentAdmin } = useAuth();
  const [presentingNote, setPresentingNote] = useState("");
  const [serial, setSerial] = useState("");
  const [referralContext, setReferralContext] = useState<Record<
    string,
    unknown
  > | null>(null);
  const [loadingReferral, setLoadingReferral] = useState(false);
  const [aiProvider, setAiProvider] = useState<AiProvider>("gemini");
  const [running, setRunning] = useState(false);
  const [runPhase, setRunPhase] = useState<DiagnosticRunPhase>("idle");
  const [result, setResult] = useState<unknown>(null);
  const [resultError, setResultError] = useState<{
    title: string;
    detail: string;
  } | null>(null);

  const appendFromDictation = useCallback((text: string) => {
    setPresentingNote((prev) => {
      const t = prev.trimEnd();
      return t ? `${t} ${text}` : text;
    });
  }, []);

  const speech = useSpeechDictation(appendFromDictation);

  const departmentIds = useMemo(() => {
    const raw = hospital?.["Hospital Department"];
    if (!Array.isArray(raw)) return [];
    return (raw as unknown[]).filter(
      (id): id is string => typeof id === "string",
    );
  }, [hospital]);

  const loadReferral = async () => {
    if (!hospital?.id) {
      toast.error(
        "We couldn\u2019t confirm your hospital. Please refresh the page or sign in again.",
      );
      return;
    }
    setLoadingReferral(true);
    setReferralContext(null);
    try {
      const ctx = await fetchReferralBySerial(hospital.id, serial);
      if (!ctx) {
        toast.error(
          "No referral matches that number at this hospital. Check the number and try again.",
        );
        return;
      }
      setReferralContext(ctx as Record<string, unknown>);
      toast.success("Referral details added");
    } catch (e) {
      console.error(e);
      toast.error(
        "We couldn\u2019t load that referral. Check your connection and try again.",
      );
    } finally {
      setLoadingReferral(false);
    }
  };

  const clearReferral = () => {
    setReferralContext(null);
    setSerial("");
    toast.success("Referral removed from this request");
  };

  const runDiagnostic = async () => {
    if (!hospital?.id) {
      toast.error(
        "Your profile isn\u2019t linked to a hospital yet. Ask your administrator for help.",
      );
      return;
    }
    const note = presentingNote.trim();
    if (!note) {
      toast.error(
        "Add a short description of the patient\u2019s problem, or use voice typing below.",
      );
      return;
    }

    if (speech.isListening) speech.stopListening();

    setRunning(true);
    setRunPhase("remote_config");
    setResult(null);
    setResultError(null);

    try {
      const apiKey =
        aiProvider === "gemini"
          ? await getGoogleAiStudioApiKeyFromRemoteConfig()
          : await getGroqApiKeyFromRemoteConfig();

      setRunPhase("building_local");
      const current_hospital = await buildCurrentHospitalPayload(
        hospital.id,
        departmentIds,
      );

      setRunPhase("building_network");
      const peer_hospitals = await fetchPeerHospitalsPayload(hospital.id);

      const body: DiagnosticRequestBody = {
        presenting_note: note,
        current_hospital,
        peer_hospitals,
        requested_at: new Date().toISOString(),
        client: "nhap-admin-panel",
      };

      if (referralContext) {
        body.referral_context = referralContext;
      }

      const meta = {
        includes_referral: Boolean(body.referral_context),
        current_hospital: {
          services: body.current_hospital.services.length,
          equipment: body.current_hospital.equipment.length,
          physicians: body.current_hospital.physicians.length,
          departments: body.current_hospital.departments.length,
        },
        peer_hospitals_count: body.peer_hospitals.length,
        peer_with_quality_notes: body.peer_hospitals.filter(
          (p) => p.data_quality_note,
        ).length,
      };

      setRunPhase(aiProvider);
      const aiResult =
        aiProvider === "gemini"
          ? await runGeminiDiagnostic(apiKey, body)
          : await runGroqDiagnostic(apiKey, body);
      setResult({
        summary: aiResult.assistant_message,
        model: aiResult.model,
        meta,
        payload_sent: body,
        ai_raw: aiResult.raw_response,
      });
      toast.success("Here\u2019s your clinical guidance");
    } catch (e) {
      console.error(e);
      const mapped = mapDiagnosticError(e);
      setResultError({ title: mapped.title, detail: mapped.detail });
      toast.error(mapped.title);
    } finally {
      setRunning(false);
      setRunPhase("idle");
    }
  };

  const resultSections = useMemo(() => {
    if (!result || typeof result !== "object" || result === null) return [];
    const summary = (result as { summary?: string }).summary;
    if (typeof summary !== "string") return [];
    return splitMarkdownSections(summary);
  }, [result]);

  /* ── No hospital fallback ────────────────────────────────── */

  if (!hospital?.id) {
    return (
      <Layout>
        <div className="min-h-[60vh] flex items-center justify-center p-6">
          <Card className="max-w-md w-full border-amber-200/80 bg-gradient-to-br from-amber-50 to-white shadow-xl rounded-2xl">
            <CardContent className="py-10 px-8 text-center">
              <div className="mx-auto w-16 h-16 rounded-2xl bg-amber-100 flex items-center justify-center mb-5">
                <Building2 className="w-8 h-8 text-amber-700" />
              </div>
              <h2 className="text-xl font-bold text-amber-950 mb-2">
                Hospital not connected
              </h2>
              <p className="text-sm text-amber-900/80 leading-relaxed">
                Your account needs to be linked to a hospital before you can use
                this tool. Please contact your administrator so they can assign
                you to the correct facility.
              </p>
            </CardContent>
          </Card>
        </div>
      </Layout>
    );
  }

  /* ── Main render ─────────────────────────────────────────── */

  return (
    <Layout>
      <div className="min-h-[calc(100vh-4rem)] bg-gradient-to-br from-slate-50 via-white to-teal-50/30">
        <div className="max-w-3xl mx-auto px-4 sm:px-6 py-8 md:py-12 space-y-6">
          {/* ── Hero header ──────────────────────────────── */}
          <header className="space-y-4">
            <div className="flex items-start gap-4">
              <div className="shrink-0 h-12 w-12 sm:h-14 sm:w-14 rounded-2xl bg-gradient-to-br from-teal-500 to-teal-700 flex items-center justify-center shadow-lg shadow-teal-600/20">
                <Stethoscope
                  className="h-6 w-6 sm:h-7 sm:w-7 text-white"
                  aria-hidden
                />
              </div>
              <div className="min-w-0">
                <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-gray-900">
                  Clinical Decision Support
                </h1>
                <p className="text-gray-500 text-sm sm:text-[15px] mt-1 leading-relaxed max-w-xl">
                  Describe the case, optionally attach a referral, and receive
                  structured guidance based on your hospital and the wider
                  network.
                </p>
              </div>
            </div>

            {isDoctorUser(currentAdmin) && (
              <div className="flex items-center gap-2 bg-teal-50 border border-teal-200/60 rounded-xl px-4 py-2.5">
                <Shield className="w-4 h-4 text-teal-600 shrink-0" />
                <p className="text-xs sm:text-sm text-teal-700">
                  <span className="font-semibold">Clinician mode</span> — This
                  assistant supports your judgement; it does not replace it.
                </p>
              </div>
            )}
          </header>

          {/* ── Tips accordion ────────────────────────────── */}
          <details className="group rounded-xl border border-gray-200 bg-white shadow-sm">
            <summary className="flex cursor-pointer list-none items-center justify-between gap-2 px-4 py-3 text-sm font-medium text-gray-700 hover:bg-gray-50/80 rounded-xl select-none">
              <span className="flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-teal-500" />
                Tips for best results &amp; privacy
              </span>
              <ChevronDown className="w-4 h-4 text-gray-400 transition-transform group-open:rotate-180" />
            </summary>
            <div className="px-4 pb-4 pt-1 text-sm text-gray-600 space-y-2 border-t border-gray-100">
              <p>
                Be specific in your note (symptoms, timing, vitals if known). If
                you add a referral, only that record is sent — nothing is
                invented.
              </p>
              <p className="text-xs text-gray-500">
                Voice typing uses your browser's speech recognition and works
                best in Chrome or Edge. Audio is processed on your device / by
                your browser vendor — not stored by NHAP.
              </p>
            </div>
          </details>

          {/* ── Main form card ────────────────────────────── */}
          <Card className="rounded-2xl border-gray-200 shadow-lg overflow-hidden">
            <CardContent className="p-0">
              {/* Step 1 — Clinical note + voice */}
              <div className="p-5 sm:p-6">
                <div className="flex items-center gap-3 mb-4">
                  <StepBadge n={1} />
                  <div>
                    <h2 className="text-base font-semibold text-gray-900">
                      Patient &amp; clinical picture
                    </h2>
                    <p className="text-xs text-gray-500 mt-0.5">
                      Type or dictate a concise summary of the presenting
                      complaint.
                    </p>
                  </div>
                </div>

                <div className="space-y-3">
                  <div className="relative">
                    <label htmlFor="clinical-note" className="sr-only">
                      Clinical note
                    </label>
                    <textarea
                      id="clinical-note"
                      value={presentingNote}
                      onChange={(e) => setPresentingNote(e.target.value)}
                      rows={5}
                      placeholder="Example: 54-year-old with central chest pressure for 2 hours, sweating, history of hypertension..."
                      className="w-full rounded-xl border border-gray-200 bg-gray-50/50 px-4 py-3.5 text-gray-900 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-teal-500/30 focus:border-teal-400 focus:bg-white text-[15px] leading-relaxed transition-colors resize-y min-h-[120px]"
                    />
                    {presentingNote.trim().length > 0 && (
                      <span className="absolute bottom-3 right-3 text-[11px] text-gray-400 tabular-nums">
                        {presentingNote.trim().length} chars
                      </span>
                    )}
                  </div>

                  {speech.interimText && (
                    <div
                      className="flex items-start gap-2 text-sm text-teal-600 bg-teal-50/60 rounded-lg px-3 py-2"
                      aria-live="polite"
                    >
                      <Activity className="w-4 h-4 mt-0.5 shrink-0 animate-pulse" />
                      <span className="italic">{speech.interimText}</span>
                    </div>
                  )}

                  <div className="flex flex-col sm:flex-row sm:items-end gap-3">
                    <div className="flex-1 min-w-[140px]">
                      <label
                        htmlFor="dictation-lang"
                        className="block text-xs font-medium text-gray-600 mb-1.5"
                      >
                        Voice language
                      </label>
                      <select
                        id="dictation-lang"
                        value={speech.language}
                        onChange={(e) => speech.setLanguage(e.target.value)}
                        disabled={!speech.supported || speech.isListening}
                        className="w-full rounded-lg border border-gray-200 bg-white px-3 py-2.5 text-sm text-gray-800 disabled:opacity-50 focus:outline-none focus:ring-2 focus:ring-teal-500/30 focus:border-teal-400"
                      >
                        {DICTATION_LANGUAGES.map((l) => (
                          <option key={l.value} value={l.value}>
                            {l.label}
                          </option>
                        ))}
                      </select>
                    </div>

                    <button
                      type="button"
                      onClick={speech.toggleListening}
                      disabled={!speech.supported}
                      aria-pressed={speech.isListening}
                      className={`
                        inline-flex items-center justify-center gap-2 rounded-xl px-5 py-2.5 text-sm font-medium
                        min-h-[44px] transition-all duration-200
                        disabled:opacity-40 disabled:cursor-not-allowed
                        ${
                          speech.isListening
                            ? "bg-red-500 hover:bg-red-600 text-white shadow-lg shadow-red-500/25 ring-2 ring-red-300/50"
                            : "bg-gray-100 hover:bg-gray-200 text-gray-700 border border-gray-200"
                        }
                      `}
                    >
                      {speech.isListening ? (
                        <>
                          <span className="relative flex h-2.5 w-2.5">
                            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-white/75" />
                            <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-white" />
                          </span>
                          Stop dictation
                        </>
                      ) : (
                        <>
                          <Mic className="w-4 h-4" />
                          Dictate
                        </>
                      )}
                    </button>
                  </div>

                  {!speech.supported && (
                    <p className="text-sm text-amber-700 bg-amber-50 border border-amber-200/70 rounded-lg px-3 py-2.5">
                      Voice typing isn't available in this browser. Use{" "}
                      <strong>Chrome</strong> or <strong>Edge</strong> for
                      dictation, or type your note above.
                    </p>
                  )}
                  {speech.error && (
                    <p className="text-sm text-red-700 bg-red-50 border border-red-200/70 rounded-lg px-3 py-2.5">
                      {speech.error}
                    </p>
                  )}
                </div>
              </div>

              {/* Divider */}
              <div className="border-t border-gray-100" />

              {/* Step 2 — Referral lookup */}
              <div className="p-5 sm:p-6">
                <div className="flex items-center gap-3 mb-4">
                  <StepBadge n={2} />
                  <div>
                    <h2 className="text-base font-semibold text-gray-900">
                      Referral details
                      <span className="ml-2 text-xs font-normal text-gray-400 bg-gray-100 rounded-full px-2 py-0.5">
                        Optional
                      </span>
                    </h2>
                    <p className="text-xs text-gray-500 mt-0.5">
                      If the patient has a referral serial number, look it up to
                      enrich the analysis.
                    </p>
                  </div>
                </div>

                <div className="space-y-3">
                  <div className="flex flex-col sm:flex-row gap-2">
                    <div className="flex-1">
                      <Input
                        label="Serial number"
                        value={serial}
                        onChange={(e) => setSerial(e.target.value)}
                        placeholder="Enter the serial on the referral form"
                        className="bg-gray-50/50 border-gray-200 rounded-xl"
                      />
                    </div>
                    <div className="flex gap-2 sm:pt-6 shrink-0">
                      <Button
                        type="button"
                        onClick={loadReferral}
                        disabled={loadingReferral || !serial.trim()}
                        size="md"
                        icon={
                          loadingReferral ? (
                            <Loader2 className="w-4 h-4 animate-spin" />
                          ) : (
                            <Search className="w-4 h-4" />
                          )
                        }
                      >
                        Find
                      </Button>
                      {referralContext && (
                        <Button
                          type="button"
                          variant="ghost"
                          size="md"
                          onClick={clearReferral}
                          icon={<X className="w-4 h-4" />}
                        >
                          Remove
                        </Button>
                      )}
                    </div>
                  </div>

                  {referralContext && (
                    <div className="rounded-xl border border-emerald-200 bg-emerald-50/50 overflow-hidden">
                      <div className="flex items-center gap-2 px-4 py-2.5 bg-emerald-100/50 border-b border-emerald-200/60">
                        <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                        <span className="text-xs font-semibold text-emerald-800 uppercase tracking-wide">
                          Referral loaded
                        </span>
                      </div>
                      <pre className="px-4 py-3 whitespace-pre-wrap font-mono text-xs text-emerald-900/80 leading-relaxed max-h-48 overflow-y-auto">
                        {JSON.stringify(referralContext, null, 2)}
                      </pre>
                    </div>
                  )}
                </div>
              </div>

              {/* Divider */}
              <div className="border-t border-gray-100" />

              {/* Step 3 — Submit */}
              <div className="p-5 sm:p-6 bg-gray-50/50">
                <div className="flex items-center gap-3 mb-4">
                  <StepBadge n={3} />
                  <div>
                    <h2 className="text-base font-semibold text-gray-900">
                      Generate guidance
                    </h2>
                    <p className="text-xs text-gray-500 mt-0.5">
                      We'll match your case against this hospital's capabilities
                      and the wider network.
                    </p>
                  </div>
                </div>

                <div className="mb-4">
                  <label
                    htmlFor="ai-provider"
                    className="block text-xs font-medium text-gray-600 mb-1.5"
                  >
                    AI provider
                  </label>
                  <select
                    id="ai-provider"
                    value={aiProvider}
                    onChange={(e) =>
                      setAiProvider(e.target.value as AiProvider)
                    }
                    disabled={running}
                    className="w-full sm:w-auto rounded-lg border border-gray-200 bg-white px-3 py-2.5 text-sm text-gray-800 disabled:opacity-50 focus:outline-none focus:ring-2 focus:ring-teal-500/30 focus:border-teal-400"
                  >
                    <option value="gemini">Google Gemini (default)</option>
                    <option value="groq">Groq — Llama 3.3 70B</option>
                  </select>
                  {/* <p className="text-[11px] text-gray-400 mt-1">
                    {aiProvider === 'gemini'
                      ? 'Uses Google Gemini Flash via your Google AI Studio key.'
                      : 'Uses Groq\u2019s free API with Meta Llama 3.3 70B. Requires a groq_api_key in Remote Config.'}
                  </p> */}
                </div>

                {running && runPhase !== "idle" && (
                  <div className="mb-4 p-4 rounded-xl border border-teal-200/60 bg-white">
                    <div className="flex items-center gap-2 mb-3">
                      <Loader2 className="w-4 h-4 text-teal-600 animate-spin" />
                      <span className="text-sm font-medium text-teal-800">
                        {phaseLabelUserFriendly(runPhase)}
                      </span>
                    </div>
                    <ProgressStepper
                      current={runPhase}
                      phases={
                        aiProvider === "gemini"
                          ? RUN_PHASES_GEMINI
                          : RUN_PHASES_GROQ
                      }
                    />
                  </div>
                )}

                <Button
                  type="button"
                  onClick={runDiagnostic}
                  disabled={running || !presentingNote.trim()}
                  size="lg"
                  fullWidth
                  icon={
                    running ? (
                      <Loader2 className="w-5 h-5 animate-spin" />
                    ) : (
                      <ClipboardList className="w-5 h-5" />
                    )
                  }
                  className="rounded-xl shadow-lg shadow-teal-600/15"
                >
                  {running ? "Analyzing..." : "Generate clinical guidance"}
                </Button>

                {!running && !presentingNote.trim() && (
                  <p className="text-xs text-gray-400 text-center mt-2">
                    Write or dictate a clinical note above to get started.
                  </p>
                )}
              </div>
            </CardContent>
          </Card>

          {/* ── Results ───────────────────────────────────── */}
          {(result != null || resultError != null) && (
            <div className="space-y-4 pt-2">
              {/* Results header */}
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-xl bg-gradient-to-br from-emerald-500 to-teal-600 flex items-center justify-center shadow-md shadow-emerald-600/20">
                  <FileText className="w-5 h-5 text-white" />
                </div>
                <div>
                  <h2 className="text-xl font-bold text-gray-900">Guidance</h2>
                  <p className="text-xs text-gray-500">
                    Review each section — verify against the patient before
                    acting.
                  </p>
                </div>
              </div>

              {/* Error */}
              {resultError && (
                <Card className="rounded-2xl border-red-200 shadow-md overflow-hidden">
                  <CardContent className="p-5">
                    <div className="flex items-start gap-3">
                      <div className="shrink-0 mt-0.5 w-9 h-9 rounded-xl bg-red-100 flex items-center justify-center">
                        <AlertCircle className="w-5 h-5 text-red-600" />
                      </div>
                      <div className="min-w-0">
                        <p className="font-semibold text-red-900">
                          {resultError.title}
                        </p>
                        <p className="text-sm mt-1 text-red-800/90 leading-relaxed">
                          {resultError.detail}
                        </p>
                        <p className="text-xs mt-3 text-red-600/70">
                          If this keeps happening, contact support.
                        </p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              )}

              {/* Meta badges */}
              {(() => {
                if (
                  !result ||
                  typeof result !== "object" ||
                  result === null ||
                  !("meta" in result)
                ) {
                  return null;
                }
                const metaRaw = (result as { meta: unknown }).meta;
                if (typeof metaRaw !== "object" || metaRaw === null)
                  return null;
                const m = metaRaw as Record<string, unknown>;
                const ch = m.current_hospital as
                  | Record<string, number>
                  | undefined;
                return (
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                    {ch && (
                      <>
                        <div className="rounded-xl bg-teal-50 border border-teal-100 px-3 py-2.5">
                          <p className="text-[11px] font-medium text-teal-600 uppercase tracking-wider">
                            Services
                          </p>
                          <p className="text-lg font-bold text-teal-900 mt-0.5">
                            {ch.services}
                          </p>
                        </div>
                        <div className="rounded-xl bg-teal-50 border border-teal-100 px-3 py-2.5">
                          <p className="text-[11px] font-medium text-teal-600 uppercase tracking-wider">
                            Equipment
                          </p>
                          <p className="text-lg font-bold text-teal-900 mt-0.5">
                            {ch.equipment}
                          </p>
                        </div>
                        <div className="rounded-xl bg-teal-50 border border-teal-100 px-3 py-2.5">
                          <p className="text-[11px] font-medium text-teal-600 uppercase tracking-wider">
                            Clinicians
                          </p>
                          <p className="text-lg font-bold text-teal-900 mt-0.5">
                            {ch.physicians}
                          </p>
                        </div>
                      </>
                    )}
                    <div className="rounded-xl bg-slate-50 border border-slate-100 px-3 py-2.5">
                      <p className="text-[11px] font-medium text-slate-500 uppercase tracking-wider">
                        Peer hospitals
                      </p>
                      <p className="text-lg font-bold text-slate-800 mt-0.5">
                        {String(m.peer_hospitals_count)}
                      </p>
                    </div>
                    <div className="rounded-xl bg-slate-50 border border-slate-100 px-3 py-2.5">
                      <p className="text-[11px] font-medium text-slate-500 uppercase tracking-wider">
                        Referral
                      </p>
                      <p className="text-sm font-bold text-slate-800 mt-1">
                        {m.includes_referral ? "Included" : "None"}
                      </p>
                    </div>
                    {Number(m.peer_with_quality_notes) > 0 && (
                      <div className="rounded-xl bg-amber-50 border border-amber-200/60 px-3 py-2.5">
                        <p className="text-[11px] font-medium text-amber-600 uppercase tracking-wider">
                          Incomplete data
                        </p>
                        <p className="text-lg font-bold text-amber-800 mt-0.5">
                          {String(m.peer_with_quality_notes)} site(s)
                        </p>
                      </div>
                    )}
                  </div>
                );
              })()}

              {/* Result sections */}
              {resultSections.length > 0 && (
                <div className="space-y-3">
                  {resultSections.map((section, i) => (
                    <Card
                      key={section.heading}
                      className={`rounded-2xl border-gray-200 shadow-sm overflow-hidden border-l-4 ${SECTION_ACCENTS[i % SECTION_ACCENTS.length]}`}
                    >
                      <CardContent className="p-5">
                        <h3 className="text-sm font-bold uppercase tracking-wider text-gray-500 mb-3">
                          {section.heading}
                        </h3>
                        <div className="text-[15px] text-gray-800 whitespace-pre-wrap leading-[1.75]">
                          {section.content || "\u2014"}
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              )}

              {/* Model badge */}
              {result &&
                typeof result === "object" &&
                result !== null &&
                "model" in result && (
                  <p className="text-[11px] text-gray-400 text-right">
                    Model: {String((result as { model: string }).model)}
                  </p>
                )}

              {/* Technical details */}
              <details className="rounded-xl border border-gray-200 bg-white text-sm">
                <summary className="cursor-pointer px-4 py-3 font-medium text-gray-500 hover:text-gray-700 hover:bg-gray-50 rounded-xl select-none transition-colors">
                  Technical details (for support)
                </summary>
                <pre className="text-xs bg-gray-900 text-gray-300 p-4 rounded-b-xl overflow-x-auto max-h-[300px] overflow-y-auto border-t border-gray-800 leading-relaxed">
                  {JSON.stringify(result, null, 2)}
                </pre>
              </details>
            </div>
          )}
        </div>
      </div>
    </Layout>
  );
};

export default DiagnosticPage;
