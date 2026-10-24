# Eden deduction suggestion module — master review plan

**Version:** 1.3 · **Date:** 24 October 2026 · **Prepared by:** Codex for Mike and Claude

**Status: PROPOSED DESIGN, READY FOR REVIEW. IMPLEMENTATION PAUSED.**

This is the consolidated planning baseline for this module. It incorporates Mike's decisions, Marco's accepted rules, the Eden website inspection, the shared planning repository and Grimoire reconnaissance. It supersedes earlier architectural suggestions in this conversation. It does not replace the approved rulebook with new policy or authorize building.

Read this document alone for the complete proposal. Supporting sources are listed at the end. No new application code was written for this plan. A preliminary, incomplete local scaffold exists; it is not the approved architecture, a working release or a tested product.

## Review guide

- **Established:** Mike explicitly accepted the requirement or policy. These do not need staff approval again.
- **Observed:** visible behavior or wording on the inspected website. This is not proof of backend implementation.
- **Proposed:** recommended product or technical design for review.
- **Undecided:** a policy, integration or delivery choice that has not been settled. Recommendations are not silently adopted defaults.

The important review decisions are collected in Section 6. Approve or revise the plan first; building starts only after Mike explicitly asks for it.

## 1. Problem

Raid leaders currently need to reconcile a roster, Warcraft Logs reports, calls and recordings, attendance, replacements and deduction rules when closing a boost. Reports can contain unrelated runs, multiple difficulties or partial captures. The final roster may omit people who participated earlier or show a different character from the one used in a pull.

The requested module should identify the relevant boost, analyze all its available pulls, explain supported mistakes and possible wipe causes, propose deductions and draft the reasons. The RL reviews the result before any share adjustment is applied. Every suggestion and subsequent decision must be traceable.

The tool must not promise to detect every mistake or prove every wipe cause. Logs may establish an event without establishing responsibility, an assignment, a voice call or whether recovery was possible. Explicit uncertainty is part of the result.

## 2. Proposal

### 2.1 Product scope and boundaries

**Established requirements**

1. Develop a standalone local module first, for eventual handoff to Eden's developers. Website source access is currently unavailable.
2. Integrate the eventual module into the existing run-completion process, primarily Distribution.
3. Analyze all relevant wipes and kills, including earlier pulls, with intelligent selection from mixed reports.
4. Propose targeted booster deductions, shares and readable reasons; a human confirms.
5. Provide a separate admin control panel for rules, share amounts, filters and automation thresholds.
6. Log all suggested deductions, all review decisions and all confirmed/applied deductions.
7. Preserve the approved rules below, including half shares, replacement discretion, appeals and redistribution.
8. Grimoire modules and ideas may be reused where suitable, but **Grimoire must remain unchanged**. Inspect it read-only; perform all adaptations in the Eden project. Do not assume its current player-coaching engine already performs whole-raid fault attribution.
9. Stay in planning until Mike approves starting implementation.
10. Provide RL-selectable **Light, Normal and Strict** deduction review modes. **Normal is the default. All thresholds are adjustable by admins**, including activation and mode/detector thresholds. Numeric initial values beyond the existing rules remain for review; published versions and effective dates govern changes.
11. Scan and expose mistakes on **successful kill pulls as well as wipes**. The RL may deduct qualifying kill-pull mistakes **before the wipe threshold, including zero-wipe runs**, using applicable rules and evidence. Successful kills must not filter them out.
12. Detect and explain possible add padding and high overall parses with poor boss/priority-target contribution, including cooldowns held for adds or target choices that harm the encounter objective. Review assignments and legitimate add requirements before attributing fault; a new padding tariff has not been specified.

**Proposed boundaries**

- Read roster data; never change roster membership through scanning.
- Resolve attendance and identities before applying deductions to a person. Missing log presence alone is not an established no-show offense.
- Separate attendance/participation entitlement, replacement entitlement, disciplinary deductions, bonuses, warnings and restrictions.
- Apply no access restriction or payment automatically from a detected incident.
- Keep share decisions in run completion and gold pricing/redistribution in Attendance.
- Support manual evidence and review for offenses the logs cannot establish.
- Share run selection, identity matching and capture infrastructure with attendance; keep their policy decisions distinct.
- Do not add player messaging, account-link changes, a new roster builder, scheduling, rotational coaching or a general Discord scraper to the first implementation.

### 2.2 What the website inspection established

The inspected run was open and incomplete. Its current roster, empty log field and empty deduction preview are not evidence about a completed run. No fields or roster actions were changed, no completion was submitted and no messages were sent.

| Surface | Observed | Consequence for this module |
| --- | --- | --- |
| Roster Builder: `/admin/runs/{runId}` | Run title, difficulty, server-time schedule, lead and roster capacities | Use existing run identity and metadata as analysis anchors. |
| Roster | Separate tank/healer/DPS/LB slots; selected character/realm; account identity; primary and alternate specs | Resolve the selected character to the player account; record roles by pull. Alternate specs are not assignments. |
| Signups | Account-grouped characters; displayed signup summary can differ from selected roster character | Do not match using only the signup summary. |
| Bot plan | Ranged/melee, saved/unsaved and LB targets; custom targets with change reasons | Preserve configuration and history. A custom target is not proof that a policy exception was authorized. |
| Participants | Booster/LB/customer counts; playing/AFK LB distinction described | Separate participant categories before eligibility evaluation. |
| Lockouts | Saved-boss counts and explicit unknown lockout data | Unknown is not unsaved. Capture timing matters; post-run saved state cannot prove pre-run loot eligibility. |
| Roster controls | Swap, replace, remove, notes, no-show, verification, start and announcement controls exist | Reuse appropriate developer-provided data; these controls were not exercised. |
| History | Human/bot actor, server time, changes and reason; UI states 60-day retention | Preserve evidence needed for deductions independently of this retention window. |
| Editing | Auto Roster On/Draft/Off; Done editing indicates coordination with other leaders | Developer must explain locking/autosave. Opening the page alone does not prove no automatic edit-session side effect. |
| Completion Step 1 | Report field, hours/minutes and optional notes | Reuse report entry; propose multi-report support, run selection and recording reference. |
| Completion Step 2 | Attendance check described as boss-kill presence; player/type/received shares/announce/reason; helper default PARTIAL, 1 share | Main deduction review goes below Attendance check and above this table. Helper default is not a replacement-pay policy. |
| Completion Step 3 | Optional consequences beyond gold for deducted/warned people | Keep restrictions explicitly reviewed. Only its empty state was inspected. |
| Completion Step 4 | Duration/report/raider/distribution/restriction summary and message preview; Complete raid closes run and sends messages | Final completion is the application boundary. Only the empty preview was inspected. |
| Discord preview wording | Named player ping, no channel ping, individual DM | Use Eden's existing delivery path and verify populated previews before integration. |
| Attendance wording | Management posts attendance and gold afterwards | Completion is not gold settlement. Attendance implementation remains uninspected. |

The completion form was preserved while roster inspection used another tab. An attempted Cancel and close was blocked by automatic approval review because of possible draft loss; it did not execute.

### 2.3 Agreed policy baseline

The following are established rules, not new proposals. Historical channel examples and early suggestions cannot override them.

#### Activation, scope and responsibility

- The initial standard performance activation thresholds are **3 or more wipes on one boss OR 6 or more across the run**. These are admin-adjustable, versioned policy values rather than hardcoded constants.
- **Kill-pull permission is independent of those thresholds:** the RL may deduct a qualifying mistake on a successful pull even before activation, including a zero-wipe run. No trigger override is required for that permission. Evidence, applicable offenses and amounts still govern the deduction; it is not mandatory to deduct every observed mistake.
- Earlier qualifying mistakes count once applicable. Everyone, including the RL, is reviewed. Analysis runs independently of wipe counts. Kill-pull permission does not by itself authorize every ordinary mistake on an early wipe pull; the pretrigger wipe exceptions below remain applicable unless explicitly changed by published policy.
- Assess events only while a pull is recoverable. Exclude failures after a wipe call or after the pull becomes unplayable. Last death time is not the cutoff.
- In addition to the independent kill-pull permission, before activation the stated performance exceptions are damage shortfall causing a **1% wipe** and insufficient healing causing **multiple avoidable deaths**. The result alone does not identify the responsible player. Numerical thresholds can be adjusted by admins through versioned policy.
- No multipliers. Separate qualifying incidents add together; multiple descriptions of the same incident do not create extra charges.
- A wrong call, missing assignment, unsuitable composition or another player's error can change responsibility. Being dead does not establish fault.
- The exact scope of retrospective activation after the per-boss threshold is reached remains a clarification item: affected boss only versus whole selected run. The initial 3/6 values and admin authority to adjust them are settled; independent kill-pull permission is settled too.

#### Reasons and shares

| Reason | Established deduction |
| --- | ---: |
| Avoidable death without major wipe impact | 0.5 share |
| Mistake directly causing a wipe | 1 share |
| Failed assigned soak, taunt, interrupt, dispel, target swap, positioning or utility | 0.5 for the qualifying avoidable death; 1 for the wipe-causing mistake |
| Unused/mistimed defensive, healing potion or Healthstone contributing to the incident | Same impact scale; supporting evidence, not a duplicate penalty |
| Voice requirement violation | 1 share |
| Preparation requirement violation | 1 share |
| Attendance requirement violation | 1 share |
| Conduct requirement violation | 1 share |
| DC causes a missed recoverable mechanic and a wipe that continued play could have prevented | 1 share |

A voice violation can be charged alongside a separate mechanic incident. Other overlaps still need precise definitions. A failed mechanic without the stated impact has no newly invented flat tariff here. A DC alone, a lack of events, or one low parse is not an automatic deduction.

**Sum exact half shares.** 0.5 + 0.5 = 1; 2.5 stays 2.5. Preserve retained shares too. Record base, removed and retained amounts separately. The cap and handling of an assessed total larger than the entitlement remain undecided; never create a negative payment silently.

#### Performance, roster and RL duties

- Bot minimum requirements are the expected standard for the applicable role/run.
- If raid DPS is lacking and a DPS player's average damage parse is below 50, the player should be replaced. The averaging method is undecided. This is not an approved universal low-DPS fine.
- Approved roster ratio: **14 boosters / 2 LBs**. Different capacities seen on the website do not silently amend this rule. Applicable formats and exception authority need clarification.
- RL owns suitable composition, healing, mechanics/utility coverage and clear, timely, achievable calls. RL mistakes are reviewable too.
- Do not rely on unsuitable LBs for required booster responsibilities. The contextual minimum-loot-items remark is not a complete automated rule.
- Escalate to staff when a run is taking too long or a boss exceeds **5 wipes**. This is separate from deduction activation. No numerical definition of too long is settled.

#### Replacements and entitlement

| Circumstance | Established treatment |
| --- | --- |
| Unsaved replacement needed to preserve loot spots | RL may remove outgoing player's full cut; it is not automatic for every replacement. |
| Saved replacement | RL can offer incoming player 3 shares. Outgoing entitlement is a separate decision. |
| Removed player, run completed without replacement | May retain half cut depending on severity; severe offense means full removal. |

State the payment arrangement when seeking a replacement. Half cut means half retained; full removal means none retained. An 8-share base therefore becomes 4 or 0 respectively. Record severity, reason, replacement identity, saved-status evidence and agreed payment. How these decisions combine with existing incident deductions is undecided; show the final entitlement explicitly and require resolution rather than invent stacking.

#### Evidence, appeals and redistribution

- RL must log the run and provide their own or another player's recording including Discord voice audio. Relevant wipes and calls must be covered. Retain at least until attendance is paid; longer retention is undecided.
- Entries identify run, player, boss/pull, timestamp, assignment, mistake, impact, evidence, shares removed and shares retained. Corrections replace earlier amounts while preserving history.
- Staff reviews an appeal first; RL is then added to answer; staff decides. When staff orders a refund after attendance has been completed/paid, RL pays affected players personally within **24 hours of the decision**.
- Undeducted RL receives **30% of deducted gold only**; eligible non-deducted boosters share the other **70%**. RL does not also receive part of that 70%.
- A deducted RL receives no deduction proceeds: **100% goes to eligible non-deducted boosters**.
- Any deducted player is excluded from proceeds from their own and others' deductions. Their ordinary remaining entitlement is separate.
- Pool weighting, gold rounding, no-eligible-recipient handling and treatment of non-disciplinary partial shares remain open.

### 2.4 Revision of earlier planning assumptions

1. The October 13 attendance packet is an adjacent proposal, not proof of shipped behavior. The live site now exposes a boss-kill attendance check; implementation equivalence has not been verified.
2. Deduction analysis definitively includes wipes. Whether wipes count toward attendance pay remains separate and undecided.
3. Do not adopt the older packet's proportional `base × bosses present / bosses total` partial-cut formula as policy. It was a proposed default, not Mike's approved replacement rule.
4. Unknown log participants must not automatically become helpers; they may be customers, LBs, alts or unrelated-run participants.
5. A missing player is not a confirmed no-show when report coverage or identity is unresolved.
6. A manual character-match decision applies to this review. Persistent ownership/account changes and automatic swap DMs from the older packet are separate scope, permissions and identity-verification work.
7. Current site capacity or bot overrides do not authorize new roster exceptions or new deduction tariffs.
8. The existing 1-share helper UI default must not overwrite the agreed saved-replacement option.
9. Local confirmation is not a real Eden deduction or payout. Local demonstration of completion must be explicitly labelled simulated.
10. The existing scaffold's hardcoded policy, limited identity model and non-durable state are not accepted design decisions.

### 2.5 Light, Normal and Strict review modes

**Mike's requested direction:** Light should tolerate more and primarily suggest serious or wipe-causing incidents; Normal follows the standard rules with ordinary scrutiny; Strict closely examines every player, including damage and healing, for severely problematic runs. **Normal is the approved default.** All thresholds and all three presets' options must be editable by admins. Unspecified initial numerical values and new tariffs remain for review.

| Mode | Intended behavior | Proposed suggestion emphasis |
| --- | --- | --- |
| **Light** | Greater tolerance; a higher bar before an incident enters the suggested-deduction list | Well-supported serious incidents and wipe-causing mistakes. Minor findings remain available through the full findings view. Serious kill-pull incidents can still be reviewed. |
| **Normal** | Standard Eden policy and ordinary tolerances; **default mode** | All qualifying standard-rule incidents, including avoidable deaths and mechanics failures on kill pulls and wipes. Kill-pull deductions do not require reaching a wipe threshold. |
| **Strict** | Broadest supported review of every player's mechanics, survival, utility, preparation, damage and healing | Lower tolerance for supported deviations and repeated mistakes; deeper contextual performance review and more items needing RL assessment. Applies equally to RL and boosters. |

All modes analyze the same confirmed run, including kills, wipes and earlier pulls. Light must not save effort by ignoring kill pulls or individual players. Strict can enable additional validated detectors or fetch further required evidence, but it must show if those checks are unavailable. A successful boss kill neither clears a mistake nor transforms a potentially dangerous mistake into an actual wipe-causing offense.

**Proposed operating rules**

- A mode defines review breadth, tolerances and which supported findings are suggested. It is distinct from the evidence-quality requirement, rule applicability and share tariff.
- Greater strictness must not reduce the evidence needed to attribute fault. Unknown assignments, unavailable events and unsupported class/encounter checks remain unknown in every mode.
- Use the established amounts and no-multiplier rule across modes unless an explicitly published policy change says otherwise. Selecting Strict does not silently increase a 0.5-share incident to 1 or invent a low-output fine.
- Separate finding status (observed/supported/uncertain) from presentation status (suggested by mode/below mode threshold/manual review/not currently eligible). Retain the reason a finding was omitted from the suggestion list.
- Provide **All findings / Suggested by mode** and **All pulls / Kills / Wipes** views. The RL can open a finding below the mode's suggestion threshold, check evidence and move a qualifying incident into review with a recorded reason. This presentation override is distinct from an override of policy applicability.
- Suggestion thresholds use explicit units and direction: minimum impact, allowed repeated mistakes, grace windows or output deviation. Do not universally multiply every threshold; some metrics become stricter when lower and others when higher.
- Changing modes shows what was added, removed or changed. Preserve accepted/rejected/manual decisions; mark decisions affected by changed applicability or evidence for review. Never silently apply, delete or duplicate deductions when switching modes.
- Store mode ID/version, resolved settings, actor, time and mode-change reason with the analysis and review. Use one run-level mode for consistent comparison; individual evidence-based decisions remain possible. Per-player punishment modes are not proposed.
- Exact Light/Normal/Strict values, severity definitions, mode-switching permissions and timing are undecided (O20–O21). Normal as default, admin-adjustable thresholds and independent kill-pull deductions are settled (resolved O22). The initial preset editor must expose remaining choices explicitly before production publication.

**Strict damage/healing review**

Review output in context: role/spec, assignment, active opportunities, gear/bot expectations, encounter phase, survival, fight length, raid demand and relevant buffs. Inspect priority-target contribution, missed required utility and healing failures where the evidence supports it. Low HPS during low healing demand or low DPS while performing an assigned mechanic is not sufficient fault evidence. Missing parses are not zero.

The below-50 average parse condition remains a replacement rule when raid DPS is lacking. Any additional strict-mode performance offense or amount needs a defined rule. Findings can recommend investigation, coaching or replacement without inventing a financial penalty. Staff-reviewed encounter/class support determines which checks are available; Strict is not a promise of universal class-rotation analysis in the first release.

**Kill-pull example, synthetic only:** a player dies avoidably on a successful pull in a zero-wipe run. The RL may apply the established 0.5-share deduction after reviewing the evidence, without waiting for the 3/6 threshold. Light may leave it below its suggestion threshold but must keep it available for RL review; Normal may suggest it; Strict may additionally review related utility/output issues while avoiding duplicate charges for the same death.

### 2.6 Boss damage, add padding and cooldown prioritization

**Established feature requirement:** assess whether a player prioritizes useful encounter damage or inflates overall output on adds while neglecting boss damage. A good overall parse must not hide low boss contribution. Investigate cooldown timing and target selection as possible explanations.

**Proposed detector design**

1. Encounter packs classify targets by phase: boss/objective, required priority add, optional or low-priority add, and unknown. Importance can change within a fight. Include RL strategy/assignments and boss vulnerability windows; never label all add damage as padding.
2. Show total damage and parse, boss damage, required-add damage and other-add damage separately, with active/vulnerable target time and assignment context. Display boss-specific parse only if a valid, comparable source provides it; do not relabel a calculated damage ratio as a parse.
3. Identify high-overall/low-boss discrepancies against configured, appropriate role/spec and opportunity baselines. Include absolute amounts and timelines, not only percentages: a lower boss-damage share can be caused by useful additional add damage without reducing boss output.
4. Examine cooldown casts, target damage during their effect windows, add spawn/death times and boss vulnerability. Estimate readiness/hold duration only where cooldown resets, charges, reductions and cast history are supported. No cast alone is insufficient evidence that a cooldown was available. Include pet/guardian ownership and delayed effects when attributable.
5. Look for repeated off-priority targeting, preventable lost boss-damage opportunities and supported cooldown holds that align with low-value add windows. Distinguish incidental cleave and passive damage from deliberate target choices. Damage destination alone does not prove the selected target or player intent.
6. Check legitimate reasons: assigned add duty, dangerous priority adds, shield/phase objectives, boss immunity, forced downtime, movement, mechanics, RL calls and scheduled cooldown assignments. Required add damage is positive contribution even when boss damage is lower.
7. Return an evidence-backed **possible padding / damage-priority issue**, with alternative explanations and unavailable checks. Escalate to a deduction suggestion only when an applicable rule, supported responsibility and impact exist. Do not claim the tool knows the player's motive or a precise hypothetical amount of lost boss damage without a validated model.

**Review display:** overall parse where available; damage breakdown; boss/priority-target opportunity; relevant assignments; cooldown/target timeline; suspected deviation; evidence and exceptions; recommended investigation, replacement or applicable deduction. Keep this available on both kills and wipes. A high parse is neither immunity from review nor proof of misconduct.

**Admin settings:** enable detectors per encounter/mode; configure target classifications and phase windows, boss-contribution baselines, overall-versus-boss discrepancy thresholds, minimum opportunities/sample size, cooldown-hold tolerances, repetition/impact thresholds and documented exemptions. All numerical thresholds are adjustable, with units, validation, versions and fixture previews. Unknown targets or unsupported cooldown models lower coverage rather than manufacture a result.

**Modes:** Normal includes standard configured damage-priority checks; Light primarily suggests material, well-supported cases and leaves lesser findings accessible; Strict enables the most detailed supported target/cooldown review and lower configured tolerances. Evidence requirements remain intact. Per-mode exact values and the first supported classes/encounters are open.

**Policy limit:** no standalone padding share amount has been agreed. Existing assigned-target/mechanic rules may apply when their conditions and impact are met; otherwise the finding stays reviewable without an invented financial penalty. O23 defines the remaining offense/tariff decision. Avoid duplicate penalties when padding, low boss damage and cooldown holding describe the same underlying incident.

## 3. User flow per role

### 3.1 Raid leader: run context and Step 1

1. Open the existing completion workflow. Load a read-only, versioned snapshot of the run and roster; do not acquire a roster editing lock merely to analyze it if Eden supports a read-only path.
2. Use the report already entered, with an option to add further reports. Accept only supported report references and explain access/coverage failures.
3. Propose the boost session using schedule, roster/account overlap, encounter sequence, difficulty, time gaps, kills and roster continuity. Reports may span multiple raids. A repeated boss kill suggests a boundary but is not conclusive alone.
4. Show a timeline/table of included and excluded pulls, boss, difficulty, time and outcome, with reasons for selection. Display ambiguous alternatives. RL confirms scope or edits the pull selection.
5. Match planned roster, change history and actual per-pull participants. Show customer/LB/booster classification, swaps and uncertain ownership for review. Scope and identity confirmation are prerequisites for targeted application.
6. Add the recording URL and relevant notes/assignments. Keep recording offsets separate from WCL timestamps. Entered duration checks plausibility but cannot establish exact session boundaries.

Do not silently select the highest-scoring candidate where two sessions remain plausible. A change of zone alone does not split a boost that legitimately spans raids. Missing logs or private-report access produce an explicit limitation, not a clean result.

### 3.2 Raid leader: Step 2 Distribution

Placement: **Attendance check → Deduction review → existing player distribution table**. Share the confirmed scope and identities with attendance, not its kill-only event selection.

The collapsed summary shows the selected Light/Normal/Strict mode, supported coverage, selected bosses/pulls, total/per-boss wipes, activation state, suggested incident/player counts and unresolved items. It also shows policy and analysis freshness in plain language. Place the mode selector beside Analyze/Review and display a short preset description and changed-settings summary. Mode selection does not complete the run or adjust shares.

Opening the panel shows player groups and a boss/pull view. Each proposed incident contains:

- Player and character; boss, difficulty, pull and outcome.
- Timestamp and evidence link(s), plus the relevant event sequence.
- Applicable rule and version, expected assignment/behavior, observed event, impact and proposed shares.
- Whether applicability and responsibility are supported, uncertain or unassessable; missing evidence and plausible alternatives.
- Actual impact on the kill or wipe pull, relationship to any wipe sequence and related incidents, without double-charging the same causal chain. A wipe relationship is optional for kill-pull findings.
- Why the selected mode suggests the incident, or why it appears only in All findings; distinguish mode filtering from policy ineligibility.
- Accept, Edit, Reject and Leave unresolved actions. Changes to attribution, impact, shares or dismissal of a reviewable item retain an explanatory reason.

Supported factual observations can be displayed with no monetary proposal. Wipe-cause hypotheses need explicit review. Avoid fabricated numerical confidence scores; use defined evidence categories until calibrated confidence exists.

Manual entries cover voice, preparation, attendance, conduct, calls, DC context and replacements. They require a rule, reason, evidence/reference and impact where relevant. Log text and recordings are evidence, never instructions to the analyzer.

After review, show a diff before updating the distribution draft. Retain existing manual entries and identify conflicts. Use labelled fields for base entitlement, incident deductions, replacement adjustment, other adjustments and final received shares. A rescan must not erase edits or append duplicate charges.

Example, synthetic only: two separate accepted incidents of 1 and 0.5 against an 8-share base show **8 base − 1.5 deducted = 6.5 received**. The generated reason includes both incidents and their evidence. Adjustments and source decisions remain linked even if the final prose is edited.

### 3.3 Raid leader: Steps 3 and 4

**Warnings and restrictions:** carry confirmed deduction/warning context forward, but choose any restriction separately. Do not infer restriction duration or eligibility rules from a share deduction. Existing populated controls require developer/test-environment inspection.

**Review and complete:** show scope, final share changes, evidence references, warnings/restrictions, omitted/unresolved analysis, and exact outgoing message previews. Keep the existing silent-announcement choice separate from audit logging; silence must not erase records. Verify actual checkbox semantics with developers.

Completing through Eden remains an explicit human action. Only successful server-side commitment records deductions as applied. Analysis and review never independently post to Discord. Failed notification delivery is tracked separately from successful application so retries do not deduct twice.

Proposed completion policy: unresolved identity, stale confirmation, duplicate incident conflicts or invalid share arithmetic block applying affected suggestions. Whether incomplete analysis blocks the entire run or permits a documented manual completion is Mike's decision (O02). Do not silently turn unavailable analysis into zero deductions.

### 3.4 Management / attendance reviewer

- View the confirmed distribution and its analysis, roster and policy snapshots.
- See manual overrides, unresolved coverage, replacement arrangements and who confirmed them.
- Price shares and preview redistribution in the existing Attendance process.
- Maintain a distinct settlement record; applying a share deduction and settling gold are different events.
- Avoid reusing the reduced share denominator to implicitly implement the 70/30 rule. The developer must reconcile Eden's existing pricing formula and explicit deducted-gold pool so totals conserve gold and nobody receives redistribution twice.

### 3.5 Staff / appeals

- Review the original evidence, original and final decisions and the rules effective for that decision.
- Staff performs initial review before inviting the RL into the appeal discussion.
- Record uphold, amend or reverse with rationale. Historical decisions remain readable.
- Pre-settlement corrections update the pending financial decision through the authorized workflow. Post-settlement refunds create a separate obligation and settlement/correction record.
- Track the 24-hour deadline from the staff decision. Automated reminder delivery and its recipients are optional future choices, not authorization to message anyone now.
- Do not automatically create debts for other boosters or claw back redistributed gold; post-refund accounting details need agreement.

### 3.6 Administrator

Proposed location: **Systems & Config → Deduction rules**, with history links from **Warnings & Deducts**.

Manage rule descriptions, amounts, applicability, thresholds, scope, filters, evidence requirements, detector templates, encounter-pack enablement and review settings. Provide draft, validation, fixture preview, publish, history and rollback-as-a-new-version. Roles and publisher authority must be agreed.

Add a **Review modes** editor with separate Light, Normal and Strict presets. For each preset configure supported detector categories, severity/impact filters, mistake-count tolerances, timing grace windows, contextual DPS/healing review settings, minimum samples and permitted manual overrides. Show inherited policy settings separately from preset overrides. Validate units/ranges and compare all three modes against the same fixtures before publication. Policy activation changes, additional offenses or different tariffs require explicit policy-version changes, not an unexplained sensitivity slider. Keep kill-pull review available in all three modes. Log configuration publication, rollback and all per-run mode selections/changes.

**All numerical thresholds must be admin-adjustable:** activation counts, output/parse cutoffs, deviation/impact limits, repetition counts, timing windows, sample minimums and detector thresholds. Seed the current approved values, show effective settings, and validate supported ranges/units. Changing a threshold does not create a new offense, resolve missing evidence or alter old decisions. The independent permission to deduct qualifying kill-pull mistakes remains visible and applies across modes; Light filtering must not disable it. Normal is selected by default for a new review.

Adding a textual rule can create a manual-review rule. Automatic detection requires an existing supported detector or developer implementation and validation. The admin panel must not imply that entering prose creates reliable mechanic detection.

Every analysis/review pins configuration versions. Editing policy does not rewrite previous runs. Re-evaluation creates a new comparison and requires review of affected decisions. A missing rule or incompatible pack makes evaluation unavailable rather than silently skipping it.

## 4. Implementation notes — proposed, not built

### 4.1 Architecture

Use separate components with documented contracts:

1. **Eden adapter:** run/roster/account/customer/history/minimum-requirement snapshots; completion and attendance integration. Local demo uses fixtures/manual imports.
2. **WCL adapter:** authorized report retrieval, metadata and full required event streams, completeness validation and capture storage.
3. **Run and identity resolver:** session proposals, report overlap handling, confirmed scope, account/character/participant mapping.
4. **Encounter engine:** patch/difficulty-scoped detectors and event/phase/assignment context.
5. **Eden policy engine:** applicability, impact, amounts, deduplication, entitlement review and redistribution eligibility.
6. **Review service and interface:** durable drafts, decisions, manual evidence, generated reasons and freshness checks.
7. **Admin configuration service:** validated versioned rules/packs and publication history.
8. **Audit and integration service:** immutable decision history, application receipts, notification delivery status, appeals and settlement references.

Deterministic logic produces evidence and amounts. An optional later language-model layer can explain approved findings; it must not invent causes, evidence, rule amounts or beneficiaries. Template-based reasons suffice for the first release.

The analysis must return promptly to the browser as a job with progress rather than hold completion open on a long request. Cache complete immutable captures within the permitted retention window, and reuse them for reviewed re-analysis. Choose timeout and resource limits from representative reports; no unmeasured latency guarantee is assumed.

