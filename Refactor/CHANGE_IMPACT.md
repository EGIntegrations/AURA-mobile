# Change Impact Assessment (Based on Current State)

Date: March 17, 2026  
Scope: Impact mapping only; no code changes performed.

## 1) Impact Matrix

| Change Area | Primary Files/Systems Affected | Deployment Impact | Auth/Security Impact | Integration Impact | Risk Level |
| --- | --- | --- | --- | --- | --- |
| Backend URL/domain change | `app.config.js`, `app.json`, EAS secrets | Requires rebuilds for env injection | Can break backend auth mode if invalid/non-HTTPS in production | Affects all `/auth/*` and `/ai/*` proxy traffic | High |
| Toggle offline auth policy | `app.json` (`allowOfflineAuthInProduction`), `AuthenticationService` | No infra change, but behavior change in prod builds | Directly affects fallback auth acceptance | Alters dependence on backend availability | High |
| Move to backend-only provider access | `APIKeyConfigScreen`, `OpenAIService`, `ElevenLabsService`, backend contract docs | May simplify mobile config; increases backend dependency | Reduces client-held key exposure | All provider calls shift to backend SLAs | High |
| Route registration changes | `RootNavigator`, related screens/docs | App QA + release validation required | Can expose or hide auth-gated features | Minimal external integration change | Medium |
| Activate/deprecate Vision Training route | `RootNavigator`, `VisionTrainingScreen`, docs inventory | No infra change | Uses camera + AI consent path | Uses OpenAI vision integration | Medium |
| Provider model/endpoint updates | `OpenAIService`, `ElevenLabsService` | No deployment platform change, but runtime compatibility risk | Error handling and consent expectations may need updates | Direct API contract with OpenAI/ElevenLabs changes | High |
| Storage schema/key changes | `AuthenticationService`, `APIKeyService`, `BackendAuthService`, `ConsentService` | App migration/release notes needed | Sensitive data handling changes | Minimal external change | High |
| Docs domain/privacy URL changes | `app.json`, `docs-site/docusaurus.config.ts`, Vercel settings | Requires docs redeploy and app rebuild for privacy URL | Compliance and policy-link correctness impact | Public URL references change | Medium |
| CI policy expansion (tests/secrets) | `.github/workflows/ci.yml` | Changes merge/release throughput | Better detection of security regressions | Indirect integration reliability improvement | Medium |

## 2) Cross-Cutting Dependencies

1. `BACKEND_BASE_URL` availability controls backend mode and several auth/UI decisions.
2. Consent settings influence AI-facing experiences but are currently enforced at feature entry points.
3. Role visibility checks in dashboard/admin flows depend on both user role and backend/dev mode state.
4. Docs and app config both hardcode public URLs; changing one without the other creates drift.

## 3) High-Risk Current-State Couplings

1. Authentication behavior is coupled to runtime config plus backend reachability, creating multiple user-state paths.
2. Direct-key mode couples end-user device security posture to provider API access.
3. Mimicry and vision scoring trust simulated confidence values, which can influence perceived progress quality.
4. Documentation references include both active and archived paths; governance is needed to avoid accidental scope confusion.

## 4) Validation Checklist for Future Changes

1. Confirm EAS secret/value resolution in build output for backend URL.
2. Verify auth flows in both backend-configured and backend-unconfigured scenarios.
3. Validate consent-gated features (conversation, mimicry, vision) on-device.
4. Rebuild docs (`docs-site`) and verify domain links and code-reference generation.
5. Run CI and confirm secret scanning and typecheck pass.

