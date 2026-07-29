# Update Runbook

This is the canonical procedure for updating this local codex-lb deployment
from upstream. The other overlay docs link here instead of carrying their own
copies of the flow. [divergence-ledger.md](divergence-ledger.md) stays the SSOT
for **what** diverges and the per-file conflict rules; this runbook owns the
**how** of the update.

Machine-specific values (backup dir, container/image/volume names, ports,
runtime env) live in `personal-config.local.md`.

## 0. Preflight

```bash
cd /Users/Ford/local-services/codex-lb
git status                      # clean tree, on ford/main
docker compose -f docker-compose.runtime.yml ps   # codex-lb Up
docker exec codex-lb python -c 'import urllib.request; print(urllib.request.urlopen("http://127.0.0.1:2455/health/ready", timeout=5).read().decode())'
```

Do not start with a dirty tree or an unhealthy container — you want a known-good
baseline to roll back to.

## 1. Backup

```bash
mkdir -p "$HOME/codex-lb-backups"
timestamp="$(date +%Y%m%d-%H%M%S)"

cp docker-compose.runtime.yml \
  "$HOME/codex-lb-backups/docker-compose.runtime.$timestamp.yml"

docker run --rm \
  -v codex-lb-data:/data:ro \
  -v "$HOME/codex-lb-backups:/backup" \
  alpine sh -c "cd /data && tar czf /backup/codex-lb-data-$timestamp.tgz ."
```

The data volume is the durable asset; containers and images are disposable.

## 2. Sync source

```bash
git fetch upstream --tags
git switch ford/main
git merge upstream/main
```

Resolve conflicts per the buckets in
[divergence-ledger.md](divergence-ledger.md) (fork-only / additive / owned;
`rerere` is enabled and replays known resolutions). For every **owned** file,
even if it merged cleanly, review upstream's changes since the last sync and
re-port what matters. Do not hand-merge `frontend/bun.lock`: resolve
`frontend/package.json`, take upstream's lockfile
(`git checkout --theirs frontend/bun.lock`), then run `bun install` in
`frontend/` to regenerate it.

## 3. Validate

```bash
uv run pytest                     # PostgreSQL-only and helm tests skip on this machine
cd frontend && bun run test && bun run typecheck && bun run build && cd ..
npx -y @fission-ai/openspec@latest validate --specs
```

There is no global `openspec` binary on this machine and `bunx` cannot run the
package — use the `npx -y @fission-ai/openspec@latest` form.

## 4. Ledger audit

```bash
git diff upstream/main...ford/main --name-only
```

Every path must be fork-only or listed in the ledger. Reconcile the ledger in
the same sync: add rows for new additive edits, drop rows for divergence
upstream has absorbed.

## 5. Commit the merge

Message pattern: `Merge upstream/main into ford/main (<version>, <headline feature>)`.

## 6. Build image

```bash
short_sha="$(git rev-parse --short=12 HEAD)"
docker build --pull \
  -t codex-lb:local-main \
  -t "codex-lb:main-$short_sha" \
  .
```

## 7. Deploy

```bash
docker compose -f docker-compose.runtime.yml up -d
```

Recreates the container on the new image, preserving the external
`codex-lb-data` volume. Schema migrations are applied by the container
entrypoint before app start, with an automatic pre-migration SQLite backup.
Readiness can lag 30–60 s on a large `store.db`, so poll instead of checking
once:

```bash
for i in $(seq 1 24); do
  docker exec codex-lb python -c 'import urllib.request; print(urllib.request.urlopen("http://127.0.0.1:2455/health/ready", timeout=5).read().decode())' \
    && break
  sleep 5
done
```

## 8. Verify

- Health payload has `"status":"ok"` and `"database":"ok"`.
- `docker compose -f docker-compose.runtime.yml ps` shows `codex-lb` Up.
- `docker exec codex-lb env | grep -c CODEX_LB` matches the env count in
  `docker-compose.runtime.yml`.
- Logs show `Startup database migration is disabled and database schema is
  current` — the entrypoint migrates first, so this line is the healthy signal,
  not a problem — and no tracebacks (`uvicorn.error` is a logger name, not an
  error).
- End-to-end smoke test through the LB:

```bash
codex exec -m gpt-5.6-sol -c model_reasoning_effort="low" --skip-git-repo-check "Reply with exactly: OK"
```

## 9. Push

```bash
git push
```

## Rollback

Repoint `codex-lb:local-main` at the previous build and recreate:

```bash
docker tag codex-lb:main-<oldsha> codex-lb:local-main
docker compose -f docker-compose.runtime.yml up -d
```

Restore the volume tarball only if the database itself is damaged — and note
the schema may have migrated forward, so an old binary against a new schema
will refuse to start.

## Gotchas (learned 2026-07-29 sync)

- Restarting the LB kills in-flight `codex exec` sessions that route through
  it; they can stall silently with no open sockets and no output. Do not run
  codex-dependent agents across step 7; kill (`pkill -f 'bin/codex exec'`) and
  re-run any that were mid-flight.
- Upstream's simplicity-budget check counts `CORE_NAV_ITEMS`; the fork's
  Requests + Share nav items require `.github/simplicity-budgets.toml`
  `core_nav max_items = 7` (a bump is the documented escape hatch; keep the
  ledger row).
- Upstream test fixtures that build report `byModel` entries need the fork's
  additive `tokens` field; the failure signature is TS2741 `'tokens' is
  missing` or Zod parse failures in fork share tests.

## Sync log

| Date | Range | Merge | Image | Notes |
|------|-------|-------|-------|-------|
| 2026-07-29 | v1.21.0-beta.1 → v1.23.0-beta.2 (208 commits) | `93476aa9` | `codex-lb:main-93476aa9ecd1` | 12 additive conflicts; nav budget 5→7; `test_usage_updater.py` divergence absorbed upstream. |
