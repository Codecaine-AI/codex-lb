# Runtime Profile

This is the shareable version of the fork's local runtime shape. Machine-specific
paths, CIDRs, and private operational notes live in `personal-config.local.md`,
which is intentionally ignored in this checkout.

## Deployment Shape

- Build a local image from the current checkout rather than depending on a
  published `latest` image.
- Run the service from an ignored `docker-compose.runtime.yml`.
- Preserve the external Docker data volume across container rebuilds.
- Treat the data volume as the durable asset; containers and images are
  disposable.

The full rebuild/update loop (backup → merge → validate → build → deploy →
verify) lives in the [update runbook](update-runbook.md).

## Auth Stance

For the local Codex client, this fork can run without a global Codex LB API key
when requests are local or explicitly allowlisted by operator configuration.

Project or workflow identity should be modeled separately from API-key auth. A
future overlay should prefer a dedicated project-context header over a second
`Authorization` bearer so intermediaries and framework auth parsers stay simple.

## High Fan-Out Tuning

This fork is expected to support high sub-agent fan-out. The local runtime can
raise internal proxy caps so the load balancer does not reject work before the
real upstream capacity is reached.

Important categories:

- Per-account stream and response-create caps.
- Process-wide response-create and websocket-connect gates.
- Bulkhead lane limits for HTTP, websocket, and compact traffic.
- Token-refresh concurrency.
- Upstream HTTP connection pool limits.

Raising these limits does not create upstream capacity. It only prevents local
admission limits from becoming the first bottleneck.

## Failure Triage

Use the 429 `error.code` to identify who rejected the request:

| Code | Source | Usual action |
|---|---|---|
| `account_stream_cap` | LB per-account stream cap | Tune per-account caps or routing spread |
| `account_response_create_cap` | LB per-account create cap | Tune create caps or routing spread |
| `proxy_overloaded` | LB global/lane gate | Tune admission/bulkhead limits |
| `rate_limit_exceeded` | Upstream | Add upstream capacity or reduce traffic |
| `usage_limit_reached` | Upstream | Add upstream capacity or reduce traffic |

If account caps are reported while real traffic is light, suspect an in-memory
lease accounting leak and inspect acquire/release/finalization paths.
