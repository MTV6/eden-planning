# Milestone 3: find missing logs

[Codex] 24 October 2026. Version 0.4.0. Local prototype; no Eden changes or deployment. Grimoire is unchanged.

## Delivered

The WCL panel can search expected roster members' recent report histories for other recordings of the same boost. A selected known-pull baseline, expected roster and explicit time window constrain discovery. Realm names are resolved through WCL's directory. Matching considers region, difficulty, time, roster overlap and known-pull timing; both kills and wipes count. Report titles are not reliable scope evidence.

Results show matching evidence, candidate additional kills/wipes and lookup coverage. Missing/hidden histories, pagination limits and partial failures are explicit. Searches are saved and audited. Candidate loading requires an explicit action and creates fresh metadata selection with no selected pulls or inherited role assignments. It does not import evidence or modify deductions.

Client additions use WCL's GraphQL `characterData.character.recentReports` and realm directory queries. See [official API documentation](https://www.warcraftlogs.com/api/docs) and [v2 schema](https://www.warcraftlogs.com/v2-api-docs/warcraft/). No scraping of profile HTML or Grimoire dependency is needed.

## Resource controls

- Default six characters, two pages; maximum 40 characters, three pages, 50 reports per history page.
- Maximum 60 logical query units with budget reserved for candidate inspection; maximum 16 candidate report metadata loads and two minutes per search. Query units are not WCL points and exclude retries.
- Ten-minute history/report cache and 24-hour realm-directory cache. Expired entries refresh on use; no automatic cache-row cleanup yet.
- Search fetches metadata only, not combat event pages. Search results/cache are separate from existing raw capture retention; this milestone does not reduce prior event captures to kilobytes.
- At most four reports can be loaded together. No automatic union of all candidate reports and no silent deduction or pull deduplication.

## Live validation (redacted)

The supplied historical run's original report contained only three matching final-boss pulls. Searching all 13 expected roster characters within its three-hour scheduled window found five candidate reports from four uploaders. Some histories reached their page limit, so this is not an exhaustive list.

The strongest candidate matched 13/13 expected characters on a matching pull, overlapped all three known pulls and supplied 14 additional candidate pulls: eight kills and six wipes. Its matching scope contains nine kills and eight wipes over ten distinct boss names; this does not establish a complete ten-kill run. Mixed-upload titles were misleading, reinforcing the need for pull-level review.

First search: 29 logical query units. The shared API client's hourly usage increased by 85.27 points, about 2.37% of its 3,600-point budget during the measured interval. This is an observed shared-client delta, not an isolated meter or guarantee; concurrent consumers could contribute. The repeat search through the browser used zero new queries and 28 cache hits.

One uploader's timestamps differed by about 5.2 seconds. Duplicate warning tolerance was increased from five to 15 seconds, with encounter, difficulty, outcome and roster matching retained. Browser candidate loading then flagged all three overlaps and left zero pulls selected. No combat capture, financial action or deduction verdict was performed. Historical raid-leader deductions remain unverified examples, not detector ground truth.

## Verification and review focus

45 automated tests pass, including ten new tests covering realm ambiguity/Unicode, matching boundaries, kill/wipe counting, clock skew, cache expiry, budgets, partial errors, empty pagination continuation, hidden/mismatched characters, candidate acceptance, audit and HTTP origin protection. Browser search, cached repeat, candidate loading and console checks passed.

Claude: review `src/wcl/missing.js`, client queries, overlap timing in `scope.js`, server endpoints and UI. Consider false-positive scope matches, fixed search thresholds, cache retention, shared quota instrumentation and production job/cancel handling. Search runs synchronously with a bounded timeout; it is not a production background queue. User OAuth for private reports is not implemented, and no API can discover inaccessible recordings through this connection.

Only source, synthetic fixtures and this redacted report belong in GitHub. Report IDs, rosters, search histories, raw evidence, database and credentials stay local. This milestone does not implement encounter blame, damage-padding detection, website authentication or an Eden application receipt.
