# WCL connection and all-pull evidence import

24 October 2026 · Local implementation; OAuth authentication verified; real-run capture validation pending report input.

## Added

- Local verified API-client setup, server-side OAuth and token caching, safe error messages and bounded retries.
- Public/accessible-unlisted report metadata, all boss kills and failed attempts, incomplete/in-progress flags and report-local identity handling.
- Editable mixed-report session groups using gaps, roster continuity, repeated boss kills and difficulty. Expected roster/time context highlights a clear candidate without selecting it automatically; ambiguous groups remain unselected.
- Up to four reports combined; likely overlapping captures require keeping one recording per pull. Exact character/realm identity is distinct from Eden account/alt ownership.
- Explicit participant classification, including unclassified people who cannot receive deductions. Role changes are audited and require withdrawing prior deductions first.
- Confirmed pull scope launches an async capture of unfiltered All events for every selected kill and wipe. Empty continuation pages are followed until a terminal null cursor. Raw pages and legitimate identical events are preserved.
- Report snapshots/fingerprints, scope decisions, job progress/cancellation/interruption and raw gzip event pages persist in the ignored local SQLite store. Failed/partial jobs do not create complete reviews. Report changes prevent stale evidence import. Interrupted captures are manually retried from the start.
- Completed captures create an idempotent linked ledger review with no invented deduction suggestions. Death chronology, recent damage context, bounded cast sample and WCL links support manual review. Known Companion wipe-call times are shown; evidence entirely after that call cannot establish a new performance mistake.

## Verification

35 automated checks pass, including the original ledger tests and mocked WCL transport tests for session splits, multi-report duplicates, unknown/region-qualified identities, kills/wipes, empty continuation, repeated raw events, stalled pagination, full-stream provenance/chronology, raw persistence, stale revision rejection, policy pinning during acquisition, cancellation/restart, credential redaction/persistence, 401 refresh, 429 retry, role classification, wipe-call cutoff and HTTP integration.

Official schema/auth references used:

- https://www.warcraftlogs.com/api/docs
- https://www.warcraftlogs.com/v2-api-docs/warcraft/report.doc.html
- https://www.warcraftlogs.com/v2-api-docs/warcraft/reportactor.doc.html
- https://www.warcraftlogs.com/v2-api-docs/warcraft/reportfight.doc.html
- https://www.warcraftlogs.com/v2-api-docs/warcraft/eventdatatype.doc.html

## Still required for a real-run test

Mike authorized copying Grimoire's existing WCL credential pair into Eden's ignored local credential store. The copy was verified through the official OAuth endpoint, both stored values matched the source, and the Grimoire source file was checked unchanged. No credentials or tokens are included in this repository or this report. Each application manages its own token; Eden does not read the Grimoire checkout at runtime.

Supply authorized report links, approximate run time and/or roster hints for the next test. OAuth success establishes authentication only. The 35 automated tests use mocked report/event responses and do not establish live GraphQL query compatibility, real-run capture success or complete recorder coverage. No Grimoire files were changed.

This connects evidence retrieval and run selection, not automatic mechanic attribution. Private-report user OAuth, archive subscriptions, live mutable reports, verified account/alt ownership, encounter packs and padding detection are not implemented by this slice.
