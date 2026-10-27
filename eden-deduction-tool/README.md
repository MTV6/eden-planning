# Eden deduction review — local ledger and WCL evidence import

**Developer: start with the [current handover](../DEVELOPER-HANDOVER.md) and [progress/build order](../PROGRESS-AND-BUILD-ORDER.md).** Updated 25 October 2026; current prototype v0.5.0.

A local, deduction-only review ledger with a WCL evidence importer. One standard policy, evidence-linked decisions, exact half-share totals, explicit RL rounding and a durable audit history. It does not apply anything to Eden or automatically attribute mechanic blame. Version 0.5.0 adds role-filtered death cards and a limited Ula’tek observation pack.

## Run

Use Node.js 24 or later (validated on 24.19.0). No npm packages are required. Synthetic/local JSON review needs no credentials; live WCL import requires an API client ID and secret.

```powershell
cd "C:\Users\super\Documents\ChatGPT\Discord Project\eden-deduction-tool"
npm start
```

Open http://127.0.0.1:4317 and click **Load sample run**. `npm test` runs the policy, persistence, concurrency, rounding and HTTP checks. The built-in Node SQLite API may emit an experimental warning on some Node versions.

## Connect a real Warcraft Logs report

1. Open **Warcraft Logs** in the sidebar. Create your WCL API client using the [official instructions](https://www.warcraftlogs.com/api/docs).
2. Enter its ID and secret into the local connection panel, then **Verify and save locally**. Do not paste secrets in chat. Verification exchanges them only with WCL's official OAuth endpoint; the server never returns credentials to the browser. They are stored as local plaintext in ignored `data/wcl-credentials.json`, not in an encrypted vault. Alternatively supply `WCL_CLIENT_ID` and `WCL_CLIENT_SECRET` through the server environment or `.env`. A saved connection takes precedence over environment credentials.
3. Enter up to four report links/codes. Optional character–realm hints and an ISO start timestamp with explicit timezone offset help distinguish sessions. Grouping gap/roster settings are visible and adjustable.
4. Load metadata. The importer lists every boss pull, including failed attempts, and proposes groups. It does not select or fetch events automatically. Add relevant groups, then include/exclude individual pulls. If two uploads appear to contain the same pull, select only one recording. In-progress/unknown-outcome pulls cannot be captured.
5. Review participant classifications: booster, RL, LB, buyer or unclassified. Unclassified characters cannot be deducted. Exact character/realm matches across reports are unified, but alt/account ownership is not verified. Unknown realms stay separate.
6. Confirm the selection, enter the review title and **Capture selected kills and wipes**. Progress shows pulls/pages/events; cancellation leaves partial evidence unimported. Jobs and selections survive refresh; interrupted jobs can be restored and manually retried. Retries currently recapture from the start rather than reuse partial pages.
7. Open the completed review. The timeline shows deaths, recent damage context and up to 150 player casts per pull; all captured events remain in compressed raw pages. Filter the timeline or attach an event to the manual deduction form. A preceding hit is context, not verified killing-blow or fault attribution.

The public API connection can read public/accessible unlisted reports. It does not implement user OAuth for private reports or subscription-only archive access. Captures fail if report metadata changes between selection and completion, pagination is incomplete/out of order, or the resource budget is exceeded. API completeness does not prove the recorder saw every action.

Current limits: four reports per metadata load, 200 selected pulls, 100 distinct known player characters, 5 million raw events and 2 GiB uncompressed event-page JSON per capture. The byte limit was increased from 500 MiB after a real ten-boss report exceeded it; pages are processed individually and stored compressed. These are local resource limits, not game-policy thresholds. Boss groups use encounter/difficulty identities, not only names. Very short deliberate resets remain logged failed attempts until the RL resolves the applicable wipe-count policy.

`data/ledger.sqlite` now also contains report snapshots, selected scope, jobs and gzip-compressed raw event pages with content hashes. Capture links record report revision, fetch time, selection confirmation, fight identity and completeness. Secrets are stored separately and are not included in capture, audit or deduction output. Do not publish either file. This ingestion implementation is Eden-owned and does not depend on or modify Grimoire.

## Find missing logs from other uploaders

After loading metadata, select known pulls from the boost and expand **Find missing logs**. Enter the expected Character-Realm roster and start/end timestamps with explicit timezone offsets. Search uses WCL character report histories, prioritizing characters missing from the selected pulls. Review the time window carefully for mixed uploads.

The default searches six characters and two history pages per character; controls allow up to 40 characters and three pages. Results explain roster overlap, matching known pulls and additional candidate kills/wipes. Hidden characters, unavailable histories, errors and search limits remain visible. An empty search does not prove no other recording exists.

Load a candidate to inspect its metadata alongside the current reports (four reports maximum). This creates a fresh selection: inspect each pull, choose one recording for overlapping pulls and classify participants again before capturing events. Search never imports events, attributes fault or changes deductions. Overlap warnings allow 15 seconds of recorder clock skew and compare encounter, difficulty, outcome and roster.

Search results and history persist locally. History/report metadata are cached for ten minutes; realm directories for 24 hours. Each search is bounded to 60 logical query units, 16 candidate reports and two minutes; retries and WCL point costs are separate from the query count. Cached searches can use zero new queries. Expired cache rows refresh on reuse; automatic cleanup is not implemented. Results contain personal data and must stay out of GitHub. See `MILESTONE-3-MISSING-LOGS.md` for validation and limitations.

## Classify players and review deaths

Open a captured review and expand **Review participant roles**. Paste an Eden roster or helper/buyer/LB list, stage unique Character-Realm matches, review and save. Unknown characters remain unknown. Helpers are eligible for review. Confirmed alts can link directly to a booster/helper/RL with an ownership note; do not guess ownership from a shared report.

Choose **Generate review from capture**. The new cards scan existing saved evidence without WCL requests. Buyer/LB/unknown deaths are excluded from deduction candidates; unknown deaths remain available for classification. Death cards show timed WCL links, lethal damage, recent healing, observed defensive use and debuff stacks. Cooldown readiness and avoidability remain unknown unless separately established. Pull/type filters and batches of 20 keep review manageable.

The initial Heroic Ula’tek pack recognizes two Doomscale cast failures by add instance and Roll during Mother’s Wrath damage. Review assignment and consequences before choosing the responsible player. **Prepare deduction for review** fills the manual form with evidence and a pinned-policy rule; it does not accept a deduction. One shared incident key prevents charging both a related death and mechanic card to the same player, including confirmed alts. Snapshots/settings are retained and audited; earlier snapshots survive regeneration. See `MILESTONE-4-DEATH-REVIEW.md` for tested scope and remaining gaps.

## Try the workflow

1. Load the synthetic zero-wipe run. Its proposals are explicit fixture inputs, not automated detection results.
2. View pull evidence; accept or reject each priced proposal. Aster's two separate 0.5 incidents combine into 1. Briar's single 0.5 needs an explicit down/up choice.
3. Add manual deductions with a rule, pull, incident key and supporting evidence. The same incident key for a player/pull cannot be charged twice. A voice violation can be separate from a mechanics incident using an explicitly different key.
4. Choose whole-share rounding only after summing each player's incidents. There is no default. A reason field is available but optional pending policy approval.
5. Confirm the deduction list and download JSON. Confirmation is local; `appliedToEden` is always false. Base cuts, gold, replacement entitlement and payouts are not calculated here.
6. Open **Rules & thresholds**, change a validated rule or threshold and publish with a reason. Existing runs stay pinned to the original version; new imports use the latest. Configuring a new rule creates a manual rule, not an automatic detector.
7. Review **Audit history**. Every imported suggestion, decision, removal, rounding choice, policy publication, reopening and confirmation is recorded. Removing an incident retains its history and reopens its original proposal.

## Data and integration contract

`examples/sample-run.json` is the portable v1 input fixture. Import the same JSON structure through the UI. This is not a raw WCL report or Discord export parser. IDs must be unique within their scope, events must belong to the referenced pull, names remain Unicode, and roles distinguish boosters, RLs, LBs and buyers. Imported coverage claims are visibly unverified.

The export is `eden-deduction-proposal` schemaVersion 1. It contains per-player exact shares removed, chosen whole shares removed, rounding decision, individual rule amounts, reasons and evidence. Live imports also include WCL provenance. It does not replace Eden's distribution transaction or payout records. An adapter and real authentication are required before integration; the local reviewer label is user-entered demonstration metadata.

SQLite data is stored in ignored `data/ledger.sqlite` with WAL files. Set `EDEN_DB` to another path for a separate local store and `PORT` to change the listening port. The server binds to 127.0.0.1 and rejects cross-origin requests. Back up the database with SQLite-aware tooling or stop the server before copying all database files. Do not publish databases or imported private evidence to GitHub.

The audit hash chain is checked on load and can reveal inconsistent records. It is not tamper-proof against someone who controls the database. This milestone has no production authorization, dedicated booster view, recording storage, appeal submission, staff confirmation or real application receipt. RL-targeted deductions may be reviewed, but final export is blocked until an independent staff workflow is designed.

## Unresolved policy handling

- Kill-pull deductions are permitted even with zero wipes.
- On wipe pulls, standard activation uses the run threshold or the current boss's threshold. Retrospective scope across other bosses remains unresolved. Before-trigger damage/healing exceptions require an explicit reviewer explanation.
- Fixed requirement violations need a manual applicability explanation; the tool does not auto-decide unresolved frequency/applicability policy.
- No standalone padding tariff exists. Output discrepancies remain unpriced observations.
- There are no deduction modes and no automatic rounding, caps, negative-cut or redistribution calculations.

## Existing scaffold

`server.js`, `legacy-server.js`, `cli.js`, the old top-level scanner modules under `src/`, and the earlier packs are preserved reconnaissance/scaffold material. **They are not connected to `npm start`, the package's public export or this UI.** They include superseded assumptions and have not passed this milestone's validation. The active server is `review-server.js`; the public API is `src/ledger/index.js`. Grimoire is not imported or modified.

The current scope reconciles Claude's PR #4 notes, recorded in `../eden-module-planning/IMPLEMENTATION-BASELINE.md`. WCL ingestion and editable mixed/split-report selection are now connected to the ledger. Validated mechanic packs, fault attribution, padding/cooldown analysis, Eden account reconciliation and production integration remain future work. The synthetic proposals do not represent those capabilities.
