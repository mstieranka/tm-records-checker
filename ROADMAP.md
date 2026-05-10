# Roadmap

Planned refactors in order of execution:

- [ ] 1. Upgrade to React Router v7
  - [x] Enable `v3_fetcherPersist` future flag (fetcher persistence behavior change)
  - [x] Enable `v3_lazyRouteDiscovery` future flag (route discovery/manifest behavior change)
  - [x] Enable `v3_relativeSplatPath` future flag (relative routing behavior for splat routes change)
  - [x] Enable `v3_singleFetch` future flag (data fetching changes to single fetch)
  - [x] Enable `v3_throwAbortReason` future flag (format of errors thrown on aborted requests change)
  - [x] Enable `v3_routeConfig` future flag (explicit `app/routes.ts` config aligned with React Router v7)
  - [x] Replace deprecations - `json`, `defer`, `SerializeFrom`
  - [ ] Upgrade packages from Remix to React Router v7
- [ ] 2. Rewrite UI using `@shadcn/ui`
- [ ] 3. Migrate database from SQLite to PostgreSQL
- [ ] 4. Move configuration from `config.json` into the database; add initial setup UI (depends on steps 2 and 3)
- [ ] 5. Switch package manager from Bun to `pnpm` (Bun runtime dependency removed by step 3)
