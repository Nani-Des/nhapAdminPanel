# Diagnostic tool & external API — design notes

Use this when you build the doctor-facing flow and backend that calls an LLM or clinical API.

## 1. What the API should receive (JSON contract)

Send **structured** data, not raw chat, so you can version prompts and audit inputs.

| Block | Purpose |
|--------|--------|
| `patient_context` | Age band, sex (if allowed), presenting complaint, duration, severity, red flags, allergies (if known) |
| `medical_history` | Summarised conditions, meds, prior procedures — **only what the doctor is allowed to see** |
| `hospital_capabilities` | Services (name, hours, description), **equipment register** (name, category, qty), optional bed/ICU counts |
| `locale` | Country/region, language for output |
| `session` | `hospital_id`, optional `doctor_id`, `request_id` for logging |

Optional later: `evidence_links` (guidelines IDs), `mode` (`draft` vs `final`).

## 2. What the API should return

- **Differential diagnosis** (ranked, with confidence bands as *uncertainty*, not probability of disease).
- **Suggested workup** (labs/imaging) mapped where possible to **equipment you have** vs **missing**.
- **Treatment suggestions** framed as *options to discuss with patient* (not prescriptions unless legally integrated).
- **Facility fit**: `can_manage_here: boolean`, `gaps: string[]` (missing capability).
- **Referral**: `referral_recommended: boolean`, `reason`, `suggested_specialty`, `minimum_facility_requirements` (e.g. “CT + surgical theatre”).

## 3. Prompt structure (LLM)

**System message (fixed):**

- Role: clinical decision support only; not a substitute for a licensed clinician.
- Use only provided context; if data is missing, say what is missing.
- Output valid JSON matching your schema (or markdown sections if you parse later — JSON is safer for UI).
- No fabricated history; flag uncertainty.
- If capabilities are insufficient, **do not** claim the hospital can manage; start referral reasoning.

**User message (templated):**

1. *Presenting problem* (doctor-entered).
2. *History excerpt* (from EMR).
3. *Hospital services & equipment* (bullet list from Firestore).
4. *Task*: assess fit, suggest investigations, treatment outline, and referral if needed.

Keep PHI out of logs where possible: log `request_id` + hashes, not full narrative, unless compliant logging is in place.

## 4. Architecture options

| Approach | Pros | Cons |
|----------|------|------|
| **Backend-only proxy** (your API → OpenAI/Anthropic/etc.) | Hides keys, adds auth, rate limits | You maintain server |
| **RAG over guidelines** | More defensible suggestions | Build + maintain corpus |
| **Clinical APIs** (region-specific) | May be regulation-aligned | Cost, integration |

Recommended: **HTTPS POST** from your backend; Firebase Callable Function or Cloud Run; verify **doctor JWT** or session; attach `hospital_id` and load capabilities server-side (don’t trust client-only lists for safety-critical referral logic).

## 5. Compliance & safety

- **Disclaimer** in UI: support tool only; clinician responsible for decisions.
- **Audit trail**: who ran the tool, when, input summary, model version.
- **Data minimisation**: send the smallest history slice needed.
- **Regional law**: telemedicine, prescribing, and AI medical devices rules vary by country.
- **Referral workflow**: prefer creating a **Referral** record in your app with structured fields rather than only free text.

## 6. Tie-in to this admin panel

- **Services** + **Equipment** subcollections under `Hospital/{id}` are the source of truth for “what we have”.
- The diagnostic tool (future) should **read the same data** (via backend) when the doctor selects a hospital context.

## 7. Firestore: Equipment collection

Equipment is stored at:

`Hospital/{hospitalId}/Equipment/{docId}`

Ensure your security rules allow the same roles that can write `Services` to write `Equipment`, or adjust as needed.

## 8. Implemented in this app (Google AI Studio / Gemini + Remote Config)

- Firebase Remote Config parameter **`google_ai_studio_api`** supplies the Google AI Studio API key (see `src/services/googleAiStudioDiagnostic.ts`). The app calls the **Gemini** `generateContent` REST API.
- Optional env **`VITE_GEMINI_MODEL`** (default `gemini-2.0-flash`).
- Referral context is **omitted from the prompt** unless the doctor loads a referral by serial number.
- **Doctor access**: `Users.Role === true` and not a staff `baseRole` → diagnostic-only UI (`docs/DOCTOR_ACCESS.md`).
