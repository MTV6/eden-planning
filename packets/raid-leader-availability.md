# Raid Leader Availability and Run Assignment

Feature packet for the Eden dev team · Oct 13, 2026 · @Mike

Raid leaders enter the days and times they can lead once, as a repeating weekly pattern, and management assigns each of the week's scheduled runs to an available leader on one board. The assigned leader then shows up as the run's **Lead** automatically, and the bot tells them.

This is a module on edenhub.net (a new dashboard tab), with a few Discord bot hooks. It is not a standalone spreadsheet, because the site already owns runs, leads and Discord identities.

> **Assumptions (no dev docs yet).** Based on the public site and a screenshot of a run page: runs already have a Lead field, a run type (e.g. Heroic VIP), and a start time shown in server time (CEST). Users log in with Discord, and roles like "raid leader" and "management" exist or can be added. Anything named below as a table, route or command is a suggestion; map it to what already exists.

## Problem

Eden runs 100+ VIP runs a week, and every one needs a raid leader. Today, finding out who can lead when means asking around in Discord, and the answers live in people's heads or scattered messages.

- Management spends time each week chasing leaders for availability and building the schedule by hand.
- Runs get double-booked or left without a lead, and it is noticed late.
- Leaders who are available get uneven work, because there is no view of who has led how much this week.
- When a leader drops a run, there is no quick way to see who else could take it.

## Proposal

Three pieces, built in this order. Pieces 1 and 2 are the minimum useful version; piece 3 makes it fast.

### 1. My Availability (every raid leader)

A weekly grid, Wednesday to Tuesday (EU reset week), in 30-minute blocks, shown in server time with the leader's local time alongside. The leader paints the blocks they can lead in.

- **Repeating pattern.** Saved once, carries over every week until changed.
- **This-week overrides.** Mark a day or block as unavailable (or extra available) for one specific week only, e.g. "away Sat 18th".
- **Preferences.** Max runs per week, run types they can lead (Heroic VIP, Mythic, Alt runs, etc.), and an optional note.
- **Last updated** timestamp, so management can see stale entries.

### 2. Weekly Schedule board (management)

The week's scheduled runs as rows or calendar cards, each with a Lead dropdown. The dropdown lists only leaders who are available for the whole run window, can lead that run type, and are not already leading an overlapping run. Unavailable leaders can still be picked, with a warning.

Example of what the board shows:

| Run | Start (server) | Lead | Status |
| --- | --- | --- | --- |
| Heroic VIP | Sun 20:00 | MTV | Assigned, confirmed |
| Heroic VIP | Sun 22:30 | (none) | 3 leaders available |
| Mythic | Mon 21:00 | Leader B | Assigned, waiting for confirm |
| Alt run | Tue 19:00 | (none) | No one available |

A side panel lists each leader with runs assigned this week versus their max, so the load stays even. Runs come from a **weekly template** (the fixed recurring slots, e.g. "every Sun 20:00 Heroic VIP") that generates the coming week's runs, plus any one-off runs added by hand.

### 3. Auto-suggest and the bot

- **Suggest leads** button fills every empty slot with the best available leader: available for the full window, allowed for the run type, fewest runs so far this week, under their max. Management reviews and changes before publishing. Nothing is assigned without a click.
- **Publish week** sets the Lead on each run and has the bot DM each leader their runs, with Confirm and Can't make it buttons.
- **Can't make it** clears the lead, flags the slot red on the board, and pings the other available leaders in a staff channel with a Claim button (first to claim gets it, management can override).
- **Reminder** DM to any leader whose availability is older than a set day (default Monday) before the next week is built.
- Optional **/availability** slash command that links straight to the leader's grid.

## User flows

### Raid leader

1. Opens Dashboard, then the **My Availability** tab (or runs /availability in Discord).
2. Paints the blocks they can lead, sets max runs per week and run types, saves. Done for every future week.
3. When something changes for one week, opens that week and marks the override.
4. Gets a bot DM when the week is published: "You're leading Heroic VIP Sun 20:00 and Mythic Mon 21:00." Taps Confirm on each.
5. If plans change, taps **Can't make it** in the DM or on the run page. The slot reopens and others are pinged.
6. Sees a Claim button in the staff channel when someone else drops a run they are free for.

### Management

1. Keeps the **weekly template** of recurring runs up to date (rarely changes).
2. Each week (default: Monday, before the Wednesday reset), opens the **Weekly Schedule** board for the coming week. The runs are already generated from the template.
3. Clicks **Suggest leads**, reviews the picks against the load panel, swaps any by hand.
4. Adds any one-off runs and assigns them.
5. Clicks **Publish week**. Leads are set on the runs and leaders are notified.
6. During the week, watches for red slots (dropped or unconfirmed) and reassigns from the dropdown.

### Booster (no change)

Sees the Lead on each run as today. Optional: the run card shows the lead earlier because runs are planned a week ahead.

## Implementation notes

