# Design Doc: In-Flight-Aware, Reset-Priority Routing Strategy

**Status:** Draft / proposal — not yet implemented
**Author:** Ford (with Claude)
**Date:** 2026-06-06
**Scope:** New account-selection strategy for the codex-lb proxy load balancer
**Workflow note:** This is a routing *behavior* change. Per repo rules it must
land as an OpenSpec change under `openspec/changes/<slug>/` (capability
`account-routing`) before implementation. This doc is the design input for that
change, not a substitute for it.

---

## 1. Problem

Running ~60 concurrent Codex sub-agents across 3–4 accounts, the proxy returns
HTTP 429 with `error_code=account_stream_cap` even though aggregate capacity
exists. Two compounding causes:

1. **Per-account concurrency caps were low.** Defaults of 8 streams / 4
   response-creates per account gave a ceiling of only `3 × 8 = 24` concurrent
   streams. (Mitigated already — raised to 40 / 20 via
   `CODEX_LB_PROXY_ACCOUNT_STREAM_LIMIT` / `CODEX_LB_PROXY_ACCOUNT_RESPONSE_CREATE_LIMIT`
   in `docker-compose.runtime.yml`. See [runtime-profile.md](runtime-profile.md).)

2. **No routing strategy is in-flight aware.** The active strategy
   (`capacity_weighted`) weights account selection purely by remaining quota
   credits (`app/core/balancer/logic.py:954`). It does not consider how many
   requests are *already running* on an account, so a concurrent burst piles
   onto whichever accounts have the most quota until they slam their caps, while
   other eligible accounts sit idle. Raising caps adds headroom but does not fix
   the lopsided distribution.

The existing strategies and their blind spots:

| Strategy | Orders eligible accounts by | In-flight aware? |
|---|---|---|
| `capacity_weighted` (current default) | remaining secondary credits | ❌ |
| `relative_availability` | remaining credits ÷ seconds-until-reset, top-K | ❌ |
| `round_robin` | least-recently-selected (`last_selected_at`) | ❌ (proxy only) |
| `fill_first` / `*_drain` | most-saturated first (intentional concentration) | ❌ |

`round_robin` spreads bursts most evenly of the existing options but is quota-
and reset-blind. None weight by live load.

## 2. Goals

1. **In-flight awareness (primary).** Place parallel work on accounts with free
   concurrency headroom so a burst fills accounts up to their safe limits and
   spills to the next, rather than stampeding one account into its cap. Avoid
   `account_stream_cap` / `account_response_create_cap` 429s until *all*
   accounts are genuinely saturated.
2. **Reset priority.** Prefer accounts whose rate-limit window resets soonest
   (and/or have the most remaining quota), so the accounts we burn recycle their
   limits fastest while fresher accounts stay in reserve.
3. **Preserve existing safety gates.** Health, quota, rate-limit, model-plan,
   and per-account cap eligibility filtering must continue to run *before* the
   strategy scores anything.
4. **Preserve stickiness semantics.** Sticky (`codex_session` hard continuity,
   `prompt_cache` affinity) behavior is unchanged; the new strategy governs
   first-turn / non-sticky placement.

## 3. Non-Goals

- Cross-process / multi-instance shared load state (counts are per-process).
- Changing the per-account cap mechanism itself.
- Overriding `prompt_cache_key` affinity (sticky pinning still wins; see §8).
- Predictive/ML load forecasting — this is deterministic scoring only.

## 4. Key Insight: the data already exists

The router already tracks live per-account load; it simply isn't used for
*ordering*. `AccountState` (`app/core/balancer/logic.py:108`) carries:

- `inflight_response_creates: int` (`logic.py:130`)
- `inflight_streams: int` (`logic.py:131`)
- `leased_tokens: float` (`logic.py:132`)
- `reset_at: float | None` (`app/modules/proxy/load_balancer.py:101`)

These are populated from the live lease counters incremented/decremented under
lock at `load_balancer.py:228-231` (acquire) and `:253-256` (release). Today
they feed only a **binary cap gate** (`_filter_states_for_account_caps`,
`load_balancer.py:1682-1686`): an account is eligible or not. The new strategy
*weights* by them instead of just gating on them.

Reset-priority math already exists too: `relative_availability` computes
`remaining_credits ÷ seconds_until_reset` with a tunable power and top-K filter
(`logic.py:827`). The new strategy reuses that as its priority term.

## 5. Proposed Design: "weighted least-loaded with reset priority"

A classic weighted-least-connections balancer fused with quota/reset priority.
For each account that passes existing eligibility gates:

```
available_headroom(a) = min(
    stream_cap        - inflight_streams(a),
    response_create_cap - inflight_response_creates(a),
)                                    # clamp to >= 0
priority_weight(a)   = remaining_secondary_credits(a) / max(seconds_until_reset(a), FLOOR)
score(a)             = priority_weight(a) * available_headroom(a)
```

Selection: choose `argmax(score)` (deterministic least-loaded), or weighted-
random among the top-K to avoid micro-stampedes on exact ties.

Behavior this produces:

- **`available_headroom` → 0** as an account approaches its cap, so its score
  collapses and new work routes elsewhere *before* it 429s. This is the
  in-flight awareness.
- **`priority_weight`** drains soonest-resetting / highest-quota accounts first,
  satisfying "use the top ones first so limits reset fastest."
- The product means: among the accounts you most want to burn, send work only up
  to their safe concurrency, then overflow to the next-best — load-aware,
  reset-smart, and 429-avoiding by construction.

Tunables (reuse / extend existing knobs):
- `relative_availability_power` — how sharply to favor top-priority accounts.
- `relative_availability_top_k` — candidate pool for the weighted-random tie-break.
- `FLOOR` for `seconds_until_reset` — bound the weight when reset is unknown/imminent
  (mirrors existing relative-availability handling of unknown resets).

## 6. The critical correctness problem: select-then-lease race

**This is the make-or-break detail.** Today, selection picks an account from a
snapshot and the lease is acquired *afterward*. Under a burst of N simultaneous
selections, all N read the same snapshot — every one sees "account A has 0
in-flight" — and all N stampede onto A before any lease registers. That thundering
herd makes least-loaded degenerate into `capacity_weighted` exactly when it
matters most.

**Requirement:** selection and the in-flight increment must be **atomic** —
select-and-reserve inside the same lock that guards the lease counters
(`load_balancer.py:228`). Each selection must observe the reservations made by
concurrent selections microseconds earlier.

