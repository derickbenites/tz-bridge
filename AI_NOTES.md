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
- "Current" UTC offsets follow the selected date and time, not the computer's clock. That is what makes the 1 Nov 2026 change visible when the date moves. The page still opens on "now" in Vancouver.
- Copy uses `navigator.clipboard` and falls back to a temporary textarea plus `document.execCommand('copy')`. In the embedded browser used for the UI check, both were denied and the inline error showed. A normal click in Chrome or Firefox should copy. No React Testing Library test was added.

## My corrections

- [ ] What the assistant suggested:
- [ ] What I changed:
- [ ] Why:
