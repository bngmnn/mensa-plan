# Copilot instructions

## Commands

This repository uses npm workspaces.

### Root workspace

```bash
npm run dev
npm run build
npm run test
npm run typecheck
```

### API workspace (`@mensa/api`)

```bash
npm run dev --workspace @mensa/api
npm run build --workspace @mensa/api
npm run test --workspace @mensa/api
npm run typecheck --workspace @mensa/api
```

Run a single API test file:

```bash
npm run test --workspace @mensa/api -- test/app.test.ts
```

Run a single API test by name:

```bash
npm run test --workspace @mensa/api -- -t "serves locations and menu data"
```

### Web workspace (`@mensa/web`)

```bash
npm run dev --workspace @mensa/web
npm run build --workspace @mensa/web
npm run test --workspace @mensa/web
npm run typecheck --workspace @mensa/web
```

Run a single web test file:

```bash
npm run test --workspace @mensa/web -- src/App.test.ts
```

## High-level architecture

- `packages/shared/src/contracts.ts` is the shared contract layer. It defines the Zod schemas and TypeScript types for locations, dishes, menu responses, and health responses. Treat this package as the source of truth for shapes used by both apps.
- `apps/api` is a Fastify service that turns the STWHH mensa HTML page into a typed internal API. `src/app.ts` defines the routes, `src/menu-source.ts` fetches upstream HTML, `src/menu-parser.ts` converts the DOM into normalized menu data, and `src/menu-service.ts` adds date normalization plus a 10-minute in-memory cache with stale fallback behavior.
- `apps/web` is a Vue 3/Vite client that consumes the API rather than scraping upstream directly. `src/api.ts` fetches `/api/v1/locations/:locationId/menu`, parses the JSON again with the shared Zod schema, and `src/composables/useMenu.ts` owns loading, error, refresh, and derived stats state for `App.vue`.
- The current flow is: shared schema change -> API route payloads -> web fetch parsing -> Vue rendering. If you add fields to menu data, update `@mensa/shared` first, then wire the API parser/service output, then update the web UI and tests.

## Key conventions

- Keep IDs, supported locations, and upstream URL generation in `apps/api/src/locations.ts`. Route handlers and parsers reuse those helpers instead of hardcoding location metadata in multiple places.
- The current product is single-location by default: `DEFAULT_LOCATION_ID` is `164` (Mensa Finkenau), the readiness check uses that location, and the web client also defaults `fetchMenu()` to `164`. Multi-location work needs changes on both API and web sides.
- API handlers return payloads parsed through shared Zod schemas. When changing an endpoint, keep the schema and the emitted response in sync rather than adding ad hoc fields.
- `MenuService` is the boundary for upstream fetching behavior. Cache TTL, stale-cache fallback, and day normalization live there; `menu-parser.ts` should stay focused on HTML-to-data transformation.
- The parser is intentionally defensive: missing or malformed pieces of a dish are dropped field-by-field or skipped entirely instead of emitting partial invalid records.
- Web data access is centralized in `apps/web/src/api.ts` and `apps/web/src/composables/useMenu.ts`. `src/api.ts` reads `VITE_API_BASE_URL` and otherwise falls back to `http://localhost:3001`; UI components such as `DishCard.vue` are mostly presentational and expect already-normalized typed data.
- API tests prefer `buildApp()` plus Fastify `inject()` with a fake `MenuServiceShape` instead of starting a real server. Parser coverage lives in fixture-based tests under `apps/api/test`.
- Web tests mount `App.vue` with Vue Test Utils and mock `window.fetch`; they assert rendered output from the typed API response rather than calling internal composables directly.
