# Sunday

Sunday is the authorization-first assessment coordinator in CyberSentinel.

## Feature boundary

- Web UI: `sunday/web/Sunday.tsx`
- API coordinator: `sunday/api/sunday.ts`
- Web route wiring: `artifacts/cyber-sentinel/src/App.tsx`
- Navigation wiring: `artifacts/cyber-sentinel/src/components/Sidebar.tsx`
- API router wiring: `artifacts/api-server/src/routes/index.ts`

The artifact-specific source files stay in their owning applications because the
web and API artifacts have separate build tools and dependency graphs. This
directory contains the feature implementation and is the single home for
Sunday-related source and documentation.

## Safety boundary

Sunday defaults to dry-run mode. Active collection is limited to the
operator-selected public-host DNS and bounded TCP reachability checks. It does
not execute payloads, fuzzing, exploitation, persistence, or credential
actions.