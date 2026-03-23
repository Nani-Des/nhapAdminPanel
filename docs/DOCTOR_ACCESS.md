# Doctor / clinical sign-in (diagnostic-only UI)

Clinical users use the **same Firebase Auth login** as admins. Access is driven by the Firestore `Users/{uid}` document.

## Who gets the diagnostic-only interface?

- **`Role: true`** in `Users` **and** `baseRole` is **not** one of `main_admin`, `hospital_admin`, `hospital_manager`  
  → After login, only the **Diagnostic tool** is shown.

Hospital admins and managers often also have **`Role: true`**; they still get the **full admin panel** because their `baseRole` is a staff role.

## Who can sign in at all?

- Any user with **`baseRole`** in `main_admin` | `hospital_admin` | `hospital_manager`, **or**
- Any user with **`Role: true`**

Others are signed out automatically.

## Hospital link

Set at least one of: `hospitalId`, **`Hospital ID`**, or `HospitalID` (must match a `Hospital` document ID). Without it, the diagnostic page cannot load hospital context.

## Google AI Studio (Gemini) + Remote Config

1. In [Google AI Studio](https://aistudio.google.com/) create an API key for the **Generative Language API** (Gemini).
2. In **Firebase Console → Remote Config**, create parameter **`google_ai_studio_api`** (string) and paste that key.
3. Publish the Remote Config template.
4. The diagnostic page calls **`fetchAndActivate`** then reads **`google_ai_studio_api`**.

**Important:** A key in Remote Config is still delivered to the **client** — it can be extracted. For production, prefer a **backend or Cloud Function** that calls Gemini and does not expose the key.

**Model:** Default is **`gemini-2.0-flash`**. Override with env **`VITE_GEMINI_MODEL`** (e.g. `gemini-1.5-flash`) if your key only enables certain models.

## Local development CORS

`npm run dev` proxies **`/google-ai-api`** → `https://generativelanguage.googleapis.com` (see `vite.config.ts`) so browser calls from the dev server avoid CORS issues.

Optional env: **`VITE_GOOGLE_AI_API_BASE`** — full base URL (no trailing slash) if you host your own proxy in production.

## Voice typing (clinical note)

On the diagnostic page, **Dictate note** uses the browser’s **Web Speech API** (speech-to-text). It works best in **Chrome** or **Edge**; other browsers may hide the button. Spoken text is appended to the clinical note. Transcription is handled by the browser/OS vendor — not stored by NHAP as audio for this feature.

## Referral context

Referral data is **optional**. It is only included in the model prompt if the doctor loads a record by **Serial Number** from `Hospital/{id}/Referrals`.

## Feasibility, robustness, testing

See **`docs/FEASIBILITY_AND_ROBUSTNESS.md`** for production architecture, scaling Firestore reads, timeouts, and a go-live checklist. High-level API design notes remain in **`docs/DIAGNOSTIC_API_BRAINSTORM.md`**.