This is precisely the async task-ownership / shared-state concern called out in
`CLAUDE.md` ("Do not share one AsyncSession across concurrent tasks; ... preserve
finalization/settlement paths after partial errors"). Design constraints:

- Move the headroom read + chosen-account increment into the lease lock's
  critical section (or a dedicated selection lock ordered consistently with it
  to avoid deadlock).
- On any downstream failure after reserve-but-before-use, the reservation MUST be
  released on every path (finally/cleanup), or headroom leaks and we recreate the
  stale-lease problem (see [runtime-profile.md](runtime-profile.md) lease-leak note).
- Keep the critical section minimal (scoring can be done on the snapshot; only the
  final pick + increment needs the lock) to avoid serializing throughput.

## 7. Configuration

- New `routing_strategy` enum value, e.g. `availability_weighted` (or
  `least_loaded`), added to:
  - the strategy literal in `app/core/balancer/logic.py:56`,
  - the validation pattern in `app/modules/settings/schemas.py:22` and `:60`,
  - resolution in `app/modules/proxy/service.py:16937`.
- Selected via the DB-backed `dashboard_settings.routing_strategy` (dashboard UI
  → Settings → routing strategy, or `PUT /api/settings`). Read through the cached
  settings layer (`get_settings_cache().get()`), so a UI/API change is picked up
  live; a raw DB edit needs a restart.
- Per-account caps remain `CODEX_LB_PROXY_ACCOUNT_STREAM_LIMIT` /
  `CODEX_LB_PROXY_ACCOUNT_RESPONSE_CREATE_LIMIT` (settings.py:293 / :292); the
  strategy reads these as its headroom ceilings.

## 8. Interactions & edge cases

- **Sticky sessions win first.** Sticky selection (`_select_with_stickiness`,
  `load_balancer.py:1177`) runs before strategy scoring. `codex_session` hard
  continuity and non-empty `prompt_cache_key` affinity still pin a session to its
  account regardless of strategy — so if sub-agents share a prompt-cache key they
  can still clump. The new strategy only governs unpinned / first-turn placement.
- **All accounts at headroom 0.** Every score is 0 → genuine saturation → return
  the existing local-overload 429 (`account_stream_cap`), same as today. The
  strategy does not invent capacity.
- **Unknown `reset_at`.** Use the `FLOOR` bound so priority stays finite; fall
  back to remaining-credits ordering when reset timing is absent.
- **Single eligible account.** Degenerates to that account (subject to its cap),
  identical to current behavior.
- **Token-weighted headroom (optional v2).** Could fold `leased_tokens` /
  `proxy_account_lease_token_weight` (settings.py:295) into headroom for
  token-aware rather than count-aware balancing. Out of scope for v1.

## 9. Testing requirements

Per repo rules, test the externally-failing surface and the partial-failure /
concurrency paths, not just the happy path:

1. **Concurrency / anti-stampede (the key test):** fire N concurrent selections
   at M accounts and assert the distribution spreads to fill headroom rather than
   stampeding one account; assert no account exceeds its cap.
2. **Reset priority:** with equal headroom, assert soonest-reset / highest-quota
   accounts are drained first.
3. **Spill-over:** as one account fills, assert subsequent selections move to the
   next-best account before any 429.
4. **Saturation:** all accounts at cap → assert the documented `account_stream_cap`
   429 with `Retry-After`, no phantom capacity.
5. **Reservation release on failure:** selection reserves, downstream errors →
   assert headroom is released (no leak), covering the finalization path.
6. **Sticky precedence:** pinned session ignores the strategy; verify unchanged.

## 10. Rollout

1. Land behind the new enum value; default stays `capacity_weighted` (opt-in).
2. Validate locally under a synthetic 60-concurrent burst against 3 accounts;
   confirm even fill and zero premature 429s.
3. Flip `routing_strategy` to the new value via the dashboard for Ford's instance.
4. Watch `account_stream_cap` rejection rate (should approach zero until true
   saturation) and per-account in-flight distribution.

## 11. Open questions

- Deterministic `argmax` vs weighted-random top-K — which gives better real-world
  spread without ties causing oscillation?
- Should `available_headroom` be count-based (v1) or token-weighted (v2 default)?
- Name: `availability_weighted` vs `least_loaded` vs `inflight_aware`.
- Is a separate selection lock warranted, or extend the existing lease lock's
  critical section? (Deadlock-ordering analysis needed.)

---

## Appendix: code reference map

| Concern | Location |
|---|---|
| Strategy enum / literal | `app/core/balancer/logic.py:56` |
| `AccountState` + in-flight fields | `app/core/balancer/logic.py:108,130-132` |
| `capacity_weighted` impl | `app/core/balancer/logic.py:954` |
| `relative_availability` impl (reset math) | `app/core/balancer/logic.py:827` |
| Lease acquire/release (under lock) | `app/modules/proxy/load_balancer.py:228-231,253-256` |
| Per-account cap gate | `app/modules/proxy/load_balancer.py:1682-1686` |
| Sticky selection | `app/modules/proxy/load_balancer.py:1177` |
| Strategy resolution from settings | `app/modules/proxy/service.py:16937` |
| Strategy validation pattern | `app/modules/settings/schemas.py:22,60` |
| Per-account cap settings | `app/core/config/settings.py:292-293,295` |
