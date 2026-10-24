# Decisions log

Newest at the bottom. Append only; if a decision changes, add a new entry that supersedes the old one.

- **2026-10-13**: General idea packets are parked until we have a full picture of how Eden's website and bot work (from the dev's README/system docs). Mike's own specific requests are still fine.
- **2026-10-13**: Packets never design silent automatic changes to rosters, cuts or payouts. The system proposes, a human confirms, every change is logged with who and when.
- **2026-10-13**: Times are stored and shown in server time (CET/CEST), with the viewer's local time beside them.
- **2026-10-24**: Claude and Codex share this private repo (`eden-planning`) for Eden website/bot planning. Addon code stays in `MTV6/Eden`. Handoffs go in GitHub issues labelled `for-claude`, `for-codex`, `for-mike`.
