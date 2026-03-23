import React, { useCallback, useMemo, useState } from 'react';
import {
  Stethoscope,
  Loader2,
  Search,
  ChevronDown,
  Mic,
  Sparkles,
  Building2,
  ClipboardList,
} from 'lucide-react';
import Layout from '../components/layout/Layout';
import { Card, CardHeader, CardTitle, CardContent } from '../components/ui/Card';
import Input from '../components/ui/Input';
import Button from '../components/ui/Button';
import { useHospital } from '../contexts/HospitalContext';
import { useAuth, isDoctorUser } from '../contexts/AuthContext';
import {
  buildCurrentHospitalPayload,
  fetchReferralBySerial,
  fetchPeerHospitalsPayload,
  type DiagnosticRequestBody,
} from '../services/buildDiagnosticPayload';
import {
  getGoogleAiStudioApiKeyFromRemoteConfig,
  runGeminiDiagnostic,
} from '../services/googleAiStudioDiagnostic';
import { splitMarkdownSections } from '../utils/markdownSections';
import { phaseLabelUserFriendly, mapDiagnosticError } from '../utils/diagnosticUserMessages';
import { useSpeechDictation, DICTATION_LANGUAGES } from '../hooks/useSpeechDictation';
import type { DiagnosticRunPhase } from '../types/diagnostic';
import { toast } from 'react-hot-toast';

