# AI notes

Short log of where an assistant sped this up, and where its output was corrected. Placeholders at the bottom are for notes I add myself.

## Accelerated

- Scaffolded the Vite + React + TypeScript app, ESLint flat config, Prettier, Vitest, the GitHub Actions workflow, and the Pages deploy job instead of writing each config from scratch.
- Drafted `src/lib/time.ts` against tests written first for Vancouver's 2026 daylight-saving end, then filled in the planner UI on top of those functions.
- Checked real `Intl` offsets for 14 Oct, 31 Oct, 1 Nov, and 2 Nov 2026 before locking the expected hours into tests.

## Corrected or overridden

- The Vite 8 template ships Oxlint and does not set `"strict": true`. The brief asks for ESLint, Prettier, and strict TypeScript, so Oxlint was removed and `strict` was set in both tsconfigs.
- Latest Vitest (5.x) requires Node 22. The brief requires Node 20 in CI, so Vitest is pinned to 4.1.x, which supports Node 20 and Vite 8. npm 10 then crashed while resolving that pin against Vite's optional Vitest 5 peer (`edgesOut`). `.npmrc` sets `legacy-peer-deps=true` so install and `npm ci` succeed.
- Working hours are treated as `[09:00, 18:00)`, not a closed interval through 18:00. During Pacific daylight time the shared window is 09:00–14:00 in Vancouver; after the clocks fall back it is 09:00–13:00.
- "Current" UTC offsets follow the selected date and time, not the computer's clock. That is what makes a daylight-saving change visible when the date moves. The page still opens on "now" in the browser's time zone.
- On Windows, Vitest 4 fails every suite when the shell cwd is `d:\repositories\tz-bridge` and the real path is `D:\...` (`config` is undefined inside `describe`). `npm test` starts Vitest from `realpathSync.native` so both casings share one module instance. Linux CI is unchanged.
- Copy uses `navigator.clipboard` and falls back to a temporary textarea plus `document.execCommand('copy')`. In the embedded browser used for the UI check, both were denied and the inline error showed. A normal click in Chrome or Firefox should copy. No React Testing Library test was added.

- The fixed São Paulo / Vancouver pair was generalized after review. The local side is `Intl.DateTimeFormat().resolvedOptions().timeZone`, and the other side is `Intl.supportedValuesOf('timeZone')` in a native grouped select. The daylight-saving sentence no longer hardcodes 1 Nov 2026; it compares the selected gap with mid-January. The São Paulo / Vancouver tests stay, because that pair is still the known daylight-saving case.
- Opening the zone list to every IANA id showed a display bug. The gap was rounded to one decimal, so Kathmandu (UTC+5:45) against São Paulo, which is 8 hours 45 minutes, would have read "8.8 hours". `describeOffsetGap` now speaks in whole hours and minutes.
- The daylight-saving sentence built mid-January from the wall-clock year, while the flag used the instant's UTC year. On 31 Dec 2025 at 22:00 in São Paulo the clock is still 2025, but the instant is already 1 Jan 2026 UTC, so the two sentences could disagree. Both now call `januaryReferenceInstant`.
- The README still told the reader to switch GitHub Pages to Actions before the demo link would work. Pages is already on that source and the live URL serves the app, so the sentence now says the workflow deploys it.
- Checked and kept: across the 418 zones this Node runtime returns, no two share a display name, so the select label stays the city. The card still shows the full id. The browser's own list can spell a zone differently (Chrome has `Asia/Katmandu`; this Node has `Asia/Kathmandu`). The UI shows whichever id `Intl` returns, with no rename table. The page still opens on Vancouver unless the browser is already there, in which case the other side is São Paulo.

## My corrections

- [x] What the assistant suggested: ship the fixed São Paulo / Vancouver pair, because that is what the brief names and what is already on `main`.
- [x] What I changed: keep the fuller planner. One side is the browser time zone; the other is any IANA zone, defaulting to Vancouver.
- [x] Why: the required pair is still the default here, and the São Paulo / Vancouver daylight-saving tests still lock the brief. The select is the version to keep.