### 4.2 Grimoire reuse assessment

**Established boundary: do not modify anything in Grimoire.** Reuse suitable modules or take inspiration from its designs, with all new adapters, copied modules and adaptations owned by the Eden project. Review compatibility, licensing and dependencies before reuse when building is authorized.

- Read Grimoire source and documentation without editing, moving or refactoring its files, configuration, dependencies, generated resources or tests.
- Prefer an existing independently consumable interface/package if it already fits; otherwise copy a suitable bounded module into Eden or implement an Eden-owned equivalent from the design. Copying does not remove or alter the original.
- Do not introduce a shared-package extraction that requires changing Grimoire's imports, packaging or build. Any new package is created on the Eden side only.
- Avoid a runtime dependency on Mike's live Grimoire checkout. Pin any reused version and record its source revision, provenance and applicable license; run adaptation tests in Eden.
- If reuse requires a Grimoire change, choose an Eden-side adapter or independent implementation instead. This project provides no authorization to change Grimoire.
- Grimoire updates must not silently change Eden's detector behavior or historical analyses; adoption is an explicit, versioned Eden change.

| Candidate | Value | Required check / limitation |
| --- | --- | --- |
| `src/ingestion/warcraftlogs/client.js` and query planning | OAuth/report access, pagination, retry and stream contracts | Confirm full-raid required event scope. Player-scoped streams cannot establish absence of other players' actions. |
| `src/normalization/events.js` | Consistent timestamps, identities and event provenance | Validate event semantics for all roles, pets/guardians, ownership changes and cross-report identity. |
| `src/analysis/encounters/` and encounter resources | Patch-aware encounter structure and phase/context concepts | Existing coaching resources are not certified blame/deduction rules. |
| `docs/canonical-analysis-contract.md` | Fingerprints, immutable captures, replay, stale-result handling | Adopt the principles; define Eden-owned contracts and ownership. |
| Analysis job/service patterns | Background execution and progress reporting | Existing Grimoire service description is not proof of production-ready Eden infrastructure. |

Grimoire focuses on Warlock coaching. Do not apply Warlock performance heuristics to other classes or equate coaching feedback with a punishable offense. Preserve its independence; no Eden dependency is added to Grimoire. No Grimoire code was modified during this planning work.

### 4.3 Run resolution and capture requirements

- Treat report-local actor/fight IDs as local; qualify them with report/capture identity.
- Match names using safe Unicode/case/realm normalization; preserve originals and use realm/region or stable character identity to avoid collisions. Do not strip meaningful accents or merge lookalike names.
- Model one Eden player with multiple characters and roles over time; distinguish registered ownership from a reviewer-confirmed mapping.
- Build planned, historical and observed participation views. A pre-run removal is not a mid-run leave, and an unrecorded portion is not proof of absence.
- Normalize time units explicitly: report epoch, report-relative fight time, fight-relative event time and recording offsets. Preserve server-time representation with zone/offset and viewer-local display; use unambiguous instants for comparison and DST handling. Adapt to Eden's storage contract rather than storing ambiguous wall-clock strings.
- Resolve overlap across reports before wipe counts. Duplicate uploads must not multiply incidents or wipes. Similar repeated pulls must not be collapsed solely because they involve the same boss and roster.
- Track report revision, fetch time, permissions, missing pages, excluded fights and which streams were complete. Preserve legitimate repeated events; do not deduplicate by payload equality alone.
- Include bosses with no kill. Distinguish kill, genuine attempt/wipe, reset/aborted pull and unknown outcome; count rules for edge cases remain O04.
- Fetch only required events, but never label an incomplete player-filtered capture as full-raid evidence.
- Use background jobs with progress, retry/backoff, rate-limit handling, resumable capture and cancellation. Browser refresh must not lose a confirmed review or misreport a cancelled scan as complete.
- Credentials stay server-side. Confirm current WCL authentication, report permissions, API budgets and supported schemas against official documentation during implementation. This packet does not assert a tested live API integration.

### 4.4 Encounter packs and attribution

Yes, use separate encounter packs. Shared detectors handle generic event processing; packs supply boss-, difficulty-, patch- and strategy-specific facts.

Each pack needs an ID/version, encounter and difficulty scope, patch/hotfix applicability, verified spell IDs and sources, phase rules, expected roles/assignments, event requirements, opportunity/availability checks, exceptions, evidence output and positive/negative fixtures. Unsupported tuning snapshots remain unassessable.

Distinguish three levels:

1. **Observation:** event occurred, such as damage, death, cast or missing expected event in a proven-complete stream.
2. **Candidate mistake:** conditions suggest a mechanic was mishandled, with assignment, availability and alternatives assessed.
3. **Deduction suggestion:** an applicable Eden rule and supported impact justify a proposed amount, still subject to human review.

For wipes, build an ordered incident timeline and causal hypotheses: initiating event, cascading effects, recoverability boundary and final outcome. Do not blame the first death or charge every death after recovery became impossible. Multiple independent mistakes can exist in one pull; each needs its own causal/incident identity.

Availability matters: a missed defensive is not established solely by lack of a cast; establish the ability, cooldown/resources and opportunity if the rule depends on them. Spell damage alone does not establish avoidability. Strategy and assignments can alter what a player should have done. Wipe calls require voice evidence or manual confirmation where no reliable signal exists.

Do not equate the maximum theoretical raid composition with the actual participants or infer group scaling from signup count. Inspect the actual pull context. A recorder's perspective can omit evidence, even when all pages available to the API were fetched; capture completeness and sufficient evidence for a particular detector are separate checks. Reviewers must see the relevant limitation.

The current local Ula'tek resource establishes limited event identity only; it is not a validated deduction pack. The first release's encounters and supported detectors must be chosen and audited with representative logs and staff-labelled examples.

### 4.5 Rule and data contracts

Names below are proposed contracts, not discovered Eden database tables or endpoints.

| Record | Essential contents |
| --- | --- |
| Run snapshot | Run ID/revision, schedule/zone, type/difficulty, lead, roster/account/character mappings, customers/LBs, bot requirements and config, change history and source timestamps |
| Capture | Reports/revisions, original event references, schema, completeness, access limits, content hashes and timestamps |
| Scope decision | Included/excluded fights, dedup decisions, identities, reviewer and reason |
| Policy snapshot | Rule IDs/versions, amounts, trigger/scope, overlap behavior, evidence requirements and effective dates |
| Review mode snapshot | Light/Normal/Strict ID/version, resolved thresholds/tolerances/detector settings, selecting actor/time and change reason |
| Pack/engine snapshot | Supported encounter/patch/difficulty, detector versions and engine fingerprint |
| Analysis | Input snapshot references, job state, coverage, observations, suggestions, wipe counts, limitations and freshness |
| Incident/suggestion | Stable identity, player/account/character, pull/time/outcome, rule, evidence, impact, shares, related causal incidents, uncertainty, mode filter result and policy eligibility, including independent kill-pull eligibility |
| Damage-priority evidence | Target/phase classifications, assignment references, total/boss/priority-add/other-add damage, opportunity windows, parse provenance, cooldown cast/readiness evidence, hold uncertainty, relevant comparisons and exceptions |
| Review decision | Accept/edit/reject/unresolved, before/after, reviewer, time, reason and evidence changes |
| Entitlement | Base, participation/replacement decisions, incident deductions, bonuses, retained total and unresolved conflicts |
| Application | Run/review version, idempotency key, authorized actor, committed adjustment IDs and confirmation time |
| Delivery | Message intent, final content/recipient reference, sent/failed/retried status, separate from application |
| Settlement / appeal | Gold-pricing reference, eligibility/allocation, dispute sequence, correction/refund obligation and receipt |

