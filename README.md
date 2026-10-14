# tz-bridge

[![CI](https://github.com/derickbenites/tz-bridge/actions/workflows/ci.yml/badge.svg)](https://github.com/derickbenites/tz-bridge/actions/workflows/ci.yml)

A small planner for meetings between São Paulo and Vancouver.
Pick a date and time in either city and see the other city's equivalent, the shared working hours, and when daylight saving changes the gap.

Live demo: https://derickbenites.github.io/tz-bridge/

GitHub Pages has to be set to deploy from GitHub Actions (Settings → Pages → Build and deployment → Source: GitHub Actions) before that link serves the app.

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
- Working hours are the half-open local interval 09:00–18:00. A strip hour counts as overlap only when both cities are inside that interval at the start of the hour.
- Offsets and the daylight-saving flag follow the selected instant, so choosing a date after 1 Nov 2026 shows Vancouver at UTC−8 and drops the flag. São Paulo stays at UTC−3.
- Tests cover the library, not the widgets: a normal conversion, Vancouver's daylight-saving end (31 Oct 2026 vs 2 Nov 2026), a midnight date rollover, and the overlap window from both cities. There is no React Testing Library test; the hour was spent on the conversion cases and the interface itself.

## Deliberately left out

No backend, accounts, or saved meetings. No extra cities. No end-to-end tests and no internationalization (copy is English, with São Paulo spelled in Portuguese).

With more time I would add a third city without touching the UI state shape, remember the last meeting in `localStorage`, and add one component test around the copy summary plus a keyboard pass on the hour strip.
