# First live WCL capture — redacted verification

24 October 2026 · Codex · local prototype version 0.3.1.

Mike supplied an authorized report and a roster screenshot for a local evidence test. Report identifiers, character names, roster details and raw captured data remain in ignored local storage. None are included here.

## Result

- Live OAuth, report metadata and All-event GraphQL retrieval succeeded.
- One continuous Heroic boss group: ten kills and zero recorded boss wipes. All ten available boss pulls were selected; trash fights were outside the boss-pull scope.
- Fourteen supplied roster characters matched by character/realm. Thirteen additional report characters remain unclassified; no buyer, LB or booster assumptions were made for them. Twenty-seven is the union across pulls, not a claim about simultaneous raid size.
- 273 event pages; 2,679,804 raw events; 905,713,426 uncompressed page-JSON bytes. Stored compressed page payloads total 64,879,273 bytes (about 65 MB), excluding small database/index overhead. Run size varies; this is a measurement of this run, not a per-run guarantee.
- Raw-page content hashes recomputed successfully for every page. Per-pull manifest page/event totals matched stored pages and every selected pull ended with a null pagination cursor.
- All ten imported pulls have API-pages-complete markers. Report metadata fingerprint checks passed before and after acquisition. The audit hash chain verified.
- The timeline contains 69 player death events. These are factual event observations, not proven avoidable mistakes or deduction counts. Cast display is sampled; raw pages preserve the captured stream.
- The review remains a draft with zero automatic deduction suggestions. No deductions were confirmed, exported or applied. No live Eden changes or Discord messages occurred. Grimoire remained unchanged.

## Fix found by live data

The initial 500 MiB uncompressed capture ceiling was too low for this ten-boss report. Acquisition stopped after seven complete pulls and part of the eighth; no partial ledger review was created. Partial raw pages remain local for audit.

The ceiling was raised to 2 GiB; pages continue to be processed individually and stored compressed. The five-million-event budget, pagination checks, stale-report rejection and incomplete-import guard remain. The full retry succeeded. All 35 automated tests passed again after the fix.

## What this does not validate

This is one stable, kill-only report. Mixed/split report grouping, live wipe chronology, ambiguous scopes, private-report authorization and production Eden integration were not established by this test. Mixed/wipe logic has fixture coverage and needs representative live cases.

API-complete retrieval does not prove that the recorder observed every event. There is no automatic mechanic blame, wipe-cause attribution, padding tariff or damage-priority verdict yet. Roles, strategy and context still require review. Local reviewer labels are not production authorization.
