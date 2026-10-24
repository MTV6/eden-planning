# Eden deduction suggestion module — master plan

**Version 1.4 · 24 October 2026 · Codex, for Mike and Claude**

**Status: local implementation authorized by Mike; integration and production application are not authorized.** This version supersedes conflicting v1.3 wording. Claude reviewed the plan in PR #4 without changing its files; the subsequent comments record Mike's revised scope. Mike then instructed Codex to check the changes and start work.

## One-page review summary

Build a deduction-only module for Eden's run-closing workflow. It analyzes evidence from all relevant kill and wipe pulls, proposes mistakes against one standard versioned rule set, and lets the RL confirm the player, rule, reason, evidence and shares removed. The RL can deduct qualifying kill-pull mistakes before the wipe threshold, including zero-wipe runs.

**No Light/Normal/Strict modes.** All thresholds remain admin-adjustable and versioned. Sum exact incident amounts first: small mistakes are 0.5 and big mistakes use their approved rule amount, currently 1 for a directly wipe-causing mistake. Eden accepts whole shares, so a fractional player total requires the RL to choose down or up; no automatic choice. Preserve the exact total and chosen number in audit. A separate padding tariff has not been agreed.

Eden already owns base cuts, gold, redistribution, settlement and refunds. The module outputs per-player deductions and their evidence; it does not build another financial system. It must never silently change roster, deductions or permissions. Grimoire may supply inspiration or suitable modules, but **nothing in Grimoire is modified**.

The first local milestone is an evidence-linked deduction ledger: validated JSON run import and synthetic cases, pull timeline, manual entries, imported proposal review, exact totals, explicit rounding, confirmation/export, versioned admin rules and durable audit. It is a local prototype with no website or Discord writes. Live WCL ingestion, smart mixed-report scope, account matching, validated encounter packs, automatic mechanic suggestions and contextual damage-priority analysis remain subsequent milestones within the overall plan.

Developer/API questions constrain real integration, not this authorized local experiment. Inputs/outputs are provisional adapter contracts, delivered with portable synthetic cases. Claude's additional suggestions about booster views, permanent pack ownership and voice-recording governance remain open design proposals unless explicitly settled below.

### Decision precedence

Mike's latest decisions, including those attributed to him in Claude's PR #4 comments and reviewed at his request, supersede v1.3 and older local rulebook wording. Confirmed policy, observed UI behavior, design proposals and unresolved questions are distinct. No numerical tolerance or new share tariff is silently invented.

## 1. Problem

Run closure requires reconciling the planned roster, changes during the run, actual per-pull participants, log events, calls, assignments, replacements and deduction rules. Mixed or split Warcraft Logs uploads complicate the run boundary. A final roster can omit an earlier participant or display a different character from the one they played.

The desired tool saves RL review time while preserving an explanation of each decision. Combat logs do not establish every assignment, motive, voice call, available recovery or causal chain. The product must distinguish observations, candidate mistakes and deduction suggestions, and show unavailable evidence explicitly.

## 2. Proposal

### 2.1 Scope and exclusions

**Included:** all-pull evidence, smart run selection, account/character resolution, contextual incident review, approved rule amounts, admin-configurable thresholds/rules, exact totals, RL rounding, generated reasons, full suggestion/decision history and a future adapter into Distribution.

**Handled by Eden:** base entitlement, helper/replacement payment, received-cut calculation, gold pricing, 70/30 or 100% redistribution, payout/settlement and refund accounting. O09/O10/O19 and D07 from v1.3 are closed as outside module scope, not newly defined here.

**Excluded from first local milestone:** live WCL scans, automatic fault attribution, real run closure, Discord delivery, production authentication, account ownership changes, recording uploads, booster appeal submission and independent staff approval. Sample/imported proposals must be clearly labelled; a sample is not a detector.

The local public API and active application must use the new ledger. The earlier scanner scaffold is preserved separately and disconnected because it contains superseded assumptions.

### 2.2 Confirmed policy

