# Oracle MVP

Oracle is an analyst-style public signal monitoring tool for observing global and regional events from public data sources. The MVP should open directly into a dark, map-first analytical dashboard, not a marketing landing page.

## Core Positioning

Oracle is informational. It is not an emergency-response system, official warning system, safety rating, or prediction product.

## First Screen

The first screen is the map dashboard:

- Global MapLibre map with signal points and clusters.
- Region search and selection.
- Watched regions panel.
- Signal category toggles.
- Priority-sorted signal feed.
- Region dossier for the selected region.
- Visible freshness timestamps.

## Regions

Regions are the primary domain object. The MVP supports:

- Countries.
- Curated country groups, such as East Africa.
- Continents.

Oracle uses a checked-in region catalog as the source of truth for supported regions. External APIs enrich region facts but do not define Oracle's region taxonomy.

Country groups and continents are represented by highlighting their member countries rather than drawing custom merged boundaries.

## Watched Regions

Users can explicitly watch regions. Oracle creates change reports for watched regions.

MVP identity uses Better Auth anonymous sessions:

- Users can watch regions without signing up.
- Anonymous sessions can later upgrade into full accounts.
- Anonymous sessions may watch up to 10 regions.
- Watchlists start empty by default.

## First-Class Signal Categories

The MVP signal categories are:

- Earthquakes.
- Weather signals with global or near-global coverage.
- Space weather signals as global context.

Health signals are a future category. News and geopolitical signals are out of scope for MVP.

## Signal Model

Signals support global, region, point, and geometry scopes. Oracle should not invent precision when a provider only supports a broader scope.

Signal records include:

- Provider.
- Provider event ID when available.
- Dedupe key.
- Category.
- Title.
- Severity.
- Confidence.
- Occurred or issued time.
- Location, geometry, region, or global scope.
- Source link.

Severity uses:

- Minor.
- Moderate.
- Significant.
- Severe.
- Extreme.

Confidence uses:

- High.
- Medium.
- Low.

Confidence measures how much Oracle trusts the normalized signal record. It does not measure severity.

## Risk

Risk score is a relative public-signal intensity score for a region over the signal window. The default signal window is 72 hours, with shorter and longer filters expected later.

Risk score is driven by:

- The worst active signal as a strong floor.
- The diminishing combined weight of additional signals.

Risk level labels are:

- Quiet.
- Watch.
- Elevated.
- High.
- Critical.

Risk is informational and does not predict safety or represent an official danger level.

## Region Dossier

The region dossier is the primary selected-region panel.

MVP dossier sections:

- Overview facts.
- Risk score and risk level.
- Active signals.
- Change report.
- Source links.

Country overview facts include capital, population, languages, currencies, region or subregion, coordinates, flag, and a small set of World Bank indicators.

Country group and continent facts are computed from member countries where appropriate.

AI-generated regional briefings are out of scope for MVP.

## Change Reports

A change report compares a watched region's current signal state with its previous signal state.

It summarizes:

- New signals.
- Expired signals.
- Severity changes.
- Notable risk movement.

Risk movement is notable when the risk level changes or the risk score moves by at least 10 points.

## Data Freshness

Oracle uses provider-specific polling and visible freshness timestamps. It should avoid claiming perfect real-time coverage.

The MVP uses background ingestion as the backbone, with on-demand refresh only as a supplement.

## Storage

Oracle stores normalized signal records for product queries and bounded raw provider payloads for debugging, auditability, and re-normalization.

Raw provider payloads have seven-day retention by default. Unchanged provider responses should be deduplicated where possible, and expired raw payloads should be cleaned up by the worker.

## Architecture

Oracle starts as a small monorepo:

- `apps/web`: Vue 3 frontend.
- `apps/api`: Hono TypeScript API.
- `apps/worker`: scheduled ingestion worker.
- `packages/db`: Drizzle schema and database client.
- `packages/domain`: shared region, signal, scoring, and normalization logic.

Core choices:

- PostgreSQL primary database.
- Drizzle ORM.
- Better Auth anonymous sessions.
- Hono routes as the API contract source.
- Zod for validation and normalization.
- TanStack Query for frontend data fetching and refetching.
- MapLibre GL used directly through a small Vue wrapper.
- Keyed map tile provider, with MapTiler as the first candidate.

## Provider Evaluations

Before committing to Tomorrow.io for weather signals, run a weather provider evaluation that confirms:

- Severe weather signals work for multiple non-U.S. regions.
- Responses include enough fields for category, title, severity, time, source or authority, and region or geometry.
- Free or development tier limits are enough for MVP polling.
- Terms and pricing allow portfolio or demo deployment.

If Tomorrow.io fails, evaluate OpenWeather next.

## Testing Priority

MVP testing should emphasize:

- Provider adapter tests.
- Signal normalization tests.
- Dedupe tests.
- Risk scoring tests.
- API contract tests.

Heavy UI testing can expand after the data paths are stable.

## Out of Scope

The MVP does not include:

- Marketing landing page.
- Arbitrary drawn custom regions.
- User-created country groups.
- Full user accounts as the default identity model.
- AI-generated regional briefings.
- Health signals.
- News or geopolitical signals.
- Heatmaps or risk choropleths.
- SSE or WebSocket live updates.
- BullMQ, Redis, or Valkey queues.
- Per-signal dismiss or read state.

