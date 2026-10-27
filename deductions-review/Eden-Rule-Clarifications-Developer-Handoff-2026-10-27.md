# Eden rule clarification handoff — 27 October 2026

Companion to Eden-Discord-Rulebook-for-Sunking.txt. These are documentation changes only: the prototype and live Eden website have not been changed in this update.

## Publication authority

The Discord-ready text is in deductions-review/Eden-Discord-Rulebook-for-Sunking.txt. It retains rule IDs 1–38, with short rules first and explanations afterwards. It supersedes conflicting October 23/25 wording for the subjects listed below. Earlier local rulebook and developer documents remain historical until reconciled. Do not treat their old values as current policy.

## Confirmed decisions to implement

- RL must confirm deliberate resets/aborted pulls in the final deduction review sheet. Confirmed resets/aborts are excluded from the three-wipes-per-boss / six-wipes-per-run count. Preserve who classified each pull, when, and the resulting count. Uncertain pulls must remain explicitly unresolved, not silently guessed.
- Reaching either threshold enables retrospective review of earlier qualifying wipe pulls across the entire run. Kill pulls remain independently eligible.
- Ignoring a mechanic and killing another player on a kill pull can warrant 0.5 share against the responsible player.
- Sum exact incident half-shares, then floor the final deduction. Replace the prototype's RL floor/ceiling choice; keep exact and final values in audit history.
- Voice/preparation/attendance/conduct requirements can apply before the wipe threshold. Warn first where appropriate; RL leniency remains available.
- Voice and preparation: one share each across the run. Conduct: normally one share across the run, with separate serious unrelated offenses potentially additional; no invented fixed tariff for severity.
- Lateness: one share per boss missed, subject to RL leniency for the reason. This supersedes a universal single-share lateness charge.
- Two no-shows in the preceding two weeks: one-week access suspension. Four or more in the preceding month: one-month access suspension. Rolling windows; monthly replaces weekly, does not stack. Eden must own authoritative attendance history and access enforcement, not infer no-shows from combat logs.
- Heroic VIP only: 13 boosters / 3 LBs. Other formats are not supplied.
- Incoming unsaved replacement: full cut unless voluntarily reduced. Saved replacement: full cut or minimum 3/8 of normal entitlement, unless voluntarily reduced/free. Record agreed pay before joining.
- Half-cut removal can be followed by separate rule-compliant incident deductions; final entitlement cannot fall below zero. Full-cut removal prevents further share removal, while additional mistakes and their contribution to removal remain recorded.
- Recording retention starts at deduction-channel publication and lasts 48 hours; preserve relevant evidence longer during an active dispute. Staff can decide from Warcraft Logs if recording fails; recording is additional evidence, not a required gate to deciding an appeal. The requirement to log and provide voice-inclusive recording remains.
- Appeal window: 48 hours after the player's deduction is posted in the deduction channel. Track actual publication time, not run completion or local export.
- Staff review first, RL then answers. Staff council/Sunking final authority. Correct attendance before processing where possible. If sent and irreversible, RL refunds personally within 24 hours of the refund decision; do not claw money back from other recipients.
- Staff notification needs only a ping and brief request for help, not a mandatory detailed template.
- Deducted RL gets no redistribution; deducted players get none. If everyone is deducted, deducted gold goes to Eden management.

## Deferred items — intentionally absent from the Discord rulebook

### Parse formula and thresholds

Await Mike's actual bot roster-picker numbers and thresholds. Do not automate either the older blanket 50-parse rule or the provisional minimum-minus-ten formula. Define the metric, averaging/window, encounter weighting, wipes, partial participation, spec/role context and action thresholds when the bot data arrives. Useful-damage and assignment review remains part of the published principles. No standalone universal padding or low-parse fine has been approved.

### Other boost formats

13/3 is Heroic VIP only. Obtain the other formats rather than spreading that default to every boost. Formats should have explicit identities and versioned roster/loot requirements.

### Redistribution proposal for Sunking/Eden developers

Eden already owns share and gold calculation. Check its existing behavior before modifying anything.

Mike's requested allocation within the eligible boosters' pool:
- Equal portions for non-deducted full-run boosters.
- Proportional portions for eligible helpers according to their participation shares.
- Deducted recipients are excluded.
- Undeducted RL gets only the 30% RL allocation, not an additional booster-pool portion.
- If RL is deducted, 100% goes to eligible non-deducted boosters/helpers.
- If everyone is deducted, the gold goes to Eden management.

Possible implementation for review, not an approved replacement algorithm: a full-run recipient has weight 1 and a helper has weight equal to their participation entitlement divided by the comparable full-run entitlement. Normalize weights within the boosters' pool. Confirm eligible helper definitions, gold rounding/remainders and edge cases against Eden's actual financial model. Do not create a second payout engine in the deduction module.

### Implementation precision

Resolve the precise rolling-month boundary/timezone with Eden's attendance system without silently substituting calendar months or 30 days. Define suspension effective times and history handling. These are implementation details, not new sanctions.

## Verified custom emojis

Read from Eden's Discord picker on 27 October 2026:
- RaidLeader1: 1448045404783644682
- eden_check: 1561174709465522186
- eden_gold_bag: 1561174753417367643
- eden_heroic: 1561189836063514664

Only these Eden custom emojis and standard Unicode emojis are used. No other server's custom emojis are used.

## Delivery status

Published with the Discord-ready text and updated main developer handover on the review branch. No Discord message sent, no application change, no Grimoire change. The prototype still needs policy changes before it implements these decisions.

