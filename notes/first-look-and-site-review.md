# Eden: first look from the outside, and idea shortlist

_Written 2026-10-13 from the public website and Discord listing only (no login). Anything behind "Login via Discord" is unseen; the dev docs will correct or fill in this picture._

## What I could see

**Website (edenhub.net)**, a Next.js app.
- `/` is a marketing landing page: "WoW Raid Boosting Platform", "Professional raid boosting for Eden guild", three feature cards (Elite Protection, Lightning Fast, Premium Rewards), stats (200+ Active Players, 2K+ Games Played, 99.9% Server Stability, 24/7 Community), a FAQ, and a "Login via Discord" button.
- FAQ questions: "How do payouts work?" (listed twice), "What are the requirements?", "Why is my account frozen?". No answer text came through in the page content (could be JS accordions, could be empty; worth a manual check).
- `/home` and `/dashboard` (including `/dashboard?tab=eden-runs`) show only "EDEN / The hub of the Eden community / Checking your session" plus a Discord join link. Everything real lives behind Discord login.
- Footer: "Developed by Aren" with a personal email address.

**Discord listing** (discord.com/servers, ~2,950 members, ~300 online, created 15 Apr 2025).
- "Eden inhouse +100x Vip Runs weekly, 100% pickrate if you got the minimum requirements."
- Multiple daily high-end mythic boosts, alt runs for gearing, 24/7 management support.
- Members sign up on edenhub.net with their name (likely Name-Realm); item level, Warcraft Logs and saved/unsaved status update automatically; the site is used to manage rosters.
- Elite Raider applications are open.

## How Eden appears to work (inferred)

1. A player joins the Discord and logs into edenhub.net with Discord.
2. They register their character(s); the site pulls ilvl, logs and lockout status automatically.
3. Management posts runs (VIP, mythic boosts, alt runs) in the "Eden Runs" dashboard tab; anyone meeting minimum ilvl/log requirements gets picked.
4. The bot mirrors this into Discord (announcements, sign-ups, roles).
5. Boosters earn payouts per run; accounts can be "frozen" (probably for no-shows, rule breaks, or payout issues).
6. An Elite Raider tier exists above the normal pool.

## Small things noticed (quick wins)

- **Two different Discord invites in use**: the site links `discord.gg/uRtNJKVSKy`, Mike shared `discord.gg/MPmyRWCjM`. Pick one permanent vanity/invite.
- **FAQ**: duplicate "How do payouts work?" entry, and answers didn't render in a plain fetch.
- **`/home` for logged-out visitors** shows only "Checking your session" with no visible login button (in a text fetch, at least). If a visitor lands there, they get a dead end.
- **Discord discovery tags** include Anime & Manga and Console, which don't fit; discovery traffic is mismatched.
- **Developer's personal email** in the public footer; a community contact or Discord ticket link is safer.
- **Landing stats** read as generic template copy ("99.9% Server Stability"); live numbers from the database (runs this week, active boosters) would be more credible.

## Idea shortlist

1. **Booster wallet and payout history.** A page showing balance, pending vs. paid, per-run cut, and a dispute button. Directly answers the top FAQ and cuts "where's my gold" tickets.
2. **"Why can't I join?" eligibility checker.** Each run shows a green/red check per requirement (ilvl, logs, saved status, role) so players know exactly what to fix. Bot DMs when a run they qualify for opens.
3. **Frozen account transparency.** Reason codes, who froze it, and an in-site appeal that opens a Discord ticket via the bot.
4. **Reliability score.** Track no-shows, late arrivals, and early leaves; use it to prioritise picks for VIP runs and reward dependable boosters.
5. **Availability calendar and auto-roster.** Boosters mark weekly availability; raid leads get a suggested roster balanced by role, armor type and token for loot-funnel runs.
6. **Elite Raider application pipeline.** Apply on the site, auto-attach logs/ilvl, reviewers vote, applicant sees status. Replaces ad hoc Discord applications.
7. **New member onboarding checklist.** Link Discord, add character, read rules, get verified role, first run, shown as progress in the dashboard and in a welcome DM.
8. **Management analytics.** Runs per week, fill rate, average time to fill, gold flow, booster churn, top performers.
9. **Website quick-win sweep.** The "small things" list above as one packet.

## Proposed packet format

Each packet, one file, written so a dev can hand it straight to their Claude:

- **Problem**: who hurts and how, in two or three sentences.
- **Proposal**: what we build.
- **User flow**: step by step, per role (booster, raid lead, management).
- **Implementation notes**: data model changes, pages, bot commands/events, integrations (Blizzard API, Warcraft Logs, Raider.IO), written against the real stack once the docs arrive.
- **Acceptance criteria**: checkable list of "done means".
- **Open questions**: anything the devs or Mike must decide.
