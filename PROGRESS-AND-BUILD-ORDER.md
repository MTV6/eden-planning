# Eden deduction module — progress and build order

**25 October 2026 · Codex · v0.5.0 local prototype.** Read [the developer handover](DEVELOPER-HANDOVER.md) first. Status describes tested local capability, not production approval. Priorities below are a proposed delivery order for the developer; unresolved community rules are not silently decided.

## 27 October policy reconciliation — before the pilot

Read the [current rules](deductions-review/Eden-rules-current.md) and [developer clarification handoff](deductions-review/Eden-Rule-Clarifications-Developer-Handoff-2026-10-27.md). These decisions are documented but **not yet implemented** in v0.5.0.

- [ ] Replace floor/ceiling choice with final-total floor; preserve exact totals.
- [ ] Add RL reset/abort confirmation, exclude confirmed resets and enable whole-run retrospective review after either trigger.
- [ ] Apply revised requirement frequencies/leniency and half/full-cut caps; keep separate offenses distinct.
- [ ] Use Eden's authoritative attendance history for rolling no-show sanctions; monthly replaces weekly.
- [ ] Anchor appeals and recording retention to deduction-channel publication; preserve dispute evidence.
- [ ] Defer numeric parse formulas and non-Heroic-VIP formats; compare helper redistribution proposal with Eden's existing calculation.
- [ ] Validate these changes with focused tests before describing the prototype as compliant.

The progress table below describes the earlier implementation. Test baseline remains 25 October.

## Current progress

| Area | State | Evidence / remaining gap |
| --- | --- | --- |
| Local review ledger | Working locally | Exact half-share totals, explicit whole-share rounding, optimistic revisions, policy snapshots, confirmation/export and audit. |
| Rule administration | Working locally / production incomplete | Versioned rules and supported thresholds. No real admin authentication; prose alone creates no detector. |
| WCL capture | Working locally | Metadata, selected kills/wipes, pagination validation, jobs/progress/cancel/restart and raw provenance. Broad raw capture remains relatively large. |
| Mixed/split report scope | Working locally / manual confirmation | Session suggestions and duplicate guards; no claim all overlaps or boundaries resolve automatically. |
| Find missing logs | Working locally / bounded coverage | Character histories, cache and candidate evidence; inaccessible/private histories and page limits remain explicit. |
| Player classification | Working locally / manual inputs | Booster/helper/RL/buyer/LB/unknown, roster list matching and evidence-backed alt links. Eden account/history adapter missing. |
| Death review | Working locally / evidence only | Lethal context, healing, observed defensives/debuff stacks and WCL time windows. No perfect cooldown/readiness/avoidability inference. |
| Heroic Ula’tek pack | Initial pilot | Doomscale cast-instance failures and Roll/Mother’s Wrath observations; strategy, assignments, cooldowns, phase/crossing and expert validation remain. |
| Audit and history | Working locally / production incomplete | Incidents, suggestions/decisions, rules, rounding, classifications and compressed analysis snapshots. Real application receipts absent. |
| Storage/API optimization | Partial | Metadata cache and compressed raw/derived evidence; review uses zero new WCL calls. Targeted event acquisition, reuse, cleanup and per-job point accounting remain. |
| Contextual damage/padding analysis | Planned | No automated boss-priority/holding detector and no standalone padding tariff. |
| Staff/appeals/recordings | Existing policy; software pending | Independent RL approval, authenticated evidence access and dedicated appeal/recording workflows missing. |
| Eden Distribution integration | Not built | Field mapping, account permissions, transaction boundary and adapter require developer input. |
| Production application/deployment | Not built | No live Eden deductions, run closure, messages or payments. |

Baseline: 59 tests pass, verified 25 October. Two authorized real-case exercises established capture and a limited review workflow, not general accuracy. Latest full case: 18 unique pulls / ten kills / eight logged wipes, with three overlapping recordings excluded. Unknown people remain unknown until an RL resolves them; no private names/reports are required to run the synthetic fixtures.

## Ordered implementation checklist

### 1. Developer review and contract map — immediate

Owner: Eden developer, with Mike/staff for policy answers.

- [ ] Run `npm test` and the synthetic workflow from a clean private-repo checkout.
- [ ] Review active code and disconnected scaffolding; choose which services/UI to adapt into Eden.
- [ ] Document actual run/account/character/customer/helper/roster-history contracts and permissions.
- [ ] Map the existing received-share fields to a separate removed-share proposal; agree maximum/cut validation and draft locking.
- [ ] Identify the actual completion/application transaction and message retry boundary.
- [ ] Confirm which unanswered policy questions block the first pilot; leave uncertain offenses manual.

**Done when:** there is an agreed adapter contract with example synthetic payloads, field semantics, ownership and failure behavior. No live write is needed for this step.

### 2. Reliable participant and run context — first product priority

Depends on step 1's read contracts.

- [ ] Populate identities from Eden-selected roster characters and account IDs, not just signup summaries.
- [ ] Include timestamped replacements, partial-cut helpers and confirmed alt changes; retain per-pull participation.
- [ ] Obtain buyer/LB classification where Eden knows it; do not hard-code buyer counts or infer them from non-roster status.
- [ ] Keep an explicit RL resolution step for unknowns and uncertain alts. Record source, decision, actor and time.
- [ ] Revalidate selected session boundaries and duplicate recordings after new report discovery, including pulls ending after the scheduled window.

**Done when:** eligible identities are correct on reviewed cases, uncertain people stay excluded, and multiple recordings never inflate a pull/wipe count.

### 3. Validate the first encounter pack and reviewer workflow

Depends on correct identity and scope; can proceed alongside read-only adapter work.

