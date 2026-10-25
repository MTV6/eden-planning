# Eden deduction module — developer handover

**Start here. Updated 25 October 2026 by Codex for Mike, Sunking/Eden's developers and Claude.**

There is a working **local prototype, version 0.5.0**, with source, synthetic fixtures and 59 passing tests. The next job is to review the identity/evidence workflow and agree Eden integration contracts, then pilot a narrow implementation. It is not a production plugin or a finished automatic blame engine.

Current implementation and this handover are on branch **`codex/deduction-tool-wcl-review`**, in [PR #8](https://github.com/MTV6/eden-planning/pull/8). The implementation baseline is commit `e4eca73c421a503d48f82671466c7064878fe8c5`; later handover commits may contain documentation only. PR #8 is stacked on the plan in [PR #4](https://github.com/MTV6/eden-planning/pull/4). Neither is represented here as merged or deployed.

## Read in this order

1. This handover: product scope, rules, website fit and technical boundaries.
2. [Progress and build order](PROGRESS-AND-BUILD-ORDER.md): completed work, prioritized tasks, dependencies and completion gates.
3. [Prototype README](eden-deduction-tool/README.md): startup, workflow, storage and API limitations.
4. [Latest milestone and validation](eden-deduction-tool/MILESTONE-4-DEATH-REVIEW.md): death cards, Ula’tek pack and tested boundaries.
5. [Master plan v1.4](packets/deduction-suggestion-module.md) and [implementation baseline](eden-module-planning/IMPLEMENTATION-BASELINE.md): detailed policy, website observations and open-question IDs.

**Document precedence:** Mike's latest explicit decisions → dated entries in [decisions.md](decisions.md) and the implementation baseline → this current handover/progress record → master plan → older milestone/history documents. An implemented behavior is not itself approval of an unresolved community rule. Root `HANDOFF.md` still contains earlier planning-only/three-mode text; those portions are superseded. Its developer-name correction is tracked separately in [Claude's PR #6](https://github.com/MTV6/eden-planning/pull/6); this handover does not overwrite that work.

## Problem

Raid leaders close boosts using rosters, logs, helper/replacement arrangements and deduction rules. A log upload may mix multiple activities, omit earlier pulls or overlap another uploader's report. A logged character may be a booster, buyer, lootbody, helper or an unrecorded alt. Counting every death or assuming the first death caused a wipe produces unreliable accusations.

The module should reduce review work: select the right pulls, identify eligible people, assemble relevant evidence, suggest an existing rule and its share amount, and let an authorized person confirm responsibility. Existing Eden systems continue to own roster changes, received cuts, gold, redistribution, completion and payouts.

## Proposal and scope

Use a lightweight hybrid: generic death context plus small encounter resources for important mechanics. Start with the initial Heroic Ula’tek pack; expand only after reviewed examples show a need. Do not require perfect cooldown simulation, an exhaustive ability database or universal wipe-cause reconstruction before a pilot can help users.

The local prototype already provides explicit classification, WCL capture/search, death evidence, a small pack, a manual decision ledger and versioned rules. Its cards are conditional review leads. Death cards do not prove avoidability; completed casts do not identify the assigned interrupter; missing defensive observations do not prove a ready cooldown was unused.

### Current rules and pricing authority

| Rule / behavior | Current decision |
| --- | --- |
| Standard policy | One rule set. Light/Normal/Strict modes were removed. No multipliers. |
| Small avoidable death without major wipe impact | 0.5 share when responsibility is established. |
| Mistake directly causing a wipe | 1 share when causation/recoverability are established. |
| Soak, interrupt, taunt, dispel, target, positioning or utility failure | Apply the existing impact rule; no new universal fee for each event. |
| Unused defensive/potion/Healthstone contributing to the same incident | Supporting evidence, not an additional charge for the same mistake. |
| Voice, preparation, attendance or conduct requirement offense | 1 share each; applicability/frequency still need definition for automation. |
| DC causing a missed recoverable mechanic and preventable wipe | 1 share; inactivity alone does not establish a DC or fault. |
| Ordinary wipe-pull activation | Initially 3 wipes on one boss OR 6 across the run; adjustable and pinned to a policy version. |
| Kill-pull mistakes | Eligible independently, including before wipe activation and in zero-wipe runs. |
| Pretrigger wipe exceptions | Damage shortfall causing a 1% wipe; insufficient healing causing multiple avoidable deaths. Evidence and review required. |
| Performance reference | Bot requirements; below-50 average damage parse with lacking raid DPS is replacement context, not an invented flat fine. Averaging details remain open. |
| Staff escalation | More than 5 wipes on a boss or a run taking too long; separate from deduction activation. |
| Totals and export | Sum exact half shares first. For a fractional total the RL explicitly chooses floor or ceiling for Eden's whole-share fields; no default. Preserve both amounts and actor/time. |
| Duplicate incident | Do not charge the same causal event as both a death and a wipe. Accepted changes invalidate affected rounding. |

Share prices come from the pinned policy, not from encounter packs or generated prose. Kill-pull permission is settled; cross-boss retrospective activation and reset/abort counting remain open. Known post-wipe-call failures cannot establish a new performance deduction. A missing wipe-call marker does not prove the raid was still recoverable.

### Participant policy

- **Booster / helper / RL:** review eligible, with the applicable rule and role context. RL-targeted final export is currently blocked until an independent staff workflow exists.
- **Buyer / lootbody:** excluded from deduction candidates. Their events may explain a wipe and remain in captured context.
- **Unknown:** excluded until the RL classifies them. Never infer buyer status just because someone is absent from the roster.
- **Alt:** record possible matches as notes. Link ownership only on confirmation, using Eden account identity where available. A confirmed link routes responsibility to the primary participant while retaining physical-character evidence.

Rostered boosters should come from selected roster characters, not only signup summaries. Helpers/replacements may come from partial distribution entries. LBs may be absent from both. Buyer count varies by run and must not be hard-coded. Buyer names and authoritative alt links are still missing in the historical test case; unconfirmed identities stay private and unresolved.

## User flow per role

### Raid leader

1. **Logs & duration:** provide report(s), approximate session window and recording reference. Load metadata first, review run grouping, search other uploaders if incomplete, and select each pull once. Allow a final encounter to finish beyond the scheduled window when evidence establishes continuity.
2. **Distribution, below the existing attendance check:** reconcile roster, helper, buyer/LB and alt identities. Review unknowns, relevant deaths and mechanic cards, including kill pulls. Keep attendance/pay adjustments distinct from incident deductions.
3. Choose the player, existing rule, reason and evidence. Prepare/accept/edit/reject as appropriate; preserve the decision history. Inspect assignment, control opportunity and defensive/healing context where relevant.
4. Review per-player totals and explicitly round fractional totals for Eden's whole-share fields.
5. Transfer only the authorized confirmed proposal into Eden's draft using a future validated adapter. Preserve manual adjustments and concurrent edits. Review warnings/restrictions and final outgoing messages through Eden's existing controls.
6. Eden's own completion/application transaction makes the real change and returns a receipt. A local confirmation or downloaded JSON is not application.

### Staff / administrator

Publish versioned rule/threshold changes with a reason; existing runs retain their policy. Review evidence, corrections and conflicts using authenticated Eden authority. Define who independently handles RL deductions. New written rules create manual rules unless a validated detector exists.

The initial context/movement windows are editable and saved with each generated analysis snapshot. They are prototype reviewer controls, not a production-protected admin service. Policy effective-time behavior for open runs and production permissions need developer/staff agreement.

### Appeals and existing financial behavior

The existing policy is staff-first appeal review, then the RL answers, then staff decides. RL must provide logs and a recording with Discord voice; at least-until-payout retention is the existing expectation. If staff orders a refund after attendance is paid, the RL pays the affected people personally within 24 hours. Dedicated appeal/recording interfaces are not delivered here.

Eden owns replacement entitlement and helper payments. A net cut reduction must not be treated as an equal number of proven mechanic offenses. Redistribution remains Eden's calculation: 70% to eligible non-deducted boosters / 30% to an undeducted RL; a deducted RL gets no extra and the proceeds go to eligible non-deducted boosters. Deducted players receive no deduction proceeds. This module does not calculate that gold.

## Implementation notes

### Run locally

Access to the private repository is required. Use Node.js 24 or later; the prototype has no third-party npm dependencies.

```sh
git clone --branch codex/deduction-tool-wcl-review --single-branch https://github.com/MTV6/eden-planning.git
cd eden-planning/eden-deduction-tool
npm test
npm start
```

Open `http://127.0.0.1:4317/`. **Load sample run** works without credentials. For fresh WCL imports, configure authorized API credentials locally using the README. No real logs, secrets or local database are bundled. A developer should not need Mike's computer or Grimoire to run synthetic tests.

### Code map

| Path | Purpose |
| --- | --- |
| `eden-deduction-tool/review-server.js` | Active localhost HTTP server and current API wiring. |
| `src/ledger/policy.js`, `run.js`, `store.js` | Rule validation, input validation, exact totals, optimistic revisions, review decisions, audit and JSON export. |
| `src/ledger/participants.js` | Roles, roster matching, confirmed ownership and responsibility resolution. |
| `src/wcl/client.js`, `scope.js`, `service.js` | OAuth/API queries, metadata/session selection, duplicate guards, capture jobs, provenance and raw pages. |
| `src/wcl/missing.js` | Bounded, cached search of roster characters' report histories; explicit candidate loading. |
| `src/wcl/review.js`, `src/wcl/packs/ulatek.js` | Derived death context, snapshot persistence and limited Heroic pack. |
| `public/` | Local review, classification, WCL, rule and audit UI; reference implementation for adaptation. |
| `examples/sample-run.json`, `test/` | Portable synthetic workflow and regression fixtures. |

Paths in the table after the server are relative to `eden-deduction-tool/`. `npm start` runs `review-server.js`. Earlier `server.js`, `legacy-server.js`, `cli.js`, top-level scanner modules and old packs are disconnected historical scaffolding; do not wire them back in. Do not deploy the entire prototype unchanged.

### Contracts the Eden developer must supply

These names are requirements for discussion, not claims about Eden's actual schema:

| Input / output | Required information |
| --- | --- |
| Run context | Stable Eden run ID and revision; schedule/timezone; encounter scope; difficulty; lead; read permissions. |
| Identity context | Stable account/player IDs, selected characters, timestamped roster changes, confirmed ownership, buyers/LBs and structured helpers/replacements. |
| Expectations | Bot requirements, assignments if available, recording/evidence references and current rule/pack version. |
| Draft application | Actual fields for **removed** whole shares, evidence/reason, manual changes, permitted maximum and concurrency/locking behavior. Do not confuse removed shares with the existing received-shares column. |
| Actual application | Authorized server transaction, stable idempotency key, success/failure receipt, applied revision, actor/time and safe retry. |
| Existing workflow | Restriction/message preview behavior, completion boundary, post-payout correction path and application/message retry separation. |

Current export is `kind: eden-deduction-proposal`, `schemaVersion: 1`, with `runId`, review revision, policy version, confirmation metadata and per-player `exactSharesRemoved`, `wholeSharesRemoved`, rounding, reasons and incidents/evidence. `appliedToEden` is always **false**. Current local IDs are not Eden account IDs. The adapter must map them explicitly before production application.

Current local routes include `/api/runs`, `/api/policy`, `/api/audit`, `/api/wcl/discover`, `/api/wcl/find-missing`, `/api/wcl/load-candidate`, `/api/wcl/capture`, `/api/wcl/jobs/:id` and `/api/wcl/review/:runId`. These are a prototype interface, not Eden's discovered API.

### Evidence, WCL usage and storage

Metadata selection precedes events. Search matches region, time, difficulty, roster overlap and known pulls; labels partial/hidden/unavailable histories and never claims exhaustive discovery. Select one recording per overlapping pull; current overlap warnings allow 15 seconds of clock skew with encounter/outcome/roster checks. Automatic silent report union is not implemented.

Captured API pages are retained compressed with hashes, cursors and manifest counts. Review generation reuses them without WCL calls. Derived review snapshots are losslessly compressed and retained with settings/pack version and audit references. Hash chains help detect inconsistency but do not make storage tamper-proof.

The historical fact projection was about 203 KiB per snapshot; the database also holds a latest copy, older snapshots and raw events. An earlier full capture retained about 65 MB of compressed raw payloads. **The whole run is not reduced to kilobytes.** Targeted acquisition, event-reuse, cleanup/retention and isolated point-cost instrumentation are still work items. Do not quote logical query counts as WCL points or assume a fixed cost per run. The shared credential's consumers share API quota even though their files/tokens remain separate.

The prototype supports server-side client credentials for accessible public/unlisted reports; user OAuth for private reports and restricted archive access are not implemented. Credentials are stored locally as plaintext in ignored storage, not a production vault. Local reviewer labels are not authentication. Analysis generation/search still include synchronous work; production job queues, cancellation, quotas and storage migration need implementation.

## Acceptance criteria and progress

The source passes **59 tests**, rerun 25 October 2026. Browser checks on 24 October covered classification staging, filters, regeneration, evidence preparation and no console errors. The historical validation used 18 unique pulls, ten kills/eight logged wipes, 329 pages and 3,216,440 events. It produced 106 eligible death cards and three Ula’tek observations. That is not 106 mistakes or three approved deductions. No real deduction was accepted/applied.

The two Doomscale observations preserve separate add identity and control history; the tank observation recognizes Roll between Mother’s Wrath hits. Exact cooldown readiness, positional crossing/phase interpretation and causal responsibility remain incomplete. Known wipe calls are handled; automatic recoverability boundaries and deliberate-reset classification are not.

Production acceptance requires the gates in [the ordered roadmap](PROGRESS-AND-BUILD-ORDER.md), including identity correctness, reviewed positive/negative cases, authenticated permissions, concurrency/idempotency, truthful receipts, resource limits and staging validation. No universal accuracy percentage, production readiness percentage or delivery date is claimed.

## Open questions and immediate next action

**Developer first:** confirm the identity/run/draft/application contracts above, review the package architecture, and choose an adaptation boundary for Eden's runtime/database. Do not start by rewriting the WCL client or building a second payout engine.

**Mike/staff first:** decide reset counting; cross-boss retrospective activation; independent RL approval; exact offense applicability; pack maintainer; evidence access/retention; and pilot acceptance targets. Unknown buyer names or tentative alt guesses are not resolved by this document.

Padding/boss-priority/cooldown-holding analysis remains requested future scope with no standalone approved tariff. A comprehensive defensive simulator and automatic full-fight blame attribution are deferred. Expand a small reviewed pack before attempting those features.

Related attendance and raid-leader scheduling packets remain separate proposals; this prototype does not implement them. Grimoire remains unchanged and is not a runtime dependency. No production deployment, merge, payout or Discord delivery is part of this handover.
