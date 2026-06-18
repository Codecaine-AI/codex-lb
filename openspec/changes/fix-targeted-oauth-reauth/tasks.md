## 1. Spec

- [x] 1.1 Add targeted OAuth re-authentication requirements.

## 2. Implementation

- [x] 2.1 Add an optional re-auth account id to OAuth start requests and flow state.
- [x] 2.2 Persist targeted OAuth completions into the selected account row with identity mismatch protection.
- [x] 2.3 Send the selected account id from dashboard re-auth actions while leaving add-account OAuth untouched.

## 3. Verification

- [x] 3.1 Add backend regression coverage for targeted re-auth success and mismatch failure.
- [x] 3.2 Add frontend regression coverage for OAuth start payloads.
- [x] 3.3 Run focused backend/frontend tests.
- [ ] 3.4 Run OpenSpec validation. (Blocked locally: `openspec` is not installed in this shell.)