- [ ] Have an encounter reviewer validate the Heroic Ula’tek spell IDs, supported version and strategy assumptions.
- [ ] Add explicit interrupt assignments/ability-opportunity context where available. A later successful interrupt must not clear an earlier assigned miss.
- [ ] Test both add instances, duplicate interrupt attempts, pets, immunity/out-of-range/unknown cooldown cases and no-fault alternatives.
- [ ] Verify tank-movement evidence in replay; add phase/crossing recognition only with a testable definition and negative cases.
- [ ] Review kill-pull deaths as well as wipes, accounting for deliberate resets, earlier collapse and known wipe calls.
- [ ] Require a clear responsibility/reason decision; do not present every death as a payable offense.
- [ ] Name a pack maintainer and define review/update/disable behavior for game changes.

**Done when:** reviewed positive and negative examples support each enabled detector, unsupported cases are explicit, and staff agrees the narrow pack is suitable for a read-only pilot.

### 4. Make capture/review economical and operationally durable

Depends on knowing which evidence the enabled rules require. Do this before production load.

- [ ] Measure WCL point use per job/request where supported, rather than treating query counts as points; account for shared clients.
- [ ] Plan a metadata-first, targeted evidence path with explicit coverage and broader fallback when required for accuracy.
- [ ] Retain compact incident/death context and provenance; decide which raw pages are temporary versus needed for appeals.
- [ ] Reuse safely captured evidence on retry/reanalysis, with revision/coverage validation.
- [ ] Add expiry/cleanup for caches and analysis/raw retention, with an agreed appeal/evidence policy.
- [ ] Move synchronous discovery/analysis into suitable jobs; implement budgets, progress, cancellation and safe restart.
- [ ] Put credentials in Eden's server-side secret management; never expose the local plaintext store publicly.

**Done when:** measured storage, latency and point cost meet an agreed target without hiding missing coverage. No kilobyte-per-entire-run promise is made before measurements.

### 5. Add an authenticated, read-only Eden pilot

Depends on steps 1–4's applicable gates. Review and contract work may overlap; unsafe write paths remain disabled.

- [ ] Mount/adapt the review experience under Distribution's attendance check.
- [ ] Use Eden permissions for assigned RLs, staff and policy publishers; remove reliance on typed local actor labels.
- [ ] Preserve manual distribution edits, run/policy revisions and separation from restrictions/messages.
- [ ] Pilot on representative kill-only, wipe-heavy, mixed, split, replacement and ambiguous-identity runs.
- [ ] Record wrong attributions, missed incidents, coverage problems, review time and resource cost against agreed acceptance criteria.
- [ ] Compare historical RL deductions as review examples, not as unquestionable training labels.

**Done when:** staff/developer sign off on the measured narrow workflow. The pilot still proposes and records decisions without applying live deductions.

### 6. Implement confirmed application and independent staff authority

Depends on pilot acceptance, field mapping and staff approval decisions.

- [ ] Define and enforce independent approval for RL-targeted/conflicted decisions.
- [ ] Preserve exact incidents, final-total floor, evidence, policy/pack versions and authenticated actor/time.
- [ ] Transfer confirmed deductions to the authorized Eden draft using revision checks and a stable idempotency key.
- [ ] Apply through Eden's server transaction; return an actual success/failure receipt. Retry must not double deduct or overwrite newer manual edits.
- [ ] Keep completion, warning/restriction choices, messaging, attendance and gold within Eden's existing ownership.
- [ ] Test concurrent edits, stale reviews, retries, failures, corrections, payout-completed cases and message/application partial failures in staging.

**Done when:** staging proves safe application and truthful receipts, with a production rollout and correction plan approved by Eden. A local JSON export alone does not meet this gate.

### 7. Expand only after the first pilot is useful

- [ ] Add the next encounter/difficulty pack based on actual recurring review needs and expert fixtures.
- [ ] Add contextual boss/priority-add damage and cooldown-use observations. Validate assignments, immunity, cleave, phase and opportunity before blame.
- [ ] Add a financial padding rule only if Mike/staff defines an applicable approved tariff/impact rule.
- [ ] Consider deeper defensive availability and dedicated booster evidence/appeal views if their review benefit justifies the work.

**Done when:** each new feature has a defined rule, evidence contract, negative tests, maintainer and measurable benefit. Do not delay the narrow pilot for universal combat analysis.

## Decisions still needed

| Topic | Who answers | Interim handling |
| --- | --- | --- |
| Retrospective activation | Settled 27 October; developer implements | Either trigger opens earlier wipe pulls across the entire run; kill permission independent. |
| Reset/abort and unrecoverable cutoff | RL + encounter reviewer | RL confirms resets/aborts; exclude them from count. Recoverability remains evidence-based review. |
| Exact requirement offense definitions/frequency and early-wipe exceptions | Mike/staff | Manual explanation; no new automatic fines. |
| Helper applicability and replacement/cut constraints | Staff + developer | Review helpers where applicable; Eden owns entitlement and caps. |
| RL independent reviewer / conflicts / overrides | Staff + developer | RL-targeted final export blocked in prototype. |
| Authoritative buyers, helper accounts and alt ownership | Developer + RL | Unknown until explicitly confirmed; no guessing. |
| Pack ownership and supported patch/strategy versions | Staff + developer | Initial narrow pilot only. |
| Evidence access and implementation | Staff + developer | Appeal and recording retention: 48 hours from deduction post; preserve active dispute evidence longer. Access controls remain to implement. |
| Pilot error/latency/cost targets and manual fallback | Mike/staff + developer | Agree before enabling real application. |
| Production runtime/database/jobs/secret store and apply contracts | Developer | Local interfaces remain provisional. |

Related open IDs and fuller context remain in [master plan section 6](packets/deduction-suggestion-module.md#6-open-questions). Removed modes and a new payout engine are not backlog items. Grimoire changes are not part of any step.