Suggested integration operations: load run context; create/cancel scan; confirm scope; review incidents; validate/preview distribution; commit reviewed adjustments through Eden completion; retrieve audit/appeal history. Developers choose actual routes and persistence.

Use exact integer half-share units for penalties and lossless representation for entitlement. If halving a base produces a quarter share, flag O08 rather than silently rounding. Money uses an agreed integer smallest unit and explicit remainder handling. Base shares are supplied by Eden, not hardcoded to the observed 8.

Rule configuration should include category, severity/impact mapping, scope, required evidence, pretrigger eligibility, amount, duplicate/overlap group and manual/automatic support. More general code execution or unvalidated expressions are not needed in the admin editor.

### 4.6 Lifecycle, persistence and concurrency

Suggested analysis lifecycle: queued → capturing → resolving scope → analyzing → ready, partial, failed or cancelled. Review and application are separate state machines; a failed scan is never a zero-incident success.

Every suggestion is retained when generated. Decisions add history; they do not destroy the original. Confirmed decisions remain distinguishable from applied deductions, and applied deductions from paid gold. Rejected, edited, superseded and withdrawn items stay traceable.

- A rescan creates a new analysis revision and compares stable incident identities. It does not append duplicate fines.
- A mode change creates a versioned evaluation of the same run and a difference view. Preserve identities across modes, distinguish mode-suppressed findings from rejected suggestions, and retain earlier decisions. Any newly enabled detector must satisfy its capture requirements before claiming results.
- Preserve historical policy and findings. A new rule publication does not retroactively recalculate a settled run.
- Invalidate affected current confirmations when their scope, identity, evidence or entitlement changes. Show why and request review of the changes.
- Use revision checks so two reviewers cannot silently overwrite each other. Never rely on browser-only state for final authority.
- Revalidate permissions, input versions and arithmetic on the server at completion. Commit application and its audit record together.
- Queue Discord delivery after the commit with deduplicated retries; if delivery fails, the application state remains truthful.
- Local storage must be durable for review/audit testing. Proposed first local store is SQLite, with a repository interface so Eden can map to its existing database. This is a design recommendation, not a settled stack choice.
- A local application receipt is explicitly simulated until the real Eden adapter confirms a successful website transaction.

### 4.7 Security, access and evidence handling

Keep authentication and run permissions under Eden's existing authority. RL access should be limited to permitted runs; staff reviews appeals; management settles; designated admins publish policy. Exact role permissions are O17.

Keep API credentials and tokens out of browser bundles, logs and shared planning documents. No scraping of private account storage or credentials. Recordings and raw logs require role-based access and a retention/deletion policy. Prefer references and bounded relevant evidence over copying entire voice recordings without a need.

Use synthetic/anonymized fixtures in shared development material. Do not publish booster identities, private recording links or raw private reports to the planning repo. No log/recording data is sent to an external language model by default; any future use needs an explicit data-processing decision.

Audit records should be append-only at the application level with restricted correction rights and backups. Do not claim they are tamper-proof merely because updates are hidden in the UI. Preserve enough original evidence to reproduce conclusions within the agreed retention policy.

### 4.8 Delivery phases after approval

| Phase | Deliverable | Exit condition |
| --- | --- | --- |
| 0 — Review, current phase | This packet, settled decisions, prioritized open questions | Mike approves the revised plan and explicitly authorizes building. |
| 1 — Contracts and local review workflow | Synthetic run imports, scope/identity confirmation, policy engine, Light/Normal/Strict configuration and selection, draft review, admin versions and durable audit | End-to-end manual/synthetic workflow works without any live website effects. |
| 2 — WCL ingestion and run detection | Authorized full required captures, mixed/multi-report selection, coverage and identity handling | Representative real-data audit establishes correct capture and scope; ambiguity remains reviewable. |
| 3 — First validated encounter packs | Small agreed encounter set with supported incident suggestions | Positive and negative staff-reviewed cases pass; unsupported mechanics are clearly labelled. |
| 4 — Local pilot | RLs compare suggestions with actual reviewed runs, without applying real deductions | False attribution, missed incidents, scope errors and review workload measured; acceptance target agreed before promotion. |
| 5 — Eden handoff/integration | Documented adapter, UI components, contracts, migrations, tests and deployment/rollback notes | Eden developers verify staging completion, permissions, Discord retries and Attendance accounting. |
| 6 — Controlled rollout and expansion | Enabled run formats/packs, monitored audit and appeal outcomes | Expand only after review; policy and packs remain versioned. |

Manual and automated incidents must use the same review/audit path. First release should not ship an attractive scan panel without durable records or with demo detections presented as live coverage.

No delivery dates, universal detection percentage or production readiness are claimed. Implementation language/framework, deployment, runtime and packaging remain for the build-stage compatibility review. Next.js is supported by the observed frontend asset paths and shared handoff, but its version and backend architecture are unknown.

## 5. Acceptance criteria

The eventual implementation must satisfy the following; these are planned tests, not tests already run.

### Scope and identity

- [ ] A report containing two boosts produces distinct candidates and explains selection; ambiguous same-roster sessions require confirmation.
- [ ] A multi-raid boost stays intact when appropriate; unrelated difficulty/session pulls can be excluded.
- [ ] Multi-report overlap does not multiply pulls, wipes or deductions; legitimate repeated attempts/events remain distinct.
- [ ] Wipes, kill pulls, bosses without kills and earlier applicable incidents are represented.
- [ ] Alts map to the correct account; Unicode, realm ambiguity and ownership uncertainty are handled without silent merging.
- [ ] Pre-run removal is distinguishable from mid-run participation; planned roster is not treated as actual attendance.
- [ ] Buyers and LBs are not silently classified as booster helpers or subject to the wrong rules.
- [ ] Missing lockout evidence stays unknown; current saved status is not reused as historical proof.

### Rules and attribution

- [ ] Boundary tests cover 2 versus 3 wipes on a boss and 5 versus 6 across the run; staff escalation remains separate.
- [ ] Early exceptions require supporting attribution, not merely 1% boss health or multiple deaths.
- [ ] Wipe-call/unrecoverable cutoffs exclude downstream deaths from new charges.
- [ ] One mechanic causing death then wipe is not charged as both 0.5 and 1; independent incidents remain separate.
- [ ] Wrong calls, invalid assignments, unavailable abilities and unsupported snapshots yield reviewable limitations.
- [ ] 0.5 + 0.5 = 1 and 2.5 remains 2.5; final entitlement cannot silently become negative.
- [ ] A low parse alone causes no automatic fine; replacement recommendation uses the agreed conditions.
- [ ] Replacement incoming pay and outgoing entitlement are distinct, with no invented stacking formula.
- [ ] RL is evaluated under applicable rules; no favored-player exemption exists.
- [ ] All three modes inspect kill pulls and wipes; a zero-wipe run still shows supported findings with explicit policy eligibility.
- [ ] An avoidable death on a kill pull in a zero-wipe run can be reviewed and deducted under the established 0.5-share rule without a trigger override, in every mode. Light may filter suggestions but cannot remove RL access to the incident.
- [ ] New reviews default to Normal. All numerical thresholds are editable by authorized admins with validated units/ranges, version history and effective settings; existing 3/6 values seed the standard activation policy.
- [ ] Light tolerates more than Normal for comparable supported findings; Strict adds configured scrutiny without weakening evidence requirements or automatically increasing shares.
- [ ] All findings exposes incidents below the mode suggestion threshold, with the reason; a presentation override is distinguished from a policy override.
- [ ] Strict damage/healing checks account for role, assignment, opportunity and raid demand; unavailable checks and low-output observations do not become invented fines.
- [ ] Mode changes preserve incident identities and prior decisions, show a difference preview and cannot duplicate, silently apply or erase deductions.
- [ ] Admin edits and per-run mode choices retain versions, resolved settings, actor/time and reason; published changes do not rewrite historical runs.
- [ ] High overall parse with low boss damage produces a contextual priority review where supported; neither metric alone proves padding.
- [ ] Required add duty, boss immunity and incidental cleave are correctly distinguished from supported off-priority choices; extra useful add damage alone does not cause a deduction.
- [ ] Cooldown-hold findings require supported readiness, opportunity and timing evidence; unknown cooldown reductions/resets or target intent remain limitations.
- [ ] Synthetic and representative cases cover lost boss opportunities, justified add cooldowns, different spec/assignment contexts, repeated target-priority failures and unknown target classification on both kill and wipe pulls.
- [ ] No standalone padding tariff or duplicate padding/low-boss/cooldown penalty is invented; each applied deduction references an approved rule and demonstrated impact.

