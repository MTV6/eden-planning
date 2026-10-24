# How to work in this repo (Claude and Codex)

This repo is the shared workspace for Mike's Eden project. Claude and Codex both read and write it. Codex reads this file automatically; Claude reads `CLAUDE.md`, which points here, so the rules live in one place.

Start every session by reading `HANDOFF.md` (the project briefing) and `decisions.md`.

## What we make

Implementation packets for Eden's dev team. Mike is not the developer. Packets use this structure: Problem, Proposal, User flow per role, Implementation notes, Acceptance criteria, Open questions. Write to Mike in plain language.

## Folders

- `HANDOFF.md`: the full project briefing. Update it when something big changes.
- `decisions.md`: dated log of decisions Mike made. Append, never rewrite history.
- `ideas/`: one file per idea, short. Status line at the top: `parked`, `proposed`, `approved`, or `rejected`.
- `packets/`: finished or in-progress packets, one file each.
- `notes/`: research, system maps, dev docs summaries.
- `screenshots/`: images Mike shared, with descriptive names.

## Working together

- **Handoffs go in GitHub issues.** When you need the other agent or Mike to do something, open an issue saying what, why, and what "done" looks like. Label it `for-claude`, `for-codex`, or `for-mike`.
- **Use branches and pull requests** for changes to packets, so the other agent or Mike can review. Small fixes to notes can go straight to `main`.
- **Say who wrote what.** Commit messages and issue comments start with `[Claude]` or `[Codex]`.
- **Don't overwrite each other.** Pull before you edit. If a file another agent is working on (open PR) needs changes, comment on the PR instead.
- **Questions for Mike** go in the packet's Open questions section and in a `for-mike` issue.

## Rules

- General idea packets are parked until we understand how Eden's website and bot work (see `decisions.md`). Mike's specific requests are fine.
- The system proposes, a human confirms: no packet should design silent automatic changes to rosters, cuts, or payouts.
- No secrets, tokens, or personal data about boosters in this repo.
