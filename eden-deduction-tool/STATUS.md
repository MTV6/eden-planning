# Eden deduction module — current status

Updated 25 October 2026 by Codex. **v0.5.0 local prototype; no Eden deployment or live deduction application.**

Start with the [developer handover](../DEVELOPER-HANDOVER.md) and [progress/build order](../PROGRESS-AND-BUILD-ORDER.md). Those consolidate the current scope and next steps; older milestone notes record their original delivery stage.

## Working locally

- Evidence-linked manual review, imported synthetic proposals, exact half-share totals, explicit RL floor/ceiling rounding and deduction-only confirmation/export.
- One versioned policy, supported admin thresholds, pinned run policies, optimistic revisions and durable SQLite audit.
- Server-side WCL OAuth, selected kill/wipe capture, pagination/integrity validation, provenance and capture job lifecycle.
- Mixed/split-report grouping, duplicate guards and bounded cached discovery of other uploaders' reports.
- Booster/helper/RL/buyer/LB/unknown classification, roster-list matching and evidence-backed alt ownership. Unknown people stay excluded; non-roster status never establishes a buyer.
- Death cards with timed WCL links, lethal damage, recent healing, observed defensive use and debuff stacks.
- Initial Heroic Ula’tek evidence pack: individual Doomscale cast failures and Roll during Mother’s Wrath. Conditional rule amounts require review; no automatic blame.
- Compressed fact snapshots with version/settings and retained history. Reanalysis uses saved pages without new WCL queries.

## Verification

**59 tests pass**, rerun 25 October 2026. Browser workflow checks passed on 24 October. See [latest milestone](MILESTONE-4-DEATH-REVIEW.md).

The latest historical case captured 18 unique pulls: ten kills/eight logged wipes, 329 pages and 3,216,440 events, with three overlapping recordings excluded. Review generated 106 eligible death cards and three pack observations, not 106 offenses. Twenty-three LB and 132 unknown death events were excluded; 24 character identities remain unresolved. No real deduction was accepted or applied. Buyer exclusion is fixture-tested; real unknowns were not guessed into buyer roles.

The derived fact projection was about 203 KiB compressed per snapshot. The database also stores a latest copy, earlier snapshots and raw capture. An earlier broad capture retained about 65 MB of compressed raw pages. Whole-run kilobyte storage, targeted acquisition, cleanup/retention and isolated WCL cost accounting are not delivered.

## Immediate order

1. Developer reviews the package and maps actual Eden identity/draft/application contracts.
2. Resolve identities and run scope from authoritative Eden context.
3. Expert-validates the initial pack and positive/negative examples.
4. Productionizes jobs, resources, credentials, retention and access.
5. Runs an authenticated read-only pilot.
6. Adds independent staff authority, idempotent real application and staging receipts.
7. Expands packs and contextual damage-priority analysis as justified.

Detailed tasks, owners, dependencies and gates are in the [roadmap](../PROGRESS-AND-BUILD-ORDER.md).

## Limits and open decisions

No production auth, Eden adapter, actual application receipt, deployed admin service or dedicated appeal/recording interface. Typed reviewer labels are demonstration metadata. RL-targeted final export is blocked. WCL private-report user OAuth is unsupported. Context/phase/assignment/defensive availability and broad causal/padding attribution remain incomplete.

Open policy includes retrospective cross-boss activation, reset/recoverability definitions, requirement frequency, helper applicability, independent RL approval, pack ownership and evidence retention. Latest rules are one policy/no modes, pretrigger kill-pull permission, exact incident totals and explicit RL whole-share rounding. Eden owns all base cuts, replacement entitlement, gold, redistribution and refunds.

## Source and historical evidence

Active server: review-server.js; active source: src/ledger/, src/wcl/, public/. Historical scanner servers/CLI/packs remain disconnected and unvalidated. Node 24+; no third-party dependencies.

[README](README.md) · [Milestone 1](MILESTONE-1.md) · [WCL milestone](MILESTONE-2-WCL.md) · [First capture validation](LIVE-VALIDATION.md) · [Missing-log milestone](MILESTONE-3-MISSING-LOGS.md) · [Latest milestone](MILESTONE-4-DEATH-REVIEW.md).

Only code, synthetic fixtures and redacted documentation are published. Secrets, real evidence, databases and output stay local. Grimoire is unchanged. PR #8 remains review work stacked on the plan in PR #4; Claude's HANDOFF correction in PR #6 is separate. No merge/deployment performed.
