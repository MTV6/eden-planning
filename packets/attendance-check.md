# Packet: Automated Attendance Check

Oct 13, 2026 · @Mike

## TL;DR

When a raid leader clicks **Complete**, the site pulls the run's Warcraft Logs report, checks per boss who was actually there, matches those characters to the roster (including unrequested character swaps), and reads the run's Discord channel for players called "in". It then shows one checklist: present, no-show, partial, swapped, unrostered helper. The raid leader resolves each flagged row with one click before the run goes to attendance review.

## Problem

Before sending a run to attendance review, the raid leader (RL) checks attendance by hand: the roster page on one screen, the WCL report on the other, comparing names boss by boss. It is slow, and mistakes cost people gold.

What gets missed today:

- **No-shows** who stayed on the roster because nobody removed them in time, so they get paid for a run they didn't do.
- **Helpers** who joined for a few bosses and need a partial cut, but were never added. The RL has to scroll the run's Discord channel for messages where they tagged someone with "in".
- **Unrequested character swaps**: a rostered player shows up on a different character without asking for a swap. Their roster character looks like a no-show, and their real character looks like a stranger.

## Proposal

Build an **Attendance Check** panel on the run page. It runs when the RL clicks Complete, and can also be opened at any time during the run. It combines three sources:

1. **Warcraft Logs**: which characters were in each boss fight.
2. **The site roster**: who was planned, plus every character each Discord user has registered, plus the run's external clients.
3. **The run's Discord channel**: messages where the RL tagged a player with "in" (and later, a proper `/in` command).

Every person in the roster or the log gets exactly one status:

| Status | Meaning | RL action offered |
| --- | --- | --- |
| Present | On the roster and in every boss fight | None |
| No-show | On the roster, in zero boss fights, no swap found | Remove from roster |
| Partial | On the roster or a helper, in some boss fights ("3 of 8") | Set partial cut |
| Swapped | Rostered on one character, played another registered to the same Discord user | Confirm swap |
| Possible swap | Rostered player missing, and an unregistered character in the log looks like them | Confirm or reject; bot asks the player |
| Helper | In the log, not on the roster, not a client | Add as helper (full or partial) |
| Client | In the log and on the run's client list | None, excluded from cuts |

Nothing is changed automatically. The panel proposes and the RL confirms. Complete is blocked, or at least warns, while any row is unresolved.

&#91;embedded content: attendance check flow · 3 sources, 1 checklist\]

The panel only proposes. Every roster or cut change comes from an RL click before the run reaches attendance review.

## User flow

**Raid leader**

1. During or after the run, the RL pastes the WCL report link on the run page. Later, the site can find it automatically from the guild's reports by date and zone.
2. The RL clicks **Complete**. The Attendance Check panel opens with every row sorted so flagged rows come first.
3. For each flagged row the RL clicks one action: remove no-show, confirm swap, add helper, or set a partial cut. Each row shows its evidence: which bosses the character was in, and any Discord "in" message with its time and a jump link.
4. When no flagged rows are left, the RL submits to attendance review. The check result is saved with the run.

**Player (possible swap only)**

1. The bot DMs the player: "You were rostered on Kirshi but weren't seen in the log. Were you on another character?" It lists the unmatched characters from the log as buttons, plus "I wasn't there".
2. Their answer appears on the RL's panel. A confirmed character is added to the player's Eden account, so next time it matches automatically.

**Helper (going forward)**

1. The RL runs `/in @player` in the run channel, or clicks an "Add helper" button on the run message, when someone joins mid-run.
2. The bot records the helper and the time on the run, so the panel no longer depends on reading free-text chat.

**Attendance reviewer**

1. Sees the saved check next to the run: per-boss attendance, every swap and helper, who confirmed each change, and any row the RL overrode.

## Implementation notes

Written without access to Eden's codebase, so names below are suggestions. Adapt them to the existing stack.

### 1. Warcraft Logs (per-boss presence)

- WCL API v2 (GraphQL) at `https://www.warcraftlogs.com/api/v2/client`, using a client-credentials token from `https://www.warcraftlogs.com/oauth/token`. The site already pulls logs for signups, so a WCL client probably exists.
- One query per report gives everything needed:

```graphql
query ($code: String!) {
  reportData {
    report(code: $code) {
      startTime
      zone { name }
      fights(killType: Encounters) {
        id encounterID name kill difficulty startTime endTime
        friendlyPlayers
      }
      masterData { actors(type: "Player") { id name server subType } }
    }
  }
}
```

- `friendlyPlayers` is the list of actor ids in that fight. Map them through `masterData.actors` to name, realm and class.
- Only count fights inside the run's time window and difficulty, so a report that also contains another run doesn't leak in. Support more than one report per run (split logs).
- Decide whether wipes count (see open questions). `killType: Kills` returns kills only.

