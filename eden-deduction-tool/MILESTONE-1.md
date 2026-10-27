# Local milestone 1 — verification record

24 October 2026 · Codex · local prototype, not production integration.

## Delivered

- One standard, pinned policy with admin-editable rule amounts and thresholds; new versions preserve previous runs.
- Validated v1 run JSON import and labelled synthetic sample. Imported proposals are not automatic detector verdicts.
- Kill/wipe findings filters, evidence chronology, manual incident entry, accept/reject and evidence-linked reasons.
- Exact half-share totals, explicit RL up/down rounding with no default, optional explanation, actor/time and invalidation after incident changes.
- Confirmation/reopening and deduction-only JSON output; actual Eden application is always false.
- Durable SQLite storage, optimistic run/policy revisions, transactional audit, duplicate incident-key protection and audit consistency checks.
- Blocking of buyer/LB deduction entry, unpriced padding observation acceptance and final RL-targeted export pending a staff workflow.

## Verification

`npm test`: 15 tests pass. Coverage includes zero-wipe kill deductions; combining halves; 3.5 rounding; no default; changed incidents; duplicate/stale writes; immutable policy snapshots; no padding tariff; pretrigger wipe exceptions; boss/run trigger scope; participant eligibility; confirmation/reopening; SQLite restart persistence; audit alteration detection; invalid imports; opaque imported identities; forged proposal linkage; local HTTP/origin behavior.

`node --check public/app.js`: passed.

Browser walkthrough: loaded synthetic run, accepted three fixture proposals, verified Aster 0.5 + 0.5 = 1, explicitly rounded Briar 0.5 up to 1 with an optional note, confirmed locally, published an unchanged policy as v2, inspected audit records and verified the confirmed run remained on v1. Restarted the server and reloaded: review and choices persisted. A screenshot is saved in ignored `output/review-preview.jpg`.

## Boundaries and next milestone

No live WCL capture, mixed-report resolver, cross-report account ownership, automatic mechanics/blame, padding detector, real staff authentication, appeal submission, voice recording storage, actual application receipts, Discord or gold handling is implemented in this milestone. Input coverage is import-declared, and local actor names are demonstration labels. Grimoire was not changed.

Next: validate the run/capture contract against authorized WCL evidence, retain complete raw-stream provenance, add scope/identity review and test mixed reports before enabling verified mechanic suggestions. Keep automatic attribution unavailable until pack evidence and negative cases are reviewed.