### Review, audit and integration

- [ ] Every generated suggestion, rejection, edit, confirmation, application and reversal is traceable to actor/time/evidence/version.
- [ ] Manual adjustments survive scans and conflicting changes require resolution.
- [ ] New policies do not silently rewrite old reviews; changed current inputs mark affected decisions stale.
- [ ] Two reviewers and repeated completion requests cannot double-apply or silently overwrite deductions.
- [ ] Refresh/restart preserves durable drafts; cancelled/failed captures are not reported as clean scans.
- [ ] Step 2 shows received shares separately from deducted shares, with evidence-linked reasons.
- [ ] Step 3 restrictions remain separate decisions; populated Step 4 previews match actual intended delivery.
- [ ] Local demo cannot send real messages, alter roster, close a real run or claim actual payout.
- [ ] Application succeeds independently of notification retry; message retries do not duplicate financial effects.
- [ ] Attendance implements 70/30 or 100% eligibility correctly, excludes deducted recipients and RL from the booster pool, conserves gold and uses the agreed rounding/weighting.
- [ ] Appeal sequence and post-payment 24-hour RL refund obligation remain distinct from original application.
- [ ] Permissions, retained evidence and unsupported-data states are tested with realistic integration failures.
- [ ] Reused Grimoire code has recorded provenance/version and Eden-side validation; delivery runs without the live Grimoire checkout, and no Grimoire files or configuration are changed by this work.

## 6. Open questions and decisions for review

Established policy above stays established. These questions settle missing definitions, not whether to reapprove Marco's accepted amounts or Mike's corrections.

### 6.1 Mike / management decisions

| ID | Undecided | Recommendation or review consequence |
| --- | --- | --- |
| O01 | When one boss reaches 3 wipes, does retrospective deduction review apply only to that boss or the whole selected run? | Confirm explicitly. Six run-wide wipes clearly activates the run threshold; do not invent the per-boss trigger's scope. |
| O02 | Must all analysis/review be complete before closing, or can RL complete manually with a reason? Who can override? | Block invalid targeted applications; propose documented manual fallback for unavailable analysis. Whole-run blocking requires a policy decision. |
| O03 | Which initial raid, bosses, difficulties, formats and patch snapshots must first release support? | Start with a small audited encounter set and state coverage visibly. Choose examples and expected cases before detector work. |
| O04 | Which resets, instant aborts, deliberate wipes and incomplete captures count as wipes? What constitutes one boost across shifts/cycles? | Establish countable attempts and session units before enabling trigger-based suggestions. |
| O05 | Do voice/preparation/attendance/conduct penalties apply before performance activation? Per incident, pull or run? What warnings are required? | Fixed amounts are agreed; applicability and frequency are not. Define each violation and overlap explicitly. |
| O06 | What counts as a severe removal offense? How do existing incident deductions interact with half/full-cut decisions? | Use explicit final entitlement until a consistent calculation is agreed. Do not add the same loss twice. |
| O07 | Do ordinary missed bosses/wipes change participation pay, and by what formula? How does that overlap with a 1-share attendance offense? | Do not adopt the older proportional attendance formula without approval. |
| O08 | Maximum removed shares; treatment of totals above entitlement; half of a fractional base; whether bonuses affect the cap | Preserve half-share penalty totals and resolve impossible/finer-fraction entitlements explicitly. No negative cuts or upward rounding by default. |
| O09 | How do eligible boosters split the redistribution pool: equally, by base/retained shares or another weighting? What if nobody qualifies? | Require a written formula, gold rounding unit/remainder recipient and no-recipient policy before settlement automation. |
| O10 | Does an attendance/replacement partial cut count as a disciplinary deduction for redistribution exclusion? What about helpers/LBs, shared leads and mixed bonus/deduction cases? | Represent classification and eligibility separately; lower received shares alone should not silently answer this. |
| O11 | Below-50 parse averaging window, qualifying pulls and comparison metric; proof that raid DPS is lacking | Define context and sample minimum. Treat missing parses as unavailable, not zero. |
| O12 | Exact pretrigger causation criteria for damage-shortfall 1% wipes and healing deaths | Require manual review initially; automated blame needs validated evidence rules. |
| O13 | Does 14 boosters / 2 LBs apply to every run type? Who can approve exceptions and where are they recorded? | Live custom capacities do not amend the policy. Obtain an explicit scope/exception model. |
| O14 | Applicable loot requirements, universal LB/helper rates, and the contextual minimum-4-loot-items statement | Only the specific saved-replacement 3-share option is currently settled. |
| O15 | Appeal deadline, evidence retention beyond payout, access to recordings, and recording-unavailable behavior | Establish retention and review access before production. Existing 60-day roster history is not automatically the deduction retention policy. |
| O16 | Who can confirm an RL's own deduction or an appeal involving staff? | Propose independent staff confirmation for disputed/conflicted cases; final role policy is not settled. |
| O17 | Who publishes rules, approves overrides, reviews other RLs' runs and handles settlement? When do rule changes take effect for open runs? | Pin versions and record effective time; designate authorities before multi-user deployment. |
| O18 | Pilot acceptance target for false attribution, missed incidents, review effort and analysis latency | Define before pilot promotion; do not claim precision from synthetic tests alone. |
| O19 | Refund accounting after distribution: who records payment, how gold pool history is corrected, and whether recipients retain original proceeds | The RL's 24-hour personal refund responsibility is settled; secondary accounting is not. |
| O20 | Exact initial thresholds, severity categories, mistake tolerances, detector coverage and contextual output settings for Light/Normal/Strict | Normal is the approved default and all thresholds are admin-adjustable. Review remaining initial numeric presets against examples; mode selection does not introduce share multipliers. |
| O21 | Who may choose Strict or switch modes, when selection is allowed, whether a mode-change reason is required, and whether the selected mode must be announced beforehand | Propose one visible run-level mode with an audit trail and a difference preview. Do not silently let a change reprice reviewed or completed runs. |
| O23 | Definition and standalone share amount, if any, for padding, unjustified cooldown holding or low boss contribution without the already-defined death/wipe impact | Detection/review is requested; an additional tariff is not yet supplied. Apply existing rules only where their conditions hold, otherwise provide a non-monetary review finding. |