const DiagnosticPage: React.FC = () => {
  const { hospital } = useHospital();
  const { currentAdmin } = useAuth();
  const [presentingNote, setPresentingNote] = useState('');
  const [serial, setSerial] = useState('');
  const [referralContext, setReferralContext] = useState<Record<string, unknown> | null>(null);
  const [loadingReferral, setLoadingReferral] = useState(false);
  const [running, setRunning] = useState(false);
  const [runPhase, setRunPhase] = useState<DiagnosticRunPhase>('idle');
  const [result, setResult] = useState<unknown>(null);
  const [resultError, setResultError] = useState<{ title: string; detail: string } | null>(null);

  const appendFromDictation = useCallback((text: string) => {
    setPresentingNote((prev) => {
      const t = prev.trimEnd();
      return t ? `${t} ${text}` : text;
    });
  }, []);

  const speech = useSpeechDictation(appendFromDictation);

  const departmentIds = useMemo(() => {
    const raw = hospital?.['Hospital Department'];
    if (!Array.isArray(raw)) return [];
    return (raw as unknown[]).filter((id): id is string => typeof id === 'string');
  }, [hospital]);

  const loadReferral = async () => {
    if (!hospital?.id) {
      toast.error('We couldn’t confirm your hospital. Please refresh the page or sign in again.');
      return;
    }
    setLoadingReferral(true);
    setReferralContext(null);
    try {
      const ctx = await fetchReferralBySerial(hospital.id, serial);
      if (!ctx) {
        toast.error('No referral matches that number at this hospital. Check the number and try again.');
        return;
      }
      setReferralContext(ctx as Record<string, unknown>);
      toast.success('Referral details added');
    } catch (e) {
      console.error(e);
      toast.error('We couldn’t load that referral. Check your connection and try again.');
    } finally {
      setLoadingReferral(false);
    }
  };

  const clearReferral = () => {
    setReferralContext(null);
    setSerial('');
    toast.success('Referral removed from this request');
  };

  const runDiagnostic = async () => {
    if (!hospital?.id) {
      toast.error('Your profile isn’t linked to a hospital yet. Ask your administrator for help.');
      return;
    }
    const note = presentingNote.trim();
    if (!note) {
      toast.error('Add a short description of the patient’s problem, or use voice typing below.');
      return;
    }

    if (speech.isListening) speech.stopListening();

    setRunning(true);
    setRunPhase('remote_config');
    setResult(null);
    setResultError(null);

    try {
      const apiKey = await getGoogleAiStudioApiKeyFromRemoteConfig();

      setRunPhase('building_local');
      const current_hospital = await buildCurrentHospitalPayload(hospital.id, departmentIds);

      setRunPhase('building_network');
      const peer_hospitals = await fetchPeerHospitalsPayload(hospital.id);

      const body: DiagnosticRequestBody = {
        presenting_note: note,
        current_hospital,
        peer_hospitals,
        requested_at: new Date().toISOString(),
        client: 'nhap-admin-panel',
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
        peer_with_quality_notes: body.peer_hospitals.filter((p) => p.data_quality_note).length,
      };

      setRunPhase('gemini');
      const aiResult = await runGeminiDiagnostic(apiKey, body);
      setResult({
        summary: aiResult.assistant_message,
        model: aiResult.model,
        meta,
        payload_sent: body,
        gemini_raw: aiResult.raw_response,
      });
      toast.success('Here’s your clinical guidance');
    } catch (e) {
      console.error(e);
      const mapped = mapDiagnosticError(e);
      setResultError({ title: mapped.title, detail: mapped.detail });
      toast.error(mapped.title);
    } finally {
      setRunning(false);
      setRunPhase('idle');
    }
  };

  const resultSections = useMemo(() => {
    if (!result || typeof result !== 'object' || result === null) return [];
    const summary = (result as { summary?: string }).summary;
    if (typeof summary !== 'string') return [];
    return splitMarkdownSections(summary);
  }, [result]);

  if (!hospital?.id) {
    return (
      <Layout>
        <div className="p-6 md:p-10 max-w-lg mx-auto">
          <Card className="border-amber-200/80 bg-gradient-to-br from-amber-50 to-white shadow-lg overflow-hidden">
            <CardContent className="pt-8 pb-8 px-6">
              <div className="flex gap-4">
                <div className="shrink-0 w-12 h-12 rounded-2xl bg-amber-100 flex items-center justify-center">
                  <Building2 className="w-6 h-6 text-amber-800" />
                </div>
                <div>
                  <h2 className="text-lg font-semibold text-amber-950">Hospital not connected</h2>
                  <p className="text-sm text-amber-900/90 mt-2 leading-relaxed">
                    Your account needs to be linked to a hospital before you can use this tool. Please
                    contact your administrator so they can assign you to the correct facility.
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="min-h-[calc(100vh-4rem)] bg-gradient-to-b from-teal-50/80 via-white to-teal-50/40">
        <div className="max-w-3xl mx-auto px-4 sm:px-6 py-8 md:py-10 space-y-8">
          {/* Hero */}
          <header className="text-center sm:text-left space-y-3">
            <div className="inline-flex items-center justify-center sm:justify-start gap-3">
              <span className="inline-flex h-14 w-14 items-center justify-center rounded-2xl bg-teal-600 text-white shadow-lg shadow-teal-600/25">
                <Stethoscope className="h-7 w-7" aria-hidden />
              </span>
              <div>
                <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-teal-950">
                  Clinical decision support
                </h1>
                <p className="text-teal-700/90 text-sm sm:text-base mt-1 max-w-xl">
                  Describe the case, optionally add a referral, and get structured suggestions based on
                  your hospital and the wider network.
                </p>
              </div>
            </div>
            {isDoctorUser(currentAdmin) && (
              <p className="text-xs sm:text-sm text-teal-600 max-w-2xl mx-auto sm:mx-0">
                You’re in clinician mode — only this tool is shown. This assistant supports your judgement;
                it does not replace it.
              </p>
            )}
          </header>

          {/* Optional collapsible info for admins */}
          <details className="group rounded-2xl border border-teal-200/60 bg-white/70 shadow-sm">
            <summary className="flex cursor-pointer list-none items-center justify-between gap-2 px-4 py-3 text-sm font-medium text-teal-900 hover:bg-teal-50/50 rounded-2xl">
              <span className="flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-teal-600" />
                Tips for best results &amp; privacy
              </span>
              <ChevronDown className="w-4 h-4 text-teal-600 transition group-open:rotate-180" />
            </summary>
            <div className="px-4 pb-4 pt-0 text-sm text-teal-800/90 space-y-2 border-t border-teal-100/80">
              <p>
                Be specific in your note (symptoms, timing, vitals if known). If you add a referral, only
                that record is sent — nothing is invented.
              </p>
              <p className="text-xs text-teal-700">
                Voice typing uses your browser’s speech recognition and works best in Chrome or Edge.
                Audio is processed on your device / by your browser vendor — not stored by NHAP for
                transcription.
              </p>
            </div>
          </details>

          {/* Step 1 — Clinical note + voice */}
          <Card className="rounded-2xl border-teal-200/80 shadow-md shadow-teal-900/5 overflow-hidden">
            <CardHeader className="bg-gradient-to-r from-teal-600 to-teal-700 text-white pb-4">
              <div className="flex items-center gap-2">
                <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-white/20 text-sm font-bold">
                  1
                </span>
                <CardTitle className="text-lg font-semibold">Patient &amp; clinical picture</CardTitle>
              </div>
              <p className="text-teal-100 text-sm font-normal pl-10">
                Type or dictate a concise summary — what brought them in and what you’re considering.
              </p>
            </CardHeader>
            <CardContent className="pt-6 space-y-4">
              <label htmlFor="clinical-note" className="sr-only">
                Clinical note
              </label>
              <textarea
                id="clinical-note"
                value={presentingNote}
                onChange={(e) => setPresentingNote(e.target.value)}
                rows={5}
                placeholder="Example: 54-year-old with central chest pressure for 2 hours, sweating, history of hypertension…"
                className="w-full rounded-xl border border-teal-200 bg-white px-4 py-3 text-teal-950 placeholder:text-teal-400/80 shadow-inner focus:outline-none focus:ring-2 focus:ring-teal-500/40 focus:border-teal-400 text-[15px] leading-relaxed"
              />

              {speech.interimText && (
                <p
                  className="text-sm text-teal-600 italic border-l-4 border-teal-400 pl-3 py-1"
                  aria-live="polite"
                >
                  {speech.interimText}
                </p>
              )}

              <div className="flex flex-col sm:flex-row sm:items-end gap-3 flex-wrap">
                <div className="flex-1 min-w-[140px]">
                  <label htmlFor="dictation-lang" className="block text-xs font-medium text-teal-800 mb-1.5">
                    Voice language
                  </label>
                  <select
                    id="dictation-lang"
                    value={speech.language}
                    onChange={(e) => speech.setLanguage(e.target.value)}
                    disabled={!speech.supported || speech.isListening}
                    className="w-full rounded-xl border border-teal-200 bg-teal-50/50 px-3 py-2.5 text-sm text-teal-900 disabled:opacity-50"
                  >
                    {DICTATION_LANGUAGES.map((l) => (
                      <option key={l.value} value={l.value}>
                        {l.label}
                      </option>
                    ))}
                  </select>
                </div>
                <Button
                  type="button"
                  variant={speech.isListening ? 'danger' : 'secondary'}
                  onClick={speech.toggleListening}
                  disabled={!speech.supported}
                  className={`rounded-xl px-5 py-3 h-auto min-h-[44px] inline-flex items-center justify-center gap-2 ${
                    speech.isListening
                      ? 'bg-red-600 hover:bg-red-700 text-white ring-2 ring-red-400/50 animate-pulse'
                      : ''
                  }`}
                  aria-pressed={speech.isListening}
                >
                  {speech.isListening ? (
                    <>
                      <span className="relative flex h-2.5 w-2.5">
                        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-white opacity-75" />
                        <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-white" />
                      </span>
                      Stop dictation
                    </>
                  ) : (
                    <>
                      <Mic className="w-5 h-5" />
                      Dictate note
                    </>
                  )}
                </Button>
              </div>

              {!speech.supported && (
                <p className="text-sm text-amber-800 bg-amber-50 border border-amber-200/80 rounded-xl px-3 py-2">
                  Voice typing isn’t available in this browser. Use <strong>Chrome</strong> or{' '}
                  <strong>Edge</strong> for dictation, or type your note above.
                </p>
              )}
              {speech.error && (
                <p className="text-sm text-red-800 bg-red-50 border border-red-200/80 rounded-xl px-3 py-2">
                  {speech.error}
                </p>
              )}
            </CardContent>
          </Card>

          {/* Step 2 — Referral */}
          <Card className="rounded-2xl border-teal-200/80 shadow-md shadow-teal-900/5 overflow-hidden">
            <CardHeader className="bg-teal-800/95 text-white pb-4">
              <div className="flex items-center gap-2">
                <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-white/15 text-sm font-bold">
                  2
                </span>
                <CardTitle className="text-lg font-semibold">Referral details (optional)</CardTitle>
              </div>
              <p className="text-teal-100 text-sm font-normal pl-10">
                If the patient has a referral serial number at this hospital, look it up to enrich the
                analysis.
              </p>
            </CardHeader>
            <CardContent className="pt-6 space-y-4">
              <div className="flex flex-col sm:flex-row gap-3">
                <Input
                  label="Referral serial number"
                  value={serial}
                  onChange={(e) => setSerial(e.target.value)}
                  placeholder="Enter the serial on the referral form"
                  className="flex-1 bg-white border-teal-200 rounded-xl"
                />
                <div className="flex flex-col sm:flex-row gap-2 sm:pt-6">
                  <Button
                    type="button"
                    onClick={loadReferral}
                    disabled={loadingReferral || !serial.trim()}
                    className="bg-teal-600 hover:bg-teal-700 text-white rounded-xl min-h-[44px] px-6 inline-flex items-center gap-2"
                  >
                    {loadingReferral ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                      <Search className="w-4 h-4" />
                    )}
                    Find referral
                  </Button>
                  {referralContext && (
                    <Button type="button" variant="secondary" onClick={clearReferral} className="rounded-xl">
                      Remove
                    </Button>
                  )}
                </div>
              </div>
              {referralContext && (
                <div className="rounded-xl border border-teal-100 bg-teal-50/50 p-4 max-h-56 overflow-y-auto">
                  <p className="text-xs font-semibold text-teal-800 uppercase tracking-wide mb-2">
                    Loaded referral (summary)
                  </p>
                  <pre className="whitespace-pre-wrap font-mono text-xs text-teal-900 leading-relaxed">
                    {JSON.stringify(referralContext, null, 2)}
                  </pre>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Step 3 — Run */}
          <Card className="rounded-2xl border-teal-200/80 shadow-md shadow-teal-900/5 overflow-hidden">
            <CardHeader className="bg-slate-800 text-white pb-4">
              <div className="flex items-center gap-2">
                <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-white/15 text-sm font-bold">
                  3
                </span>
                <CardTitle className="text-lg font-semibold">Get guidance</CardTitle>
              </div>
              <p className="text-slate-300 text-sm font-normal pl-10">
                We’ll use your hospital’s services and equipment, and other facilities in the network, to
                suggest next steps and possible referrals.
              </p>
            </CardHeader>
            <CardContent className="pt-6 space-y-4">
              {running && runPhase !== 'idle' && (
                <div
                  className="flex items-start gap-3 rounded-xl border border-teal-200 bg-teal-50/80 px-4 py-3 text-sm text-teal-900"
                  role="status"
                  aria-live="polite"
                >
                  <Loader2 className="w-5 h-5 animate-spin shrink-0 text-teal-600 mt-0.5" />
                  <span>{phaseLabelUserFriendly(runPhase)}</span>
                </div>
              )}
              <Button
                type="button"
                onClick={runDiagnostic}
                disabled={running}
                className="w-full sm:w-auto rounded-xl bg-teal-600 hover:bg-teal-700 text-white px-8 py-3.5 min-h-[48px] text-base font-medium shadow-lg shadow-teal-600/20 inline-flex items-center justify-center gap-2"
              >
                {running ? (
                  <>
                    <Loader2 className="w-5 h-5 animate-spin" />
                    Working…
                  </>
                ) : (
                  <>
                    <ClipboardList className="w-5 h-5" />
                    Generate clinical guidance
                  </>
                )}
              </Button>
            </CardContent>
          </Card>

          {/* Results */}
          {(result || resultError) && (
            <Card className="rounded-2xl border-teal-300/80 shadow-lg overflow-hidden">
              <CardHeader className="bg-gradient-to-r from-emerald-700 to-teal-700 text-white">
                <CardTitle className="text-xl font-semibold">Guidance</CardTitle>
                <p className="text-emerald-100 text-sm font-normal mt-1">
                  Review each section — verify against the patient before acting.
                </p>
              </CardHeader>
              <CardContent className="pt-6 space-y-5">
                {resultError && (
                  <div
                    className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-red-950"
                    role="alert"
                  >
                    <p className="font-semibold">{resultError.title}</p>
                    <p className="text-sm mt-1 leading-relaxed opacity-95">{resultError.detail}</p>
                    <p className="text-xs mt-3 text-red-800/80">If this keeps happening, contact support.</p>
                  </div>
                )}

                {(() => {
                  if (!result || typeof result !== 'object' || result === null || !('meta' in result)) {
                    return null;
                  }
                  const metaRaw = (result as { meta: unknown }).meta;
                  if (typeof metaRaw !== 'object' || metaRaw === null) return null;
                  const m = metaRaw as Record<string, unknown>;
                  const ch = m.current_hospital as Record<string, number> | undefined;
                  return (
                    <div className="flex flex-wrap gap-2 text-xs">
                      <span className="inline-flex items-center rounded-full bg-teal-100 px-3 py-1.5 font-medium text-teal-900">
                        Referral included: {m.includes_referral ? 'Yes' : 'No'}
                      </span>
                      {ch && (
                        <>
                          <span className="inline-flex items-center rounded-full bg-teal-100 px-3 py-1.5 font-medium text-teal-900">
                            This hospital: {ch.services} services · {ch.equipment} equipment · {ch.physicians}{' '}
                            clinicians
                          </span>
                          <span className="inline-flex items-center rounded-full bg-teal-100 px-3 py-1.5 font-medium text-teal-900">
                            {ch.departments} departments
                          </span>
                        </>
                      )}
                      <span className="inline-flex items-center rounded-full bg-slate-100 px-3 py-1.5 font-medium text-slate-800">
                        Other hospitals considered: {String(m.peer_hospitals_count)}
                      </span>
                      {Number(m.peer_with_quality_notes) > 0 && (
                        <span className="inline-flex items-center rounded-full bg-amber-100 px-3 py-1.5 font-medium text-amber-950">
                          Incomplete data for {String(m.peer_with_quality_notes)} site(s)
                        </span>
                      )}
                      {'model' in result && (
                        <span className="inline-flex items-center rounded-full bg-slate-200/90 px-3 py-1.5 font-medium text-slate-800">
                          Model: {String((result as { model: string }).model)}
                        </span>
                      )}
                    </div>
                  );
                })()}

                {resultSections.length > 0 && (
                  <div className="space-y-4">
                    {resultSections.map((section) => (
                      <div
                        key={section.heading}
                        className="rounded-2xl border border-teal-100 bg-white p-5 shadow-sm"
                      >
                        <h3 className="text-sm font-bold uppercase tracking-wide text-teal-800 border-b border-teal-100 pb-2 mb-3">
                          {section.heading}
                        </h3>
                        <div className="text-[15px] text-teal-950 whitespace-pre-wrap leading-relaxed">
                          {section.content || '—'}
                        </div>
                      </div>
                    ))}
                  </div>
                )}

                <details className="rounded-xl border border-slate-200 bg-slate-50 text-sm text-slate-700">
                  <summary className="cursor-pointer px-4 py-3 font-medium hover:bg-slate-100 rounded-xl">
                    Technical details (for support)
                  </summary>
                  <pre className="px-4 pb-4 text-xs bg-slate-900 text-teal-100 p-4 rounded-b-xl overflow-x-auto max-h-[280px] overflow-y-auto mx-0 border-t border-slate-700">
                    {JSON.stringify(result, null, 2)}
                  </pre>
                </details>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </Layout>
  );
};

export default DiagnosticPage;
