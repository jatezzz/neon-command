# Battle of the day, sharing and measurement

Neon Command has one battle per day, the same for everyone. The daily module (`js/daily.js`) is shared with Neon Raiders,
Neon Bricks and Neon Stack; their `docs/DAILY.md` describes sharing, links and the anonymous counters in full.

## What the day decides

`NeonCommand.dayPlan()` uses `NeonDaily.rng('battle')`:

- **The map:** one crystal in the middle and two or three pairs mirrored through the centre, so neither side is favoured.
- **The bot:** its army mix (weights for Spark, Lancer, Bulwark), the army size before its first push (6-10 units), how
  often it answers your most numerous unit with the one that beats it (50-85 %), and the seed of its own decisions.

The simulation runs at a fixed 120 steps per second; the bot thinks every half second with its own seeded random numbers.

## Points

| What | Points |
|---|---|
| Enemy unit destroyed | 5 |
| Crystal captured | 25 |
| Damage to the enemy core | 1 per 8 (cores take half damage from units until sudden death) |
| Victory | 1000 + 3 per second under 10 minutes + up to 300 for the core you kept |

At the end the score is multiplied by the level: Easy ×0.6, Normal ×1, Hard ×1.4. The level travels in the shared text
and in the `over` counter (`df`).

## Shared results

The shared text says whether you won and when (`Le gané al bot en 4:32 · 3.437 pts`), with 🏆 or 💥. In Neon Command the
bot is the opponent, so scores to beat (`vs=`) come from players and are always *declared*.

Counters go to the portal with `g=neon-command`; in `over`, `w` is 1 for a win, `k` enemy units destroyed, `c` crystals
held at the end, `p` units built.
