# Historical deduction comparison: scope and evidence requirements

24 October 2026 · Codex · redacted engineering notes, not new community rules.

Mike supplied a mixed WCL report, a website roster screenshot and screenshots of a paid distribution with seven deductions. He explicitly said the deductions might be wrong. Original report identifiers, characters, screenshots and notes remain local under the ignored application data directory. Historical decisions must not become verified labels or automatic suggestions.

## Verified observations

Metadata retrieval found thirteen candidate groups across nineteen boss/encounter entries, including unrelated earlier raid groups and a later dungeon. Only one group matches the supplied run roster: two final-boss wipes and one kill. Nine of thirteen original paid-roster characters match those three pulls; four are absent. Both listed replacement helpers and both rostered lootbodies appear in the matching pulls. Absence from this partial recording does not establish a no-show, disconnect, alt swap or replacement cause.

The matching final-boss segment starts well after the scheduled run start and does not contain the earlier bosses of the three-hour run. The automatic candidate selector appropriately returned no selection: the average original-roster match is below its current suggestion threshold and the segment starts outside its time window. Replacement helpers explain some continuity but do not verify account ownership.

The seven displayed share reductions total thirteen shares relative to the displayed eight-share base. Seven reduced recipients, six full recipients and two helpers reconcile to the displayed ninety-four paid shares. This is arithmetic reconciliation only. The larger reductions mix replacement language and possible discretionary adjustments; they are not necessarily thirteen incident penalties. Several explanations are truncated. The policy version effective on the historical run is unknown.

## Required evidence by allegation

| Allegation | Minimum investigation |
| --- | --- |
| Missed interrupt or stun | Correct enemy cast and ability eligibility, assignment, timing, availability and relevant control effects. Voice instructions require recording or reviewer attestation. Interrupt and stun are not interchangeable. |
| Disconnection causing a wipe | Specific activity gap and missed mechanic, chronology and recoverability. Inactivity is insufficient proof of a disconnect or causation. |
| Replacement adjustment | Participation before/after, replacement identity and historical payout terms. Keep entitlement adjustments distinct from mechanic deductions. |
| Mechanical failures plus weak healing | Individual incident timestamps plus effective healing, assignments, damage demand, deaths and available responses. Low HPS alone is not a verdict. |
| Tank movement during a buster | Movement ability, boss cast and target, aggro, damage/death sequence and strategy. Movement alone is insufficient. |
| Alleged AFK during transition | Phase interval, required action/position, activity and assignment. Logs alone may not establish positioning or intent. |

## Implications for the next implementation slice

1. Store historical decisions separately from detector findings and confirmed local decisions. Preserve visible notes, truncation markers and source provenance.
2. Separate report-query completeness from whole-run coverage. A fully fetched three-pull segment can still be an incomplete run. Do not classify the whole run as below a wipe threshold merely because only two wipes are available; threshold status is unknown where missing pulls could change it.
3. Do not add unrelated groups' wipes to the run. Persist explicit inclusions/exclusions and explain the basis. Support complementary reports and replacement-aware scope review without silently merging identities.
4. Keep deductions, replacement entitlement, discretionary credits and helper shares distinct. Existing Eden payouts remain the authority; screenshot arithmetic does not prove correct penalties.
5. Each future detector should declare its required event types, actors, abilities, time windows and contextual dependencies. Fetch targeted evidence and retain enough supporting and exonerating context to review the conclusion. Missing inputs produce an explicit unassessed result.
6. Preserve unknown historical policy as unknown; do not retrospectively impose today's amounts or activation rules without reviewer direction.

## Storage and validation

The local structured transcription and review checklist occupy about 5.6 KB, excluding the 141 KB mixed-report metadata preview. That small case record is not a completed evidence bundle and does not demonstrate that a defensible full-run analysis will fit in 5.6 KB. No event stream was captured for this case.

The prior complete live capture remains the baseline for future selective-query validation. Compare supported findings and their required context before deleting broad captures. Measure both stored bytes and API points; compact output alone does not reduce acquisition cost. This note records requirements only: selective acquisition, retention changes and historical comparison UI are not yet implemented.

## Missing inputs

- Full-run or complementary report covering the earlier bosses and removed players.
- Full text of truncated deduction reasons.
- Historical policy and replacement/credit terms.
- Relevant voice calls, assignments and independent review where the raid leader deducted themselves.

Until these are available, no determination that any historical deduction was correct or incorrect is justified by this metadata check.