### 2. Matching log characters to people

- Normalise before comparing: lowercase, Unicode NFC (Cyrillic names such as Пашазху), and realm with spaces, hyphens and apostrophes removed ("Twisting Nether" = "twisting-nether").
- Match order for each log character:
  1. Exact character on the roster → that roster slot.
  2. Character registered to a Discord user who is on the roster → **Swapped**.
  3. Character on the run's client list → **Client**.
  4. Character registered to any other Eden user → **Helper**, linked to that user.
  5. Unknown character → **Helper (unknown owner)**, and a **Possible swap** candidate.
- Possible-swap pairing: pair a missing rostered player with an unknown character of the same role and armor type that was present from the first boss. Show it as a suggestion only.

### 3. Discord channel

- Short term: the bot reads the run channel's history from run start to now and finds messages from the RL (or staff) that mention a user and contain the word "in" (`\bin\b`, case-insensitive). Each match attaches a "called in at 20:42" note and jump link to that user's row. This needs the bot's Message Content intent and Read Message History in run channels.
- Long term: a `/in @player` slash command and an "Add helper" button on the run message. These write a helper record directly and need no message-content access. Keep chat parsing as a fallback.

### 4. Data to store

- `attendance_check`: run, report code(s), fetched at, boss list, submitted by, submitted at.
- `attendance_row`: run, Discord user (nullable), character, realm, status, bosses present, bosses total, evidence (fight ids, Discord message links), resolution, resolved by, resolved at.
- `run_helper`: run, Discord user, character, added by, added at, source (`/in`, button, chat match, attendance check).
- On a confirmed swap: add the character to that user's account if it isn't there yet.

### 5. Partial cuts

- Default suggestion: full cut × bosses present ÷ bosses total. The RL can override it, and the override is stored. Replace the formula with Eden's real rule if it differs.

## Worked example: Heroic VIP, Sun 11 Oct

Done by hand from Mike's two screenshots: the roster page (16 of 22 slots filled, 5 external clients) and the WCL summary for the Ula'tek Heroic kill (26 players). It shows what the panel would flag for that one boss.

| Who | Roster slot | In the Ula'tek kill? | Panel would show |
| --- | --- | --- | --- |
| Legit (Kirshi, Shaman) | Healer #4 | No | No-show, or Possible swap if Kirshi played another character |
| Other 15 rostered players | Tank, healer and DPS slots | Yes | Present (for this boss) |
| Seiki | None | Yes, healing | Helper, and a Possible swap candidate for Legit (same role) |
| Divinewind, Stopndead, Easystart, Petslam, Quincy, Kungfubarbie, Anátéma, Kittymiaow, Ilysham, Jendehkhanom | None | Yes | Client (5 of them, per the client list) or Helper |

The screenshots don't say which 5 of the 11 unrostered players are clients. The site already has that list, so the real panel would split them automatically.

## Acceptance criteria

- [ ] Given a WCL report link, the panel lists every boss fight in the run window with the characters present in each.
- [ ] Every rostered player and every log character gets exactly one status from the Proposal table.
- [ ] A rostered player present on another character registered to their Discord account shows as Swapped, not No-show plus Helper.
- [ ] Clients on the run's client list are never shown as helpers.
- [ ] Partial rows show "x of N bosses" and a suggested cut the RL can override.
- [ ] Discord messages from the RL that tag a player with "in" appear on that player's row with time and jump link.
- [ ] For a Possible swap, the bot DMs the player and their answer appears on the panel. A confirmed character is added to their account.
- [ ] No roster or cut change happens without an RL click. Each click is stored with who and when.
- [ ] Complete warns (or blocks) while flagged rows are unresolved.
- [ ] Names with non-Latin characters and realms with spaces match correctly (test with Пашазху-Howling Fjord and Sunkingspika-Hyjal).
- [ ] Re-running the check on the same run gives the same result and keeps earlier resolutions.

## Open questions

For the dev:

- Does the site already have a WCL API client, and does it fetch reports or only character parses?
- How are external clients stored on a run? Character names, or Discord users?
- Does the bot have the Message Content intent and Read Message History in run channels?
- Is there a run start/end time on the site to filter fights by?
- What does attendance review do today with the RL's submission, and where should the saved check live?

For Mike and management:

- Do wipes count toward attendance, or only kills?
- What is the real partial cut rule? Per boss, or something else?
- Should Complete be blocked while rows are unresolved, or only warn?
- Who besides the RL may use `/in` and resolve rows?
- How long should a player get to answer the swap DM before the RL decides without them?