Written without the codebase; names are suggestions to map onto existing tables and roles.

### Data model

| Table | Key fields | Notes |
| --- | --- | --- |
| `rl_availability_pattern` | user\_id, weekday (0-6), start\_minute, end\_minute | Repeating weekly windows, in server time (Europe/Paris). Several rows per day allowed. |
| `rl_availability_override` | user\_id, date, start\_minute, end\_minute, kind (unavailable / available) | One-week exceptions. Overrides win over the pattern. |
| `rl_preferences` | user\_id, max\_runs\_per\_week, run\_types\[\], note, updated\_at | updated\_at drives the stale reminder. |
| `schedule_template` | id, run\_type, weekday, start\_time, duration\_min, active | The fixed recurring slots. |
| `runs` (existing) | + template\_id, + lead\_status (unassigned / assigned / confirmed / dropped), + assigned\_by, + assigned\_at | Reuse the existing Lead field; don't add a second one. |
| `run_lead_history` | run\_id, user\_id, action, actor\_id, at | Audit trail of assign, confirm, drop, claim. |

### Logic

- **Availability for a date** = pattern windows for that weekday, minus "unavailable" overrides, plus "available" overrides.
- **Eligible for a run** = available from start to start + duration, run type in their list, no overlapping run already assigned (with an assumed 15 min buffer), under max runs that week.
- **Suggest leads** = greedy pass over unassigned runs ordered by fewest eligible leaders first (hardest slots first); pick the eligible leader with the fewest runs this week; tie-break on least recently assigned. Returns a draft; nothing saves until Publish.
- **Time zones.** Store minutes in server time (CET/CEST, as shown on run pages) so DST changes don't shift a leader's "Sunday 20:00". Display local time beside it.
- **Week generation.** A scheduled job (or the board on first open) creates next week's runs from active template rows, skipping any already created.

### Pages

- Dashboard tab **My Availability**: raid leader role only.
- Dashboard tab **Weekly Schedule**: management role edits; raid leaders get a read-only view of the whole week.
- Run page: show lead\_status next to the existing "LEAD" label, plus Can't make it for the assigned leader.

### Bot

- On Publish: DM each leader their runs with Confirm and Can't make it buttons.
- On drop: post in a staff channel (configurable) naming the run and tagging eligible leaders, with a Claim button. Claim calls the site API, which re-checks eligibility.
- Weekly job: DM leaders whose preferences.updated\_at is older than the reminder cutoff, and DM leaders who haven't confirmed 24 h before their run.
- Optional: post the published week as one embed in a leaders channel.

### Permissions

Only management can assign or publish. A leader can only edit their own availability and drop their own runs. Claim is open to any eligible leader.

## Acceptance criteria

- [ ] A raid leader can save a repeating weekly availability in 30-minute blocks, and it appears unchanged in every following week.
- [ ] A raid leader can mark a one-week override, and it affects only that week.
- [ ] A raid leader can set max runs per week and the run types they lead.
- [ ] Times display in server time with the viewer's local time beside them, and a Sunday 20:00 window stays at 20:00 server time across a DST change.
- [ ] Management can maintain a weekly template, and next week's runs are generated from it without duplicates.
- [ ] On the Weekly Schedule board, each run's Lead dropdown lists only eligible leaders by default; picking an ineligible one shows a warning naming the reason (not available, wrong run type, overlap, over max).
- [ ] The load panel shows runs assigned this week versus max for every leader.
- [ ] Suggest leads fills empty slots with eligible leaders, never assigns overlapping runs to one leader, and saves nothing until Publish.
- [ ] Publish sets the existing Lead field on each run and the bot DMs each leader their runs.
- [ ] Confirm and Can't make it buttons in the DM update the run's lead status on the site.
- [ ] Can't make it clears the lead, marks the slot red on the board, and posts a Claim message to eligible leaders; the first valid claim becomes the lead.
- [ ] Leaders with availability older than the cutoff get a reminder DM.
- [ ] Every assign, confirm, drop and claim is recorded with who did it and when.
- [ ] Only management can assign or publish; leaders can edit only their own availability.

## Open questions

For Mike (these change the design):

- [ ] Are the weekly runs fixed recurring slots (same day and time every week), or posted fresh each week? The packet assumes mostly fixed, with one-offs added by hand.
- [ ] Who assigns leaders today: one person, or several managers? The packet assumes a management role does it.
- [ ] Should leaders be able to claim open runs themselves, or only management assigns? The packet allows claiming only for dropped runs.
- [ ] Are some leaders only allowed certain run types (e.g. Mythic leaders vs VIP leaders)? The packet supports a per-leader run-type list.

For the dev team:

- [ ] Does creating a run already happen from a template or by hand? If by hand, should Publish create the runs too?
- [ ] Which Discord role marks a raid leader, and which marks management?
- [ ] Is the Lead field a Discord user, a site user, or a character? Assignment needs to write to the same thing.
- [ ] Which channel should drop and claim messages go to?
