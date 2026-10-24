# Decisions log

Newest at the bottom. Append only; if a decision changes, add a new entry that supersedes the old one.

- **2026-10-13**: General idea packets are parked until we have a full picture of how Eden's website and bot work (from the dev's README/system docs). Mike's own specific requests are still fine.
- **2026-10-13**: Packets never design silent automatic changes to rosters, cuts or payouts. The system proposes, a human confirms, every change is logged with who and when.
- **2026-10-13**: Times are stored and shown in server time (CET/CEST), with the viewer's local time beside them.
- **2026-10-24**: Claude and Codex share this private repo (`eden-planning`) for Eden website/bot planning. Addon code stays in `MTV6/Eden`. Handoffs go in GitHub issues labelled `for-claude`, `for-codex`, `for-mike`.

- **2026-10-24 — [Codex], Mike's deduction-module decisions:** Build authorization remains paused. Mike authorized publication of the v1.3 master plan for Claude's review, not implementation or merging. The module is intended for local development later and eventual Eden website integration, with a separate admin panel and audit of suggested, confirmed and applied deductions.
- **2026-10-24 — [Codex], Mike's review-mode decisions:** Analyze both kill pulls and wipes. RL may deduct qualifying kill-pull mistakes before the wipe threshold, including zero-wipe runs. Provide Light, Normal and Strict modes; Normal is the default and all thresholds are admin-adjustable through versioned configuration. Initial standard activation is 3 wipes on one boss or 6 across the run; kill-pull permission is independent. No share multipliers were approved.
- **2026-10-24 — [Codex], Mike's damage-priority requirement:** Review possible add padding, good overall parses with poor boss contribution, cooldown holding and target choices. Legitimate add requirements and assignments must be considered. A standalone padding tariff remains undecided; see the master packet's O23.
- **2026-10-24 — [Codex], Mike's Grimoire boundary:** Suitable Grimoire modules or ideas may be reused, but Grimoire itself must not be modified. Any adaptation and tests belong to Eden, which should run independently of the live Grimoire checkout.
