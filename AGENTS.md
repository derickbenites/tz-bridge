# Agent conventions

tz-bridge is a client-only meeting planner. One side is the browser's time zone; the other is any IANA zone the user picks.

## Code

- TypeScript strict mode stays on. Do not weaken `strict`, `noUnusedLocals`, or `noUnusedParameters`.
- Time-zone behavior belongs in pure functions in `src/lib/time.ts`. Components may format and render; they do not reimplement offset or overlap math.
- Use the built-in `Intl` API. Do not add moment, luxon, date-fns, or another date library.
- Do not add a UI library. Style with the plain CSS in `src/index.css`.
- Keep controls labeled and usable from the keyboard.
- Ask before adding a dependency that is not already in `package.json`.

## Tests and commits

- Unit tests live next to the logic (`src/lib/time.test.ts`) and run with Vitest. Cover conversions, the Vancouver daylight-saving change, midnight rollover, and working-hour overlap when you change that behavior.
- Do not add a React Testing Library test unless asked. The README records that choice.
- Make small commits with conventional messages (`feat:`, `fix:`, `ci:`, `docs:`, `chore:`).
- Before a commit that changes behavior, run `npm run lint`, `npm run typecheck`, `npm run test`, and `npm run build`.

## Deploy

- Vite `base` is `/tz-bridge/` so GitHub Pages project sites resolve assets.
- CI is `.github/workflows/ci.yml`. The deploy job runs only on push to `main`.
