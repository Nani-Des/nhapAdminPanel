# Making NHAP diagnostic + admin more feasible, robust, and clear

Use this as a roadmap. You can adopt items in phases.

## 1. Feasibility (can you ship and sustain it?)

| Topic | Why it matters | Practical step |
|--------|----------------|----------------|
| **API key in the client** | Keys in Remote Config still reach the browser and can be copied. | Phase 1: OK for pilot. Phase 2: **Cloud Function** or small **BFF** that reads the secret server-side and calls **Gemini**. |
| **CORS / hosting** | Production calls `generativelanguage.googleapis.com` unless you set `VITE_GOOGLE_AI_API_BASE` to your proxy. | Deploy **nginx / Cloud Run / Firebase Hosting rewrites** that proxy `/google-ai-api` → Google’s API, or use only a backend. |
| **Cost & limits** | Every “Run analysis” sends large JSON (all peer hospitals). | Add **caching** of peer summaries server-side; **truncate** peer list by region; charge/limit per hospital. |
| **Firestore reads** | Loading every hospital’s subcollections scales O(hospitals). | **Cloud Function** scheduled job writes `HospitalCapabilities/{id}` summaries; diagnostic reads those docs only. |

## 2. Robustness (fewer failures, safer behaviour)

- **Timeouts**: Gemini and Firestore fetches should not hang forever (the app uses a bounded timeout on the model request).
- **Partial data**: If one peer hospital fails to load, others still appear; note `data_quality_note` in payload when needed.
- **Rules & indexes**: Ensure **security rules** allow read paths used by doctors; add **composite indexes** for `Users` (`Hospital ID` + `Role`) if queries fail in console.
- **Validation**: Keep **presenting note** minimum length; optionally max length to control tokens.
- **Versioning**: Log **model name** + **Remote Config fetch time** in analytics for debugging regressions.

## 3. Comprehensibility (users trust what they see)

- **Fixed response shape**: Ask the model for **### headings** (implemented in the system prompt) so the UI can show section cards.
- **Metadata chips**: Show counts (services, equipment, peer hospitals, referral yes/no) so clinicians see what context was used.
- **Progress steps**: Show “Loading config → hospital data → network → generating guidance” so waits feel intentional.
- **Disclaimers**: Keep visible: **decision support only**, not a diagnosis; clinician responsible.
- **Training**: Short internal doc + 5-minute demo for doctors and admins.

## 4. Compliance & safety

- **Audit log**: Who ran the tool, when, hospital id (avoid storing full PHI in logs if not required).
- **Consent / policy**: Align with local telehealth and medical-device rules for “AI assistance”.
- **Human review**: Referral suggestions are **informational**; workflow should still use your existing Referrals collection and approvals.

## 5. Testing checklist (before go-live)

- [ ] Doctor with `Role: true` → only diagnostic; admin → full panel + diagnostic.
- [ ] Remote Config `google_ai_studio_api` published; app fetches after cold start.
- [ ] Run analysis with **no** referral → prompt has no referral block.
- [ ] Run with **loaded** referral → referral JSON present.
- [ ] Throttle network (slow 3G) → timeout message appears instead of infinite spinner.
- [ ] One hospital with broken subcollection rules → others still load (`data_quality_note` if implemented).

## 6. Suggested architecture (mature state)

```
[React app] → [HTTPS Callable or REST BFF] → Gemini (Google AI)
                 ↑ reads secret from Secret Manager / RC (server)
                 ↑ builds payload from Firestore (service account)
```

This removes secrets from the client and centralizes truncation, logging, and rate limits.
