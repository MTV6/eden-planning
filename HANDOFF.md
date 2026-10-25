# Eden project handoff (for Codex)

_Written 2026-10-24 by Claude for OpenAI Codex. Everything here comes from Mike's Claude project "Eden Ideas/Management" as of this date._

> **Current status (updated 2026-10-25): for the deduction module, start with [DEVELOPER-HANDOVER.md](DEVELOPER-HANDOVER.md) and [PROGRESS-AND-BUILD-ORDER.md](PROGRESS-AND-BUILD-ORDER.md)** (added in PR #8). Mike authorized building on 2026-10-24 (issue #7), so any "planning only / do not start building" text below is superseded, and so is the Light/Normal/Strict three-mode text in section 9. The module uses one standard rule set and only deducts; Eden's existing system handles cuts and gold. Where this file and those two documents differ, they win. This file stays as background on Eden, Mike and the earlier packets.

## 1. What Eden is

Eden is a **Retail World of Warcraft boosting community** (EU, server time CET/CEST).

- **Website:** https://edenhub.net/home. A Next.js app. The public landing page is marketing plus an FAQ; everything real (dashboard, "Eden Runs" tab, rosters) sits behind "Login via Discord".
- **Discord:** https://discord.gg/MPmyRWCjM (about 2,950 members). Note: the site links a different invite, `discord.gg/uRtNJKVSKy`.
- **Discord bot:** links the site and Discord (announcements, roster messages, roles). We have not seen its code or command list yet.
- **What happens there:** 100+ VIP raid runs a week, mythic boosts, alt gearing runs. Boosters sign up on the site; ilvl, Warcraft Logs and lockout status update automatically. Raid leaders (RLs) build rosters on the site, run the raid, then mark it Complete, after which it goes to attendance review and payouts. Accounts can be "frozen". There is an Elite Raider tier with applications.
- **Developer:** Sunking is the current developer and owner (Mike, 2026-10-24). The site footer still credits "Aren", the previous owner. The dev team implements with their own Claude.

## 2. Who Mike is and what we produce

- **Mike** (GitHub `MTV6`) runs this project. He is a raid leader in Eden ("LEAD MTV" on run pages) and **not the developer**.
- Our output is **implementation packets**: plain-language feature specs Mike hands to Eden's dev team, who build them with their own AI tools.
- Packet format (keep it): **Problem → Proposal → User flow per role → Implementation notes → Acceptance criteria → Open questions.** Write so a dev can paste it straight into their AI. Any table/route/command names are suggestions, since we have no codebase access.
- Keep replies to Mike short and non-technical; the technical depth goes in the packet.

## 3. Decisions so far

| Date | Decision |
| --- | --- |
| 2026-10-13 | **General idea packets are parked** until we have a full picture of how the website and bot work (from the dev's README/system docs, screenshots, bot commands). Mike will upload the dev docs. Mike's own specific requests are still fine to do. |
| 2026-10-13 | Packets never auto-change rosters or payouts: the system proposes, a human (RL / management) confirms with a click, and every change is logged with who and when. |
| 2026-10-13 | Times are stored and shown in server time (CET/CEST), with the viewer's local time beside them. |

## 4. Done work

Both packets were written 2026-10-13 as Claude Docs. Full markdown copies are in `packets/`, so you don't need claude.ai access.

1. **Automated Attendance Check**: `packets/attendance-check.md` (original: https://claude.ai/code/artifact/11dacfe9-f360-4b90-a540-89af550346cf)
   When the RL clicks Complete, pull the Warcraft Logs report (WCL API v2 GraphQL, per-boss `friendlyPlayers`), match characters to the roster (including unrequested alt swaps via the same Discord account), read the run's Discord channel for players tagged "in", and show one checklist: Present / No-show / Partial (x of N bosses) / Swapped / Possible swap / Helper / Client. RL resolves each row before attendance review.
   Open for Mike: do wipes count or kills only? Real partial-cut rule (per boss?)? Block or just warn on Complete with unresolved rows?
2. **Raid Leader Availability and Run Assignment**: `packets/raid-leader-availability.md` (original: https://claude.ai/code/artifact/181093ae-38ac-4860-b643-14fb39b35c82)
   RLs save a repeating weekly availability grid (30-min blocks, Wed–Tue reset week) plus one-week overrides and preferences (max runs, run types). Management gets a Weekly Schedule board generated from a weekly run template, a "Suggest leads" button (greedy, hardest slots first, fewest runs first), and "Publish week", which sets the existing Lead field. Bot DMs leaders Confirm / Can't make it; dropped runs go to a staff channel with a Claim button.
   Open for Mike: are runs fixed recurring slots? Who assigns (one person or several managers)? Can leaders self-claim open runs? Are some leaders limited to certain run types?

## 5. Open threads

- **Raid leader availability scheduling**: packet written; waiting on Mike's answers to the four open questions above.
- **Roster vs log attendance**: packet written; waiting on the partial-cut rule, wipes, and block-vs-warn answers. Character swaps are handled (auto-match same Discord account, otherwise suggest and bot DMs the player; never silent).
- **Site review and ideas**: first look done from outside only (`notes/first-look-and-site-review.md`; parked ideas also have one file each in `ideas/`). It lists quick wins (two Discord invites, duplicate FAQ entry, dead-end `/home` for logged-out visitors, mismatched Discord discovery tags, dev's personal email in the footer, template-looking landing stats) and **9 parked ideas**: booster wallet/payout history, eligibility checker, frozen-account transparency, reliability score, availability calendar and auto-roster, Elite Raider application pipeline, onboarding checklist, management analytics, website quick-win sweep. Parked until the dev docs arrive.
- **Waiting on:** the dev's README/system docs from Mike. First job when they arrive: write a system map (website, bot, data flows) before any new packet.

## 6. Facts from screenshots (in `screenshots/`)

- **Run page** (`edenhub-run-page-heroic-vip-2026-10-11.png`): "Heroic Vip", Sun 11 Oct 20:00 CEST, LEAD MTV, roster 16/22 with tank/healer/DPS/Lootbody slots; signups list ilvl, logs and "needs pick"; header shows external clients / Eden customers; buttons Edit Run, Clear Roster, Copy Picks, Export, Verify Team, Find hidden players, Announce Roster, Announce Missing, Start Run, Complete; "Auto Roster for this run" toggle; bot plan per armor/token.
- **WCL report** (`wcl-report-ulatek-heroic-2026-10-11.png`): report "Eden" by mtv777, Ula'tek Heroic kill 9:24, 26 players in the group composition. Used for the worked example in the attendance packet.

## 7. Related: the Eden addon repo

Mike's private repo `MTV6/Eden` is separate work: **Eden addon development** (a WoW addon), currently a Cooldown / Assignment Manager UI with a visual reference pack under `guidance/reference-video/`. Last push 2026-09-05. This handoff covers the website/bot planning project, not the addon.

## 8. Practical notes

- The public site can be read with a normal web fetch; some sandboxed `curl` setups get blocked.
- Character names can be non-Latin (e.g. Cyrillic) and realms have spaces; normalise before matching.
- Never put secrets, tokens, or booster personal data in the shared workspace.
