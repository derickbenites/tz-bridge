# tz-bridge

[![CI](https://github.com/derickbenites/tz-bridge/actions/workflows/ci.yml/badge.svg)](https://github.com/derickbenites/tz-bridge/actions/workflows/ci.yml)

A small planner for a meeting between your current time zone and any other zone.
Pick a date and time on either side and see the equivalent, the shared working hours, and when daylight saving changes the gap.

Live demo: https://derickbenites.github.io/tz-bridge/

That site is deployed by the Actions workflow on every push to `main`.

## How to run

```bash
npm install
npm run dev
```

Open http://localhost:5173/tz-bridge/ . The `/tz-bridge/` base matches the GitHub Pages project site.

## Scripts

| Script                 | What it does                                   |
| ---------------------- | ---------------------------------------------- |
| `npm run dev`          | Vite dev server                                |
| `npm run build`        | Typecheck with `tsc -b`, then production build |
| `npm run preview`      | Serve the production build                     |
| `npm run lint`         | ESLint                                         |
| `npm run format`       | Prettier write                                 |
| `npm run format:check` | Prettier check                                 |
| `npm run typecheck`    | `tsc --noEmit` for the app and the Vite config |
| `npm run test`         | Vitest                                         |

CI on push and pull request runs lint, typecheck, test, and build on Node 20. Pushes to `main` also deploy `dist` to GitHub Pages.

## Decisions

- Vite, React, and TypeScript in strict mode. No backend: every conversion runs in the browser.
- Time zones go through the native `Intl` API. Moment, Luxon, and date-fns are intentionally absent so the conversion code stays small and dependency-free.
- All time-zone behavior lives in pure functions in `src/lib/time.ts`. The UI only parses the date and time inputs and renders the results.
- Working hours are the half-open local interval 09:00–18:00. A strip hour counts as overlap only when both time zones are inside that interval at the start of the hour.
- The browser time zone comes from `Intl.DateTimeFormat().resolvedOptions().timeZone`. The other side is any IANA zone from `Intl.supportedValuesOf('timeZone')`, grouped in a native select. No city database and no geolocation permission.
- Offsets and the daylight-saving flag follow the selected instant. The flag compares the gap with mid-January of that year, so a pair like São Paulo and Vancouver shows the change across 1 Nov 2026, and a pair with no daylight saving stays quiet.
- Tests cover the library, not the widgets: a normal conversion, Vancouver's daylight-saving end (31 Oct 2026 vs 2 Nov 2026), a midnight date rollover, the overlap window, and the zone catalog. There is no React Testing Library test.

## Deliberately left out

No backend, accounts, or saved meetings. No geolocation beyond the time zone the browser already reports. No end-to-end tests and no internationalization (the copy is English).

With more time I would remember the last pair in `localStorage`, let each side set its own working hours, and add one component test around the copy summary.