| Rule | Amount / behavior |
| --- | --- |
| Small avoidable death without major wipe impact | 0.5 share |
| Mistake directly causing a wipe | 1 share |
| Assigned soak/taunt/interrupt/dispel/target/position/utility failure | Existing impact scale when its conditions hold; no new flat tariff for every failure |
| Unused defensive, potion or Healthstone contributing to that incident | Supporting evidence; same impact scale, no duplicate charge |
| Voice, preparation, attendance, conduct requirement violation | 1 share each, with applicability/frequency still to define |
| DC causes a missed recoverable mechanic and preventable wipe | 1 share; DC or inactivity alone is insufficient |
| Ordinary performance activation | Initial 3 wipes on one boss OR 6 across the run; admin-adjustable |
| Kill-pull permission | RL may deduct qualifying mistakes before activation, including zero-wipe runs |
| Pretrigger wipe exceptions | Damage shortfall causing a 1% wipe; insufficient healing causing multiple avoidable deaths; causation still needs review |
| Parse standard | Bot minimums apply; lacking raid DPS plus average damage parse below 50 calls for replacement, not a new universal fine |
| Staff escalation | Boss exceeds 5 wipes, or run takes too long; separate from deduction activation |

Analyze earlier qualifying incidents and kill pulls, not merely the final wipe. Apply the rules equally to RL and boosters. Exclude errors after a wipe call or when the pull became unrecoverable; last-death time is not the cutoff. Wrong calls, unsuitable composition, missing assignments and another player's error can change responsibility.

No multipliers. Do not charge a death and its resulting wipe twice. A separate voice violation can coexist with a mechanic incident. Different labels for one causal incident do not create extra deductions. Additional big-mistake amounts need a defined approved rule; “1 or more” is not authority to invent values.

### 2.3 Exact totals and whole-share entry

The engine stores exact half-share incident amounts and sums per player before any rounding. Two 0.5 incidents make 1. An exact 3.5 remains visible as 3.5 internally.