**Resolved O22 — Mike, 24 October 2026:** RL may deduct qualifying kill-pull mistakes before the wipe threshold, including zero-wipe runs. Normal is the default mode. All thresholds are adjustable by admins. The initial 3/6 activation values continue for standard threshold-based review unless changed through versioned configuration; independent kill-pull permission applies in every mode. No additional ordinary early-wipe permission was specified.

Highest priority for Mike's review: O01 (scope), O02 (fallback), O03 (first coverage), O05–O08 (calculation), O09–O10 (redistribution), O13 (format exceptions), O20–O21 (mode details) and O23 (padding offense/tariff). Unresolved financial rules can remain manual in an early local prototype, but must not acquire hidden defaults.

### 6.2 Eden developer questions

| ID | Information needed | Why |
| --- | --- | --- |
| D01 | Stable run/account/character identifiers, roster/history/customer read APIs and role permissions | Implement an adapter without scraping the UI or guessing ownership. |
| D02 | Historical lockout timestamps, character-swap/replacement linkage, explicit start/end times and bot requirement snapshots | Reconstruct relevant context accurately. |
| D03 | Draft autosave, editing lock acquisition/expiry, run revisioning and concurrent completion behavior | Avoid losing edits, holding roster locks during scans or overwriting changes. |
| D04 | Share precision, base entitlement, type semantics and replacement/bonus storage | Map review results correctly; confirm half-share support. |
| D05 | Actual completion transaction, audit hooks, Discord/DM delivery and retry behavior | Define exactly when a deduction is applied and avoid duplicates. |
| D06 | Populated restriction controls and message previews, including silent mode | Preserve current product behavior without testing on an open real run. |
| D07 | Attendance pricing, existing RL cuts, deduction pool implementation and payout/refund ledger | Integrate redistribution without breaking accounting. |
| D08 | Existing WCL client, access modes, credentials management, rate budgets, caching and jobs | Reuse supported infrastructure instead of duplicating it. |
| D09 | Hosting/runtime/database/UI conventions, deployment and rollback expectations | Choose a local stack and deliverable compatible with Eden. |
| D10 | Bot helper/replacement records and Discord access, if later needed | Prefer structured existing records; free-text parsing and auto-DMs remain separate scope. |

### 6.3 Claude review checklist

1. Check the established-policy section against Mike's latest corrections; do not import superseded rounding or 30% redistribution wording.
2. Review the attendance overlap, especially proportional pay, unknown participants and account-link side effects.
3. Challenge attribution, duplicate-charge handling, cutoff logic and missing-evidence behavior.
4. Review open O01–O21 and O23, respecting the resolved O22 decision. In particular, distinguish review sensitivity from evidence requirements, trigger applicability and share tariffs; review the add-padding exceptions and cooldown-readiness limits.
5. Review Grimoire reuse boundaries and whether the standalone deliverable is realistically integrable.
6. Confirm the implementation phases include real review UI, admin configuration and durable audit, not only a log parser.
7. Return revisions and decisions for Mike. Do not start building from this document alone.

## 7. Sources, handoff and existing artifacts

### Source precedence

Mike's latest explicit decisions → consolidated accepted rulebook → observed UI facts for integration → proposed architecture/older packets → historical examples. UI settings and historic deduction amounts cannot silently change accepted policy. This packet records the newer v1.2 kill-pull/default-mode/admin-threshold decisions; older supporting rulebook files may not yet include those additions and must not override them.

### Supporting local research (not uploaded)

The approved rules and website findings needed to review this plan are consolidated above. Mike also holds the following supporting material locally; these are not repository links or required dependencies for reading this packet:

- Accepted detailed rulebook and concise rules, with earlier wording superseded by the newer decisions recorded here.
- Historical Discord findings and the original 257-message channel export. History is evidence of past practice, not authoritative tariffs; raw messages and player data are not included in this PR.
- A structured website-observation record, two exported stylesheets and their source manifest. Stylesheets are visual references, not recovered application components.
- An incomplete preliminary Eden scaffold, frozen and not uploaded. It has no finished review/admin UI, durable audit, representative test validation or production integration. Its defaults are not approved requirements. Do not treat this review as permission to resume it.

The browser inventory exposed 40 JavaScript assets; none was downloaded through the available asset exporter. No backend, database schema, credentials or complete application source was extracted. No real WCL scan was performed for the inspected open run. No booster identities, raw reports, recordings, screenshots or application code are included in this publication.

### Shared planning references, read 24 October 2026

- [HANDOFF.md](https://github.com/MTV6/eden-planning/blob/main/HANDOFF.md), read revision `2f75c2dd3ea4d48be84f06114575c4b237c24ae6`.
- [AGENTS.md](https://github.com/MTV6/eden-planning/blob/main/AGENTS.md), read revision `61bd75d2121392e355450695ca1d5a909808ce7f`.
- [decisions.md](https://github.com/MTV6/eden-planning/blob/main/decisions.md), read revision `16891c2085c4b6cf234b9ffc505ce9221aaff1ec`.
- [Attendance packet](https://github.com/MTV6/eden-planning/blob/main/packets/attendance-check.md), read revision `7d2f43ec9370eb8c3506ea749074ad7826b6340a`.

The Grimoire local repository was inspected read-only, including its instructions and canonical analysis contract. Candidate module paths above are reconnaissance references, not a promise of compatible reusable components or an immutable source revision.

### Review performed on this packet

- Cross-checked accepted amounts, triggers, half shares, replacement discretion, RL eligibility and refunds against the consolidated rulebook and Mike's latest clarifications.
- Reconciled the live four-step completion flow with the older attendance packet; retained unresolved partial-pay and attendance questions instead of adopting its example formula.
- Checked the separation between visible UI evidence and backend assumptions, and between observations, fault hypotheses and deductions.
- Added explicit unresolved trigger scope, fractional half-cut, redistribution classification, retrospective evidence and completion-concurrency cases.
- Verified local supporting links and the question/acceptance-check structure. These document checks do not validate any application code or live integrations.

Mike authorized publishing this v1.3 packet to `MTV6/eden-planning` for Claude's review through a documentation branch, pull request and labelled handoff issue. Publication is for review only: do not merge or start implementation without Mike's direction. The local master and this repository edition have the same requirements; this edition replaces local-only source links with descriptions so it is self-contained.

### Review outcome to record next

Record each accepted change with decision ID, exact wording, decision owner and date. Version the master packet, retain the decision history and list remaining manual-only paths. Building remains paused until Mike gives an explicit instruction to start.

### Revision history

- **1.0 — 24 October 2026:** Consolidated accepted rules, live website inspection, architecture, handoff phases and open decisions into one review packet.
- **1.1 — 24 October 2026:** Added Mike's Light/Normal/Strict mode request, explicit kill-pull and zero-wipe-run findings, configurable admin presets, contextual strict performance review, mode audit/versioning and O20–O22. Exact thresholds and additional pretrigger authority remain undecided. No application code changed.
- **1.2 — 24 October 2026:** Recorded Mike's approval of pretrigger kill-pull deductions, Normal as default and admin-adjustable thresholds (resolved O22). Added boss/add damage-priority and cooldown-holding analysis, contextual exclusions, admin configuration, evidence contracts and acceptance criteria. Added O23 for an unassigned padding tariff. This entry supersedes v1.1's uncertainty about kill-pull permission/default mode. No application code changed.
- **1.3 — 24 October 2026:** Recorded Mike's explicit Grimoire boundary: modules and inspiration may be reused, but Grimoire remains unchanged. All copying, adaptation, packaging and tests belong in Eden; removed the suggestion of extraction that could require Grimoire modifications. No application code changed.
