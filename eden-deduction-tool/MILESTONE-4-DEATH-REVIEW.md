# Milestone 4: participant classification, death cards and initial Ula’tek pack

[Codex] 24 October 2026. Version 0.5.0. Local implementation requested by Mike; Grimoire unchanged. No code, credentials or files were taken from Grimoire for this milestone.

## Problem and proposal

Mixed boost logs include buyers, lootbodies, rostered boosters, helpers and character switches. Counting every death produces irrelevant candidates. Classify participants first, retain physical-character evidence, then present small rule-linked review cards and a limited encounter pack.

## User flow per role

The RL pastes Character-Realm lists from the roster, helper distribution or confirmed buyer/LB information. Unique exact matches are staged for review; unmatched people stay unclassified. Accents are preserved and normalized realm spacing is supported. Explicit character ownership links require an evidence note. There is no inference that a missing roster name is a buyer, or that the report uploader owns every character used while recording.

Save classifications, then generate review from an existing captured run. Booster, helper and RL deaths appear as cards; buyer/LB deaths are excluded, and unknown deaths appear separately for classification. Those deaths remain in the source capture and can still explain a wipe. Linking an alt routes responsibility and eventual incidents to the confirmed primary participant. Roles and ownership changes are audited. Accepted deductions must be withdrawn before an affected role or owner is changed.

Each death card shows its pull/outcome, event time, WCL window link, observed lethal hit/overkill, recent damage and effective heal-event totals, observed active defensive buffs/recent casts, debuff stacks and last recorded cast. Buff/debuff visibility depends on the recording; an absent observation is not proof of an unused ready cooldown. The defensive dictionary is a limited reference list, not a complete class capability or cooldown simulator. Large damage does not automatically prove an avoidable one-shot.

Mechanic cards show completed casts by individual add instance, earlier successful interrupts of that instance, recent control attempts and nearby deaths. A control attempt and a successful interrupt remain distinct. Pet interrupts retain owner attribution. Recent successes on another pull never clear a specific missed cast. The RL must select responsibility and confirm the context in the normal manual deduction form. The conditional amount comes from the run's pinned rule. No incident is added simply by generating or preparing a card.

The administrator/reviewer can change context, nearby-death and movement windows (1–30 seconds) before generation. Each snapshot records its settings and pack version. Shares and wipe activation remain in the existing versioned policy editor. These are local controls; production admin permissions are not implemented.

## Implementation notes

- `src/ledger/participants.js`: roles, exact list matching, ownership validation and responsibility resolution. Helper is an explicit eligible role; buyers and LBs remain ineligible. Direct ownership only; no link cycles or chains.
- `src/wcl/review.js`: streams existing compressed pages, verifies hashes/cursors/page/event totals and duplicate selection, derives facts, and filters them against current classifications. No new WCL requests. Captured facts are independent of role decisions so classifications can refresh cards without downloading or scanning again.
- `src/wcl/packs/ulatek.js`: initial Heroic encounter-ID/difficulty-scoped pack. Two Doomscale spells, Mother’s Wrath damage and Roll. IDs were observed in authorized evidence; their mechanical responsibility rules remain pilot interpretations. Other difficulties are intentionally outside the pack until tested.
- Ula’tek crossing/transition assignment recognition is still manual, supported by death/activity context. No validated automatic phase, positional crossing or disconnect detector is claimed.
- `wcl_reviews` keeps the latest fact projection; `wcl_review_snapshots` retains earlier generated snapshots, losslessly gzip-compressed, with hashes referenced by audit. Preparing a manual deduction includes the snapshot hash, card ID and WCL URL in its evidence note. Rebuilding never silently removes earlier snapshots. Existing raw capture retention is unchanged.
- A death and a related mechanic card use the same incident key for a player/pull, including confirmed alts, to prevent duplicate charging through these entry paths. Manually choosing a different incident key still requires reviewer discipline.
- Known wipe calls flag later evidence; those cards cannot prepare a new performance deduction. Missing wipe-call metadata does not prove the raid was recoverable. Short-reset classification is still manual.
- `GET/POST /api/wcl/review/:runId`: retrieve/generate review. Existing localhost/origin protections apply. Generation is synchronous; production background jobs/cancellation and retention policy remain future work.
- UI renders death cards in batches of 20 with pull/type filters. Generic evidence is preserved separately. Confirmation/export remain the existing deduction-only flow, with RL-targeted final export blocked pending independent staff workflow.

## Acceptance criteria and validation

59 tests pass. New coverage checks lethal context and healing, buff removal/pull-start auras, debuff stacks, distinct add instances, pet ownership, cast attempts versus interrupts, control-name false positives, long-fight response retention, scoped pack activation, wipe calls, buyer/LB/unknown exclusion, helper eligibility, linked-alt deduplication, pinned pricing, classification changes, stored evidence integrity, duplicate recording rejection, immutable snapshot history and protected HTTP endpoints.

The supplied historical run was tested using the deduplicated 18-pull capture: ten kills, eight logged wipes, 329 pages and 3,216,440 events. All 18 pulls remained unique; three duplicate recordings were excluded before capture.

With the supplied roster and two confirmed helpers: 106 eligible death cards, 23 excluded lootbody death events, and 132 unknown death events excluded pending classification. There are 24 unclassified characters and no confirmed buyer identities in this local case yet. Buyer exclusion is tested synthetically; it is not claimed that all 132 unknown deaths belong to buyers. Alt identities are unconfirmed and were not invented.

The pack found three observations: two completed Anguished Cry casts on the same Doomscale instance in one Ula’tek wipe, plus Roll between Mother’s Wrath hits on another wipe. The two failed casts have two and four eligible nearby death events respectively. The movement observation has seven eligible and eleven other nearby death events. These are temporal evidence, not automatic causal proof or three automatically approved deductions. The user identifies the P2 missed-interrupt complaint as the relevant raid-leader deduction; individual assignments/cooldown availability remain reviewer inputs.

The latest compressed fact projection occupies about 203 KiB; the database stores both the latest projection and retained snapshots. This is separate from raw event storage and does not mean the entire capture is 203 KiB. Browser tests verified helper-list matching (including an unmatched name), per-pull/type filters, preparation of a pinned-rule deduction with snapshot/WCL evidence, regeneration, and no console errors.

No historical deductions were accepted or applied during validation. Other tests use only synthetic people. Real identities, report codes, raw logs, database and screenshots stay local and are not published.

## Open questions for Claude / Eden developers

Review pack interpretation and spell coverage with an encounter expert; define assignments and ability availability before expanding automatic attribution. Confirm helper rule applicability, authoritative buyer/alt identity inputs, deliberate reset handling, production authorization, review retention and independent staff approval. Existing unresolved retrospective wipe policy remains unchanged. Padding, full cooldown reconstruction, exact phase/crossing detection and universal wipe-cause attribution are outside this milestone.
