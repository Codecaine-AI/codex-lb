## Operational Note

The deployed OrbStack container was receiving browser OAuth callbacks on
`127.0.0.1:1455`, so the callback listener itself was not the broken part.
The failure mode was that dashboard re-authentication started the same OAuth
flow as Add Account and did not send the selected account id. After the callback
was exchanged for tokens, persistence had no re-auth target and could write
through the generic add/upsert path instead of healing the clicked
`reauth_required` account.

This change makes re-authentication account-targeted: the dashboard sends
`reauthAccountId`, the OAuth state retains it for browser/manual/device
completion, and token persistence updates that exact account only after the
returned ChatGPT identity matches the selected account.

## Local OrbStack Deployment

On 2026-06-18, the local OrbStack Docker deployment was rebuilt from this
working tree and redeployed with the existing runtime profile:

- Image tags: `codex-lb:local-main`, `codex-lb:main-5fa9f5ab8813`
- Image id: `sha256:65cd6a12710311542e06ac92e7dd3653e7312821a6c9d0f751885b81c07dced0`
- Container: `codex-lb`
- Ports: `127.0.0.1:2455->2455`, `127.0.0.1:1455->1455`
- Durable volume preserved: `codex-lb-data:/var/lib/codex-lb`
- Verification: `/health/live` and `/health/ready` both returned `status: ok`