Eden accepts whole shares only (Mike's clarification via Claude). **RL chooses 3 or 4 for a 3.5 total according to overall severity.** There is no automatic up/down default. Store original incidents, exact total, selected direction, whole-share output, actor and timestamp. A short explanation is available; making it mandatory remains Claude's proposal, not an approved rule.

If accepted incidents change, invalidate affected rounding and require a new decision where still fractional. Export removed shares only, not a calculated base or remaining cut. Eden's integration validates any maximum permitted deduction against its cut constraints; this module must not silently impose a cap, negative cut or replacement-stacking formula.

### 2.4 Replacement, recording, appeals and gold — background boundaries

RL decides outgoing replacement entitlement by severity, saved status and loot requirements, stating terms when requesting replacement. A saved incoming replacement can be offered 3 shares. If no replacement is brought and the run completes, half retained may apply; severe offense means full removal. These are context for review, not new replacement-pay calculations in this module. Eden's helper default of PARTIAL/1 share does not establish a replacement tariff.

Approved roster ratio is 14 boosters / 2 LBs; applicability to differing run formats and exception authority remain open. RL owns suitable healing, utility, assignments and calls. Current custom roster targets are not proof of an authorized policy exception.

RL must log the run and provide their own or another player's recording with Discord voice, covering relevant events. At least-until-payout retention is the existing rule. Access, consent process, longer retention and unavailable-recording handling require staff clarification; no legal conclusion is asserted by this plan. The first milestone uses evidence references/notes, not voice storage or transcription.

Appeal policy remains staff-first review, then RL answers, then staff decides. A staff-ordered refund after attendance is paid must be paid personally by the RL within 24 hours. Appeal visibility is a future interface proposal; refund accounting stays in Eden.

The background redistribution policy is 70% to eligible non-deducted boosters and 30% only to an undeducted RL; if RL is deducted, 100% goes to eligible non-deducted boosters. Deducted players receive no deduction proceeds. **Eden applies these rules; this module calculates none of that gold.**

### 2.5 Website findings and placement

Authenticated inspection on 24 October observed:

| Surface | Observed behavior | Proposed use |
| --- | --- | --- |
| Roster Builder `/admin/runs/{runId}` | Run title/difficulty/schedule/lead; role capacities, separate ranged/melee/saved/unsaved/LB targets; custom changes with reasons | Read-only run/config snapshot |
| Roster participants | Player account grouping, selected character/realm, alternate specs, customers and playing/AFK LBs | Match actual characters to people; classify eligibility; alternate specs are not assignments |
| Signups | Summary character can differ from selected roster character | Never match from signup summary alone |
| Lockouts | Saved-boss count or explicit unknown | Preserve timing; unknown is not unsaved; post-run state is not pre-run proof |
| History | Actor, time, change and reason; UI says 60 days | Planned/history/observed participation separately; retain deduction evidence independently |
| Editing | Auto Roster On/Draft/Off and Done editing | Developer must explain autosave and lock lifecycle |
| Step 1 Logs & duration | Report, hours/minutes, optional notes | Extend to confirmed multi-report/pull scope and recording reference |
| Step 2 Distribution | Boss-kill attendance check; player/type/received shares/announce/reason | Place Deduction review below attendance check, above existing table |
| Step 3 Warnings & restrictions | Optional consequences beyond gold; only empty state inspected | Separate explicit restriction decision; never auto-restrict from deduction |
| Step 4 Review & complete | Summary and message preview; final completion closes run and sends messages | Future real application boundary owned by Eden |
| Attendance | Management handles attendance/gold afterwards | Outside calculation scope |

The empty preview described named-player pings and individual DMs, without a channel ping. Populated previews, restriction controls, draft persistence, actual completion transaction and Attendance backend were not tested. No real run fields were changed or run completed. Cancel and close was blocked by automatic approval review; a separate tab preserved the completion form during roster inspection. Opening the roster displayed Done editing; any automatic lock side effect is unknown.

Two deployed CSS files were exported as local visual references. An inventory exposed 40 JS assets, but none was downloaded. No backend/source repository, schema, API implementation or credentials were recovered. Sunking is the current developer/owner according to Mike's clarification via Claude PR #6; Aren is the previous owner still credited in the footer.

### 2.6 Damage-priority / padding analysis

Detect possible add padding, good overall parses with poor boss contribution, cooldowns held for low-value add opportunities and off-priority targeting. This remains planned automation, not functionality provided by the first synthetic ledger.

- Packs classify boss/objective, required priority adds, low-priority adds and unknown targets by phase and strategy.
- Display total, boss, priority-add and other-add damage, absolute amounts and opportunity windows. A ratio alone is insufficient: useful additional add damage can reduce boss percentage without reducing boss output.
- Use role/spec/assignment/gear/bot expectations, phase, boss vulnerability and raid demand for appropriate comparisons. Show parse provenance; never call a calculated ratio a boss parse.
- Correlate cooldown casts/effect windows, add spawns and boss opportunities. Infer readiness only with supported resets, charges, reductions and history; an absent cast alone is not available cooldown proof. Include attributable pets and delayed effects.
- Distinguish intentional target choices from incidental cleave/passive damage. Required add duty, dangerous adds, shield objectives, immunity, movement, mechanics and RL calls can justify behavior.
- Output a contextual possible-issue finding, with alternatives and unavailable checks. No inference of motive or precise hypothetical damage loss without a validated model.
- All numerical detector thresholds, opportunity/sample minimums, repetition and hold tolerances are admin-adjustable and versioned under one standard policy.
- There is no standalone padding tariff (O23). Suggest a monetary deduction only where an approved rule and its impact/causation requirements apply. Do not duplicate one incident across padding, cooldown and low-boss labels.

## 3. User flow per role

### Raid leader

1. Read the permitted run context without editing roster. Load log references and propose relevant bosses/pulls. Confirm mixed/multi-report scope and account/character matches before targeted output.
2. Review both kills and wipes using **All findings / Suggested** and **All pulls / Kills / Wipes** views. These are filters, not severity modes. Show coverage, wipe counts/activation, rule version, source and stale decisions.
3. Inspect incident evidence: player/character, boss/pull/outcome/time, assignment, actual event, responsibility, impact, alternatives and missing data. Accept, edit or reject with a traceable decision; observations can have no tariff.
4. Add manual entries for offenses/calls/recording context the logs cannot prove. Use a stable incident group to prevent duplicate charges for one mistake. Unsupported padding remains an observation.
5. Sum each player's approved incidents exactly. If fractional, explicitly choose down/up. Changes reopen affected decisions; no silent rounding.
6. Confirm the per-player deduction list. The local milestone exports JSON with `appliedToEden: false`. Future integration hands approved deductions to Eden's Distribution draft; it never writes the existing table without confirmation or overwrites manual adjustments.
7. Keep restriction selection and outgoing-message preview in Eden Steps 3–4. Only the authorized Eden server transaction can record real application. Delivery retries must not double-apply deductions. No independent messaging is built locally.

### Staff and admins

Staff reviews evidence and corrections through the existing authority. RL-targeted deductions need a defined independent confirmation policy (O16); the prototype can record them but blocks final export until such a workflow exists.

Admins add/edit manual rules, amounts, applicability and supported thresholds; publish with version/reason; review historical versions and future rollback-as-new-version. Existing runs pin their original policy. Adding prose does not create an automatic detector. Production role boundaries remain for Eden integration; local names are demonstration labels, not authentication.

### Booster — proposal from Claude, not yet agreed as delivered scope

Provide the affected person their reason, boss/pull/timestamp and appropriate evidence reference, exact assessment, rounded deduction and an appeal entry point. Limit visibility to their authorized record and use Eden's existing staff-first appeal process. Consent/access controls and account verification must precede production use. This dedicated screen is not implemented in the first local milestone.

## 4. Implementation notes

### Architecture and interfaces

Keep separate adapters for Eden context, authorized WCL capture, run/identity resolution, encounter evidence, deterministic policy, review/persistence, admin publication and application audit. Deduction output is independent of Eden's gold/base-cut implementation.

Proposed records: run/context revision, raw capture/provenance, selected scope, identity resolutions, pinned policy/pack/engine versions, observations, suggestions, review decisions, exact incident ledger, rounding choice, confirmation/export and future application receipt. No mode snapshot or settlement ledger.

Every generated suggestion is recorded, including rejected/superseded versions. Review, confirmation and actual application are distinct. A local confirmation must never pretend to be actual application. Append corrections and preserve earlier decisions. Use optimistic revisions, server-side validation and transactionally recorded changes. Repeated submissions cannot append duplicate incidents. Rediscovery compares stable incident identities rather than only event payload equality.

SQLite is the first local store, behind an Eden-owned service boundary. It is a provisional choice, not a production database commitment. Capture/import state and reviewer decisions persist across restart. Hash-linked records detect inconsistency, but are not tamper-proof against database administrators.

### WCL and identity requirements for later automation

- Authenticate server-side and validate current official API/schema/access behavior during the ingestion milestone. No credentials in browser output or logs.
- Normalize epochs, report/fight-relative time and recording offsets explicitly. Preserve server time with timezone/offset and display viewer-local time; handle DST as unambiguous instants.
- Qualify actor/fight IDs by report. Preserve Unicode names and meaningful accents; exact account ownership is not guessed from similar names or role.
- One person can play multiple characters/roles. Compare planned roster, change history and per-pull participants. Unknown may mean buyer/LB/alt/unrelated participant, not helper.
- Select session candidates by schedule, roster overlap, sequence, difficulty, gaps and continuity, with editable included/excluded pulls. Same-roster consecutive boosts or a legitimate multi-raid boost require explicit ambiguity handling.
- Combine split reports, reconcile overlapping captures before counting wipes, and retain legitimate repeated pulls/events. Include bosses without kills and separately classify reset/abort/unknown outcomes.
- Validate pagination and required streams; player-scoped data cannot prove whole-raid absence. Fetched-all-pages and sufficient recorder evidence are separate coverage claims.
- Use durable background jobs with progress, rate limits, retries, bounded resources and cancellation. Failure/unavailable data is not a clean-play verdict.

### Encounter packs and maintenance

Use shared event detectors with separate encounter/difficulty/patch/hotfix/strategy resources. Each pack records verified identities/sources, phase/target context, assignments, opportunity/ability availability, exceptions, evidence output and positive/negative fixtures. Unsupported versions are explicitly unavailable.

Distinguish observation → candidate mistake → applicable deduction suggestion. Wipe attribution needs an ordered causal sequence and recoverability boundary; the first death is not automatically the cause. Do not charge cascading post-wipe deaths. Spell damage does not by itself prove avoidability, and an unused ability needs supported availability/opportunity.

Claude's maintenance concern is accepted as a design risk: pack publication requires a named maintainer, reviewed evidence and an update/disable process for patches. The person/team, review cadence and expiration policy are still undecided (O24); do not invent a permanent owner. The current Ula'tek reconnaissance resource is not a validated deduction pack.

### Grimoire boundary

Read Grimoire source/docs only. Candidate inspiration includes WCL ingestion/pagination, event normalization, patch-aware packs, canonical finding IDs, fingerprints, replay and stale-result handling. Its Warlock coaching metrics are not universal fault rules, and its service scaffolding is not proof of production suitability.

Use an already independent interface if suitable, otherwise copy/adapt a bounded module into Eden or implement an equivalent. Record source revision/provenance/license and validate on Eden fixtures. Do not move/refactor Grimoire files, change imports/build/dependencies/tests, generate resources there, or add Eden dependencies. Eden must run independently of the live Grimoire checkout. Future reuse updates are explicit Eden versions.

### Access and data handling

Future production permissions must come from Eden: permitted RL runs, staff decisions, designated policy publishers. The local prototype is bound to 127.0.0.1, uses demonstration actor labels and has no production authority. Do not expose it as a public service.

Keep raw private reports, recordings, databases and player data out of the planning repo. Publish portable synthetic cases and contracts. Recording governance/consent is a staff question; no external LLM processing or automatic transcription is assumed. Template reasons are adequate initially; optional later language-model prose cannot invent evidence, causes or tariffs.

### Delivery stages

| Stage | Deliverable | Gate |
| --- | --- | --- |
| 1 — authorized local workflow | Synthetic/imported evidence, deduction ledger, explicit rounding, policy versions, durable audit and JSON export | Meaningful policy/concurrency/persistence/API tests and browser walkthrough; clearly local |
| 2 — WCL evidence | Authorized captures, editable mixed/multi-report selection, identity resolution, chronology and coverage | Representative capture audit; no automatic blame claim |
| 3 — validated suggestions | Small chosen encounter set, approved mechanics rules and contextual damage-priority evidence | Staff-labelled positive/negative cases; maintainer and supported snapshots |
| 4 — local pilot | Compare reviewed real runs, errors/misses and reviewer effort | Agreed acceptance target before enabling actual application |
| 5 — Eden integration | Adapter mapping, actual permissions, Distribution draft/apply transaction, audit receipts and message hooks | Sunking/developer answers and staging validation; no guessed production writes |

Full planned functionality remains in scope; phases do not claim it is already delivered. The user authorized starting local work, not merging documentation, publishing code, deploying or applying real deductions.

## 5. Acceptance criteria

- [ ] Analyze kill and wipe pulls, including earlier qualifying mistakes, and allow evidence-based kill deductions in zero-wipe runs.
- [ ] Mixed/split reports and account swaps resolve explicitly; unrelated/duplicate pulls do not inflate counts. Unknown ownership/coverage is not absence.
- [ ] Initial activation is 3 boss wipes / 6 run wipes, configurable and pinned; early-wipe exceptions require supporting attribution. No invented cross-boss activation scope.
- [ ] Preserve actual impact, cutoffs and alternatives; no double death/wipe charge, multiplier or padding tariff.
- [ ] Sum 0.5 + 0.5 to 1. Preserve exact 3.5 until explicit RL down/up selection; no per-incident rounding. Changed incidents invalidate affected rounding.
- [ ] Output only removed shares/rules/reasons/evidence; Eden owns cuts and all financial handling. Local confirmation/export always states not applied.
- [ ] Each suggestion, rejection/edit, accepted incident, rounding choice, confirmation, correction and policy publication retains actor/time/version and evidence.
- [ ] Repeated/stale writes cannot double charge or silently overwrite. Restart preserves records; existing policy snapshots survive new publications.
- [ ] One standard policy, with no mode selector/editor. Admin amounts/thresholds validate and remain versioned.
- [ ] Unknown class/assignment/cooldown/target context is not fault proof. Required add duty, immunity and incidental cleave are tested as negative padding cases.
- [ ] Local fixtures are labelled. Imported proposals and coverage claims are not presented as verified automated results.
- [ ] No Grimoire modification or runtime dependency on its live checkout.
- [ ] Actual integration has authenticated permissions, independent staff handling where required, exact whole-share field mapping and truthful application/delivery records.

## 6. Open questions

### Mike / staff

| ID | Remaining decision |
| --- | --- |
| O01 | Does one boss reaching its threshold open retrospective deductions only on that boss or the entire run? |
| O02 | Can RL complete manually when analysis is incomplete, and who can override invalid/unresolved application? |
| O03 | Initial encounters/difficulties/patches/classes and representative logs/recordings for reviewed packs? |
| O04 | Countable wipes versus resets/aborts/deliberate wipes; one boost across shifts/cycles? |
| O05 | Precise fixed violation definitions, pretrigger applicability, frequency, warnings and overlap? |
| O06 | Replacement stacking/cut treatment is delegated to Eden; what context must accompany an incident deduction? |
| O07 | Participation pay is delegated to Eden; avoid conflating missing-boss adjustments with an attendance offense. |
| O08 | Whole-share precision and discretionary rounding are resolved. Max allowed deduction is enforced by Eden; clarify constraints and whether an explanation for rounding must be mandatory. |
| O11 | Below-50 averaging window/metric/sample and proof that raid DPS is lacking? |
| O12 | Evidence criteria for pretrigger damage/healing causal exceptions? |
| O13 | Formats covered by 14 boosters / 2 LBs, and exception authority/recording? |
| O14 | Loot-requirement context and references needed for deductions? Universal payment rates belong to Eden. |
| O15 | Appeal deadline, evidence access, recording consent process, retention beyond payout and unavailable recordings? |
| O16 | Who independently confirms an RL's own deduction or a conflicted staff case? |
| O17 | Admin publishers, override/review permissions and policy effective-time rules for open runs? |
| O18 | Pilot targets for false attribution, missed incidents, review effort and latency? |
| O23 | Separate padding/cooldown-priority offense and tariff, if any, beyond existing applicable rules? |
| O24 | Named encounter-pack maintainer, update cadence, review and disable/expiration policy? |

**Closed/superseded:** O09/O10/O19 handled by Eden's financial system; O20/O21 modes removed; O22 kill-pull permission and admin-adjustable thresholds retained. The old Normal-default decision has no effect because modes no longer exist. No other review suggestion silently becomes community policy.

### Developer

- D01: stable identifiers, permitted run/roster/history/customer/account read contracts.
- D02: timestamped role/lockout/replacement/assignment context and start/end/bot requirements.
- D03: draft persistence, locking, version checks and concurrent review/completion.
- D04: whole shares only is answered; still map actual deduction fields/type semantics.
- D05: actual application transaction/audit hook and message-delivery retry behavior.
- D06: populated restriction/message previews and silent mode behavior.
- D08: supported WCL auth/client/access/budgets, caching/jobs and schemas.
- D09: runtime/database/UI/deployment conventions and local artifact handoff.
- D10: structured helper/replacement records, if needed. No chat-reading or bot DMs assumed.

D07 financial implementation is outside this module. Developer answers gate real integration; the current local adapter and synthetic contract are provisional and may need mapping/revision.

### Claude review request

Verify this v1.4 matches Mike's latest decisions; distinguish the authorized local milestone from full automation and actual integration. Check exact-versus-rounded totals, duplicate incident identity, evidence limits, admin versioning, local-only receipts and policy questions. Return findings without inventing tariffs or changing Grimoire. A proposed booster-facing flow and consent/maintenance decisions remain clearly identified.

## 7. References and revision history

- [Plan PR #4 and Claude's comments](https://github.com/MTV6/eden-planning/pull/4).
- [Claude review handoff #5](https://github.com/MTV6/eden-planning/issues/5).
- [Developer clarification PR #6](https://github.com/MTV6/eden-planning/pull/6).
- [Shared handoff](https://github.com/MTV6/eden-planning/blob/main/HANDOFF.md), [agent conventions](https://github.com/MTV6/eden-planning/blob/main/AGENTS.md), [decision log](https://github.com/MTV6/eden-planning/blob/main/decisions.md).
- [Earlier attendance packet](https://github.com/MTV6/eden-planning/blob/main/packets/attendance-check.md): adjacent proposal; its proportional partial-cut formula, automatic account links and swap DMs are not adopted here.

Local supporting material includes the earlier rulebook and 257-message channel export, website observation record, CSS references, frozen scanner scaffold and the new ledger prototype. The packet is self-contained; those private/local artifacts are not prerequisites for review and are not uploaded with it.

- v1.0: consolidated accepted rules, site findings and proposed architecture.
- v1.1: added requested Light/Normal/Strict modes and kill-pull review.
- v1.2: independent pretrigger kill permission, Normal default, admin thresholds and padding scope.
- v1.3: explicit Grimoire unchanged boundary; published for Claude review.
- **v1.4:** incorporated Claude's Mike-decision comments: one policy/no modes, deduction-only scope and explicit RL rounding to whole shares; recorded Mike's direct authorization to start local work; retained full future automation scope; added maintenance and booster/recording review concerns without claiming policy approval. No Grimoire changes or real Eden application.
