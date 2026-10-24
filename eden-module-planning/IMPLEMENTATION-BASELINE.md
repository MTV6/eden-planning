# Implementation baseline — 24 October 2026

This file supersedes conflicting v1.3 master-plan wording for implementation. Source: Claude's review and Mike-decision comments on [PR #4](https://github.com/MTV6/eden-planning/pull/4), read before starting, plus Mike's direct instruction: “check the changes from Claude and let's start work.”

## Confirmed changes

- One standard policy. No Light/Normal/Strict modes or mode editor.
- Deduction-only output: player, exact shares removed, rule, reason and evidence. Eden owns base cuts, gold, redistribution, settlement and refunds. No payout engine is being built.
- Include kill and wipe pulls. Qualifying kill-pull deductions are permitted before wipe activation, even in zero-wipe runs.
- Sum small incidents at 0.5 exactly; large incidents use their approved rule amount (currently 1 for a wipe-causing mistake). Do not invent higher amounts.
- Eden accepts whole shares. For each fractional player total the RL explicitly chooses floor or ceiling; no default rounding. Two half incidents combine before rounding. Preserve exact and chosen totals and the decision's actor/time. A rounding-reason field is optional: requiring it is Claude's proposal, not an approved rule.
- Admin-adjustable versioned thresholds and rules. Runs pin their policy snapshot.
- Keep padding/boss-damage/cooldown-priority analysis in the overall scope. There is no approved standalone padding tariff.
- Grimoire remains unchanged. Reuse or inspiration must stay on the Eden side.
- Claude reports Sunking is Eden's current developer/owner; Aren is the previous owner still credited on the website. See [PR #6](https://github.com/MTV6/eden-planning/pull/6).

## First local milestone

Build a runnable deduction review ledger with a synthetic run and validated JSON import, an evidence timeline, manual entries, imported proposals with accept/reject, explicit whole-share rounding, confirmation/export, versioned admin rules and durable SQLite audit history. No live site connection, Discord messages, application receipts or payouts. Existing unvalidated scanner modules remain disconnected from the new application.

Local implementation interfaces are provisional adapters, not Eden's discovered API or database schema. Deliver portable synthetic cases and documented input/output contracts alongside the prototype. Live WCL capture, reviewed mechanic packs and damage-priority detectors are subsequent milestones; synthetic proposals must be labelled as examples, not live automated conclusions.

## Unresolved decisions

- O01: retrospective scope when one boss reaches three wipes. Local review recognizes the current boss's threshold only; it does not auto-open other bosses. Kill-pull permission remains independent.
- O05: before-trigger/frequency definitions for fixed conduct/preparation/attendance/voice offenses. Require a manual applicability explanation in the prototype; do not automatically suggest them.
- O06/O08: replacement stacking and caps. Replacement entitlement is out of this deduction-only milestone; exports do not subtract from base cuts or cap/round per incident. Eden developers must validate entry against their existing cut constraints.
- O16: RL self-review authority. Flag RL-targeted deductions as needing staff confirmation before final export.
- O23: padding offense and tariff. Show observations only until defined and validated.
- Claude's booster-facing appeal flow, permanent encounter-pack owner, voice-recording consent/retention process and extra rounding-reason requirement remain review proposals. Do not treat these as agreed community policy.
- D01/D05/D09 and relevant field/type mapping still need Eden developer answers before actual integration. D04 whole-share precision is answered. O09/O10/O19 and D07 are handled by Eden's existing system, outside this module.

## Boundaries

No new assumption about an encounter, class, recorder coverage or callback may silently establish guilt. Accepted manual decisions are reviewer attestations, not automated verification. The local actor name is a demonstration label, not authenticated identity. No production permissions or appeal system are claimed. No Grimoire changes, real run closure, deduction application or external communications are part of this local milestone.
