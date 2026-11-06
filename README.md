# Odd One Out (v2)

> One of these doesn't belong.

A 30-second visual recognition game. One symbol in the grid is different. Tap it before time runs out.
Plain HTML, CSS and vanilla JavaScript. No build step, no dependencies, no network requests.

## Run locally

Open `index.html` in a browser, or serve the folder:

```
python3 -m http.server 8000   # then visit http://localhost:8000
```

Native sharing and clipboard need HTTPS or `localhost`. On `file://` the game shows a copy box instead.

## How to play

- You have 30 seconds. Tap, click, or use the arrow keys and Enter/Space on the symbol that differs.
- Correct: +1 and the next puzzle. Wrong: -1 second, streak resets, that cell is crossed out.
- Difficulty follows your score. The grid grows 3x3 → 4x4 (score 5) → 5x5 (score 10). Shapes become more alike at scores 3, 7 and 12. The two ramps never step on the same puzzle, so you only face one new challenge at a time.
- Differences are always in shape, never only colour.
- Ranks (Squinter → Spotter → Sharp eye → Hawk → Odd oracle → Pattern breaker) unlock at scores 0, 5, 10, 15, 20, 26.
- Streak milestones every 5 in a row. The last 3 seconds tick.
- The speaker button (top right) mutes sound. Sound is synthesized in the browser and starts after your first tap.

## Daily challenge and sharing

- Puzzle N is generated from the date and N (`xmur3` hash, `mulberry32` generator), so every player sees the same sequence on every device. A wrong tap keeps the same puzzle.
- No `?d=` means today's UTC date. `?d=2026-11-06` plays a specific past day. Invalid or future dates fall back to today with a notice.
- The result screen shows score, rank, best, top streak, accuracy, a countdown to tomorrow's puzzles and your day streak.
- Share text includes a green/red strip of your run. The link carries the date and your score (`?d=2026-11-06&s=18`), so a friend sees "A friend scored 18. Can you beat it?" and, at the end, whether they did. No server involved.
- Sharing tries `navigator.share`, then the clipboard, then a copy box.
- **Free play** gives random puzzles each run (no memorising), with its own best score. It isn't shareable.

## Storage

`localStorage` keys: `ooo.v1.<date>` (best per challenge date), `ooo.v1.free`, `ooo.v1.meta` (mute, day streak). All access is guarded and validated; if storage is blocked the game works for the session.

## Deploy to Vercel

1. Put these files at the root of a Git repository (or a folder).
2. Run `npx vercel` and accept the defaults (Framework: Other, no build command, output directory `.`), then `npx vercel --prod`. Or import the repo at vercel.com/new. No configuration needed.

## Project structure

```
index.html    markup: intro, board, result
styles.css    theme, layout, animation, reduced-motion
game.js       shapes, seeded puzzles, ranks, timer, sound, storage, sharing
favicon.svg   icon
README.md     this file
```
