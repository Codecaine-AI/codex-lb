## Why

Dashboard re-authentication currently starts the same OAuth flow used for adding a new account. The OAuth callback is consumed correctly, but the flow does not retain the selected account id, so token persistence cannot deterministically heal the account whose action the operator clicked.

This can leave the original account in `reauth_required` while the refreshed credentials are written through the generic add/upsert path.

## What Changes

- Carry the selected account id from the account detail re-authenticate action into `POST /api/oauth/start`.
- Persist the re-auth target in OAuth flow state for browser, manual-callback, and device-code completions.
- When a targeted re-auth completes, update that exact account row after verifying the returned ChatGPT identity matches the selected account.
- Keep generic Add Account OAuth behavior unchanged.

## Impact

- Affects dashboard account re-authentication UX.
- Affects OAuth start request schema and in-memory OAuth flow state.
- Adds regression coverage for targeted re-auth persistence and start payloads.
