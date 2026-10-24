# Eden deduction module — review handoff

Updated 24 October 2026 by Codex. Version 0.3.0; local prototype, not deployed to Eden.

## Working now

- Evidence-linked manual deduction review and imported example proposals, accept/reject, exact half-share totals and explicit whole-share rounding.
- One standard policy, editable versioned rules/thresholds, policy snapshots pinned to runs, durable SQLite audit and deduction-only JSON export.
- WCL server-side OAuth, report metadata, editable mixed/split-report grouping, selected kill and wipe capture, pagination, raw evidence retention, duplicate checks and participant classifications.
- Capture progress, cancellation, restart interruption handling and evidence timeline. Unknown people remain unclassified and cannot be deducted.
- WCL credentials copied locally with Mike's authorization; live OAuth verification passed. Grimoire remains unchanged and Eden runs independently.

## Verification and limits

35 automated checks passed again before publication. Report/event tests use fixtures. A real Eden report has **not** been captured or reviewed yet. Authentication success does not establish real GraphQL ingestion success.

No automatic encounter mechanic, wipe-cause, padding, boss-damage priority or cooldown-holding detector is implemented. Live imports begin with evidence and no invented deduction proposals. The sample run's proposals are synthetic. An event or death alone does not establish fault.

Confirmation is local and exports always say `appliedToEden: false`. Nothing changes an Eden roster, closes a run, sends Discord messages or applies deductions. Local actor labels are not production authentication. Audit integrity checks are not tamper-proof storage. Suggested and locally confirmed decisions are logged; production application receipts are not implemented.

## Next work

1. Supply an authorized real Eden report (multiple reports where useful), approximate start and roster hints.
2. Verify actual metadata/schema, manually confirm mixed-report scope and player roles, capture every selected kill and wipe, and compare coverage with WCL.
3. Keep a redacted verification report; do not commit captured reports, rosters, databases or recordings.
4. Build a small reviewed encounter pack only after identifying the raid/patch/difficulty and agreeing evidence-backed mistakes. Validate cause and context before suggesting shares.
5. Add contextual damage-priority analysis, then an Eden adapter with authenticated permissions and idempotent application receipts when the website developers provide contracts.

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
