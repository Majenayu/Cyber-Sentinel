# CyberSentinel

CyberSentinel is a pnpm monorepo for a cybersecurity operations dashboard,
mobile client, and Express API. The web UI includes threat, reconnaissance,
analysis, and knowledge-management tools; provider-backed features are
available only when their environment variables are configured.

## Components

```text
artifacts/cyber-sentinel/         # React/Vite web UI
artifacts/cyber-sentinel-mobile/ # Expo/React Native client
artifacts/api-server/             # Express 5 API, MongoDB models, routes
lib/api-spec/openapi.yaml         # API contract
lib/api-client-react/             # generated React Query hooks
lib/api-zod/                     # generated Zod schemas
sunday/                          # authorization-first assessment coordinator
```

The API uses MongoDB through Mongoose. Groq is the primary AI integration and
Mistral is optional. Nodemailer/Gmail is optional for intrusion notifications;
Leaflet uses CartoDB tiles for the map views.

## Local setup

Requirements: Node.js 20+, pnpm, and a MongoDB database for API-backed flows.

```bash
pnpm install

# terminal 1
pnpm --filter @workspace/api-server run dev

# terminal 2
pnpm --filter @workspace/cyber-sentinel run dev
```

For the mobile client:

```bash
pnpm --filter @workspace/cyber-sentinel-mobile run dev
```

Root validation and builds:

```bash
pnpm run typecheck
pnpm run build
```

The root install script requires pnpm. The API and web ports are controlled by
their package/start configuration; use the URLs printed by the dev servers
instead of assuming a fixed port.

## Environment

Configure secrets in Replit Secrets or an uncommitted `.env` file:

| Variable | Purpose |
|---|---|
| `MONGODB_URI` | MongoDB connection used by the API |
| `GROQ_API_KEY` | primary AI provider |
| `MISTRAL_API_KEY` | optional secondary AI provider |
| `SMTP_PASSWORD` | optional Gmail app password for alerts |
| `SMTP_EMAIL` | sender address for optional alerts |
| `CYBERSENTINEL_API_SECRET` | API protection secret |
| `SESSION_SECRET` | session signing secret |

Never put credentials in the README, source tree, or client bundle.

## API contract and generated code

Edit `lib/api-spec/openapi.yaml` first, then run the API-spec code-generation
script. Generated hooks and Zod schemas live under `lib/` and should not be
hand-edited.

## Safety and limitations

Tools such as recon, payload analysis, JWT inspection, breach lookup, and QR
tracking are operator-facing utilities. Use them only on systems and data you
are authorized to test. Sunday defaults to dry-run and performs only bounded
public-host DNS/TCP checks; it does not execute exploits, payloads, persistence,
or credential actions.

There is no root automated test command documented by the manifests; current
validation is type-checking plus package build scripts. Features requiring
MongoDB or external providers are unavailable until configured.
