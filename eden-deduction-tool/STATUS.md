# Eden deduction module — review handoff

Updated 24 October 2026 by Codex. Version 0.5.0; local prototype, not deployed to Eden.

## Working now

- Evidence-linked manual deduction review and imported example proposals, accept/reject, exact half-share totals and explicit whole-share rounding.
- One standard policy, editable versioned rules/thresholds, policy snapshots pinned to runs, durable SQLite audit and deduction-only JSON export.
- WCL server-side OAuth, report metadata, editable mixed/split-report grouping, selected kill and wipe capture, pagination, raw evidence retention, duplicate checks and participant classifications.
- Capture progress, cancellation, restart interruption handling and evidence timeline. Unknown people remain unclassified and cannot be deducted.
- WCL credentials copied locally with Mike's authorization; live OAuth verification passed. Grimoire remains unchanged and Eden runs independently.

## Verification and limits

Latest milestone: **59 tests pass**. Explicit helper/buyer/LB/booster classification, staged roster matching, confirmed alt ownership, death-review cards and an initial Heroic Ula’tek pack are implemented. Generation reuses captured pages with no new WCL calls; facts and prior snapshots are retained compressed and audited. Conditional rule amounts require human review. See `MILESTONE-4-DEATH-REVIEW.md`.

The second historical case now has a complete selected capture of 18 unique pulls (ten kills, eight logged wipes), 329 pages and 3,216,440 events. It produces 106 eligible death cards and three initial pack observations. Twenty-three LB and 132 unknown death events are excluded from candidates; the unknown characters still need buyer/helper/alt classification. No real deduction was accepted or applied. Earlier milestone notes below describe the stages when only metadata/search had been tested.

Previous search milestone: **45 tests passed**. Missing-log discovery was tested on the second historical Eden run: all 13 expected characters searched; five candidate reports from four uploaders found. The strongest candidate matches all 13 characters on a pull, overlaps all three known final-boss pulls and offers eight additional candidate kills plus six wipes. A repeat browser search used zero new queries and 28 cache hits. Loading that candidate identified all three overlapping pulls and left the fresh selection empty for manual review. No events or deductions were imported by this search. See `MILESTONE-3-MISSING-LOGS.md`.

35 automated checks passed again before publication and after the capture-limit fix. The first authorized real Eden report was successfully captured: ten Heroic kills, zero recorded boss wipes, 273 pages and 2,679,804 raw events. Fourteen supplied roster members were matched; thirteen other characters remain unclassified. All stored-page hashes, terminal cursors, manifest event totals and the audit chain checked out. The review remains a local draft with zero deduction suggestions. Its 69 recorded deaths are evidence, not 69 proven mistakes.

The first attempt failed closed at the 500 MiB uncompressed capture limit; no partial review was created. Increasing that limit to 2 GiB allowed all ten pulls (905,713,426 uncompressed bytes) to finish. The five-million-event limit remains. See `LIVE-VALIDATION.md` for the redacted verification record. That initial validation covered one kill-only report; the second mixed report and wipe capture are now verified as described above.

The initial Ula’tek pack recognizes a small set of cast/movement observations. General wipe attribution, padding, boss-damage priority and cooldown-holding detectors are not implemented. Live imports begin with evidence and no invented deduction proposals. The sample run's proposals are synthetic. An event or death alone does not establish fault.

Confirmation is local and exports always say `appliedToEden: false`. Nothing changes an Eden roster, closes a run, sends Discord messages or applies deductions. Local actor labels are not production authentication. Audit integrity checks are not tamper-proof storage. Suggested and locally confirmed decisions are logged; production application receipts are not implemented.

## Next work

1. Confirm buyer/helper/alt identities for unresolved characters; keep unknown people excluded from deduction candidates.
2. Review the Doomscale assignments and tank-movement evidence in the historical draft. Accept only supported incidents under the pinned rules.
3. Have an encounter expert review the initial Ula’tek pack before expanding spells, difficulties or phase/crossing logic.
4. Keep real evidence private and define production retention, permissions and background analysis jobs.
5. Add contextual damage-priority analysis, then an Eden adapter with authenticated permissions and idempotent application receipts when developers provide contracts.

## Policy and integration still open

- Whether one boss reaching three wipes retrospectively activates mistakes on other bosses; the prototype activates that boss only, with six total wipes as the separate run trigger. Kill-pull deductions remain independent.
- Frequency and pre-trigger applicability of fixed requirement offenses; prototype requires manual explanations.
- RL-targeted deductions need an independent staff workflow before export; final export currently blocks them.
- Padding offense definition/tariff, encounter pack owner and update process, recording consent/access/retention, and proposed booster appeal views.
- Existing Eden field mapping, cut constraints, role/identity permissions, application transaction and receipt contract. Eden continues to own cuts, replacement entitlement, gold, redistribution and refunds.

See the v1.4 master packet and `../eden-module-planning/IMPLEMENTATION-BASELINE.md` for the full decisions. Older three-mode proposals are superseded. `README.md` explains startup, local storage, contracts and limits. `MILESTONE-1.md` and `MILESTONE-2-WCL.md` record delivery evidence.

## Repository contents and collaboration

`npm start` runs `review-server.js`; active code is `src/ledger/`, `src/wcl/` and `public/`. Earlier disconnected scanner files/packs are retained as historical scaffolding and have superseded assumptions; do not connect them without review. Node 24+ is required; no third-party packages are needed.

Only source, synthetic fixtures and documentation are published. Credentials, `.env`, SQLite/raw evidence and local output are excluded. This branch builds on the v1.4 plan in PR #4 and leaves Claude's separate HANDOFF correction in PR #6 untouched. No merge or production deployment is performed.
