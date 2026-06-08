# Fork Overlay

This folder is the Codecaine/Ford overlay for this fork. It captures fork-only
design direction, shareable runtime context, and the plan for custom behavior
that should ride on top of upstream `Soju06/codex-lb` instead of being scattered
across the repository root.

The goal is to keep upstream easy to ingest while giving the fork a clear place
to grow its own product layer.

## Repository Model

- `upstream` points at `Soju06/codex-lb` and is fetch-only in this checkout.
- `origin` points at `Codecaine-AI/codex-lb`.
- `ford/main` is the fork integration branch for overlay work.
- `main` tracks upstream and is useful as a clean comparison point.

Normal upstream update flow:

```bash
git fetch upstream --tags
git switch ford/main
git merge upstream/main
openspec validate --specs
git push
```

For heavier conflicts, resolve once and let `git rerere` remember the fix for
future upstream merges.

## Contents

- [availability-routing-design.md](availability-routing-design.md): draft design
  for an in-flight-aware, reset-priority account routing strategy.
- [runtime-profile.md](runtime-profile.md): shareable runtime assumptions and
  high fan-out tuning model.
- `personal-config.local.md`: ignored local notes with machine-specific paths,
  CIDRs, and commands for this workstation.

## Change Lanes

Use these lanes to keep the fork maintainable:

- Fork overlay docs and operating notes live here in `fork-overlay/`.
- Behavior, API, schema, routing, dashboard, or proxy-contract changes still use
  OpenSpec under `openspec/changes/<slug>/` before implementation.
- Stable product requirements live in `openspec/specs/**/spec.md`.
- Free-form product rationale and examples live in OpenSpec context docs, not in
  `docs/`.
- Secrets, tokens, machine-specific compose files, and one-off runtime state stay
  untracked or ignored locally.

## First Overlay Layers

Good first fork layers:

- `add-inflight-aware-routing`: add an opt-in routing strategy that considers
  live per-account in-flight load before selecting an account.
- `add-project-context-routing`: add a request-scoped project identity/context
  that routing can use without overloading the existing API-key model.
- Dashboard refinements that expose the fork-only routing and project controls.

Keep each layer default-off or explicitly configured where practical. That keeps
upstream merges quieter and makes it easier to promote generally useful pieces
back upstream later.
