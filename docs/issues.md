# Oracle Implementation Issues

These issues break the Oracle PRD into small tracer-bullet slices. They are staged locally before being published to GitHub Issues.

## 1. Bootstrap Monorepo and Tooling

**Type**: AFK  
**Blocked by**: None

## What to build

Create the initial Oracle monorepo structure with package scripts, TypeScript configuration, lint/test baseline, and empty app/package shells.

## Acceptance criteria

- [ ] The workspace contains app shells for the web app, API, and worker.
- [ ] The workspace contains package shells for database and domain code.
- [ ] Shared TypeScript configuration is in place.
- [ ] Basic lint/test scripts exist and can run against the empty workspace.

## 2. Wire Web to API Health Check

**Type**: AFK  
**Blocked by**: 1

## What to build

Add a Hono health endpoint and Vue dashboard shell that calls it, proving the local web/API path works end to end.

## Acceptance criteria

- [ ] The API exposes a health endpoint.
- [ ] The web app calls the health endpoint through the configured API client path.
- [ ] The dashboard shell renders API health status.
- [ ] A test or smoke check verifies the health endpoint response.

## 3. Create Worker Process Skeleton

**Type**: AFK  
**Blocked by**: 1

## What to build

Create the standalone TypeScript worker process with simple scheduled job registration and structured logging.

## Acceptance criteria

- [ ] The worker can be started independently from the API.
- [ ] A scheduled placeholder job runs on an interval.
- [ ] Job success and failure are logged.
- [ ] The worker exits cleanly on process shutdown.

## 4. Set Up PostgreSQL and Drizzle Baseline

**Type**: AFK  
**Blocked by**: 1

## What to build

Add PostgreSQL connection handling, Drizzle schema/migration setup, and a basic integration check.

## Acceptance criteria

- [ ] Drizzle is configured for PostgreSQL.
- [ ] A baseline migration can be generated and applied.
- [ ] The API or a script can verify database connectivity.
- [ ] Database configuration is environment-driven.

## 5. Define Region Catalog

**Type**: AFK  
**Blocked by**: 1

## What to build

Add Oracle's checked-in Region Catalog for countries, curated country groups, and continents.

## Acceptance criteria

- [ ] Countries have canonical IDs and display names.
- [ ] Country groups have canonical IDs, display names, and member countries.
- [ ] Continents have canonical IDs, display names, and member countries.
- [ ] Tests verify membership and canonical ID stability.

## 6. Expose Region Search API

**Type**: AFK  
**Blocked by**: 5

## What to build

Expose domain-shaped JSON endpoints for searching and selecting regions from the Region Catalog.

## Acceptance criteria

- [ ] Users can search countries, country groups, and continents.
- [ ] Region search returns enough data for display and selection.
- [ ] Unknown regions return a clear not-found response.
- [ ] API response shape is covered by tests.

## 7. Build Region Search UI

**Type**: AFK  
**Blocked by**: 2, 6

## What to build

Add region search and selection to the map dashboard shell.

## Acceptance criteria

- [ ] Users can search for supported regions.
- [ ] Users can select a region.
- [ ] The selected region is visible in the dashboard shell.
- [ ] Empty and not-found states are handled.

## 8. Add Better Auth Anonymous Sessions

**Type**: AFK  
**Blocked by**: 4

## What to build

Integrate Better Auth anonymous sessions and prove a guest identity can be created.

## Acceptance criteria

- [ ] Anonymous sessions can be created without signup.
- [ ] Session state is available to API routes that need it.
- [ ] Session configuration uses environment-driven secrets and URLs.
- [ ] Basic auth/session behavior is covered by tests or a smoke check.

## 9. Store Watched Regions

**Type**: AFK  
**Blocked by**: 6, 8

## What to build

Persist watched regions for anonymous sessions, start watchlists empty, support add/remove behavior, and enforce the 10-region limit.

## Acceptance criteria

- [ ] New anonymous sessions start with an empty watchlist.
- [ ] A selected region can be watched.
- [ ] A watched region can be removed.
- [ ] Anonymous sessions cannot watch more than 10 regions.
- [ ] Watched-region behavior is covered by API tests.

## 10. Render Watched Regions UI

**Type**: AFK  
**Blocked by**: 7, 9

## What to build

Display watched regions in the dashboard and support watch/unwatch from the selected region.

## Acceptance criteria

- [ ] Watched regions are visible in the dashboard.
- [ ] The selected region can be watched from the UI.
- [ ] A watched region can be unwatched from the UI.
- [ ] The 10-region limit is communicated clearly.

## 11. Define Signal Domain Model

**Type**: AFK  
**Blocked by**: 1

## What to build

Define the shared signal domain model, including category, scope, severity, confidence, source link, and normalized signal schemas.

## Acceptance criteria

- [ ] Signal category supports earthquakes, weather signals, and space weather.
- [ ] Signal scope supports global, region, point, and geometry.
- [ ] Severity supports Minor, Moderate, Significant, Severe, and Extreme.
- [ ] Confidence supports High, Medium, and Low.
- [ ] Domain schemas are covered by tests.

## 12. Implement Dedupe Rules

**Type**: AFK  
**Blocked by**: 11

## What to build

Add provider-native ID dedupe, provider-specific derived IDs, conservative fingerprint fallback, and possible cross-provider duplicate flags.

## Acceptance criteria

- [ ] Provider-native IDs produce stable dedupe keys.
- [ ] Provider-specific derived IDs can be used when native IDs are absent.
- [ ] Conservative fingerprints can be generated when no stable ID exists.
- [ ] Possible cross-provider duplicates are flagged but not automatically merged.
- [ ] Dedupe behavior is covered by focused tests.

## 13. Create Signal Persistence Schema

**Type**: AFK  
**Blocked by**: 4, 11, 12

## What to build

Add normalized signal persistence tables and helpers.

## Acceptance criteria

- [ ] Normalized signal records can be inserted and updated.
- [ ] Dedupe keys are enforced appropriately.
- [ ] Signal scope and location/geometry/region fields can represent all MVP signal scopes.
- [ ] Persistence behavior is covered by tests.

## 14. Build USGS Provider Adapter

**Type**: AFK  
**Blocked by**: 11, 12

## What to build

Normalize USGS earthquake GeoJSON into Oracle signal events using USGS feature IDs.

## Acceptance criteria

- [ ] USGS earthquake fixtures normalize into Oracle signal events.
- [ ] USGS feature IDs become provider-native dedupe identifiers.
- [ ] Earthquake magnitude maps to Oracle severity.
- [ ] Source links and point locations are preserved.

## 15. Ingest USGS Signals in Worker

**Type**: AFK  
**Blocked by**: 3, 13, 14

## What to build

Poll USGS from the worker, upsert normalized earthquake signals, and record freshness.

## Acceptance criteria

- [ ] The worker can run USGS ingestion.
- [ ] Repeated polls update existing signals instead of duplicating them.
- [ ] Ingestion records freshness for the earthquake category.
- [ ] Ingestion failures are logged without crashing the worker loop.

## 16. Expose Earthquake Feed API

**Type**: AFK  
**Blocked by**: 15

## What to build

Expose a priority-sorted domain JSON feed for earthquake signals.

## Acceptance criteria

- [ ] The feed returns active earthquake signals.
- [ ] Severe signals are prioritized over lower-severity signals.
- [ ] Recency is used within comparable severity and confidence.
- [ ] Feed responses include severity, confidence, source link, and freshness.

## 17. Expose Earthquake GeoJSON Map API

**Type**: AFK  
**Blocked by**: 15

## What to build

Expose a GeoJSON-shaped endpoint for earthquake map points and clustering.

## Acceptance criteria

- [ ] The endpoint returns valid GeoJSON.
- [ ] Earthquake point locations are represented accurately.
- [ ] GeoJSON properties include severity, confidence, category, and source data needed by the map.
- [ ] Endpoint behavior is covered by tests.

## 18. Render Earthquake Map and Feed

**Type**: AFK  
**Blocked by**: 7, 16, 17

## What to build

Render earthquake points/clusters and feed items in the map dashboard.

## Acceptance criteria

- [ ] Earthquake signals appear on the map.
- [ ] Earthquake feed items appear in priority order.
- [ ] Severity, confidence, source links, and freshness are visible.
- [ ] Signal category toggling can show or hide earthquakes.

## 19. Build NOAA SWPC Adapter

**Type**: AFK  
**Blocked by**: 11, 12

## What to build

Normalize NOAA SWPC alerts as global space weather signals, including provider-specific identifiers.

## Acceptance criteria

- [ ] SWPC fixtures normalize into Oracle signal events.
- [ ] SWPC message code and serial number are used where available.
- [ ] Space weather signals use global scope.
- [ ] Source links and issue times are preserved.

## 20. Ingest and Display Space Weather

**Type**: AFK  
**Blocked by**: 15, 18, 19

## What to build

Add worker ingestion, API response, global-context UI, and freshness for space weather.

## Acceptance criteria

- [ ] The worker can ingest SWPC signals.
- [ ] Space weather appears as global context, not country-specific precision.
- [ ] Space weather appears in the signal feed where appropriate.
- [ ] Freshness is visible for space weather.

## 21. Run Weather Provider Evaluation

**Type**: HITL  
**Blocked by**: 11

## What to build

Evaluate Tomorrow.io against Oracle's weather-provider requirements and decide whether to proceed or switch to OpenWeather.

## Acceptance criteria

- [ ] Severe weather signals work for multiple non-U.S. regions.
- [ ] Responses include enough fields for category, title, severity, time, source/authority, and region or geometry.
- [ ] Free or development tier limits are enough for MVP polling.
- [ ] Terms and pricing allow portfolio or demo deployment.
- [ ] The chosen provider is recorded in docs.

## 22. Build Weather Provider Adapter

**Type**: AFK  
**Blocked by**: 12, 21

## What to build

Normalize the chosen weather provider's severe weather responses into Oracle signal events.

## Acceptance criteria

- [ ] Weather provider fixtures normalize into Oracle signal events.
- [ ] Weather signals include severity, confidence, source link, time, and region or geometry where available.
- [ ] Dedupe rules work for repeated weather responses.
- [ ] Provider limitations are documented in adapter tests or docs.

## 23. Ingest and Display Weather Signals

**Type**: AFK  
**Blocked by**: 18, 22

## What to build

Add weather worker ingestion, API responses, map/feed display, and freshness.

## Acceptance criteria

- [ ] The worker can ingest weather signals.
- [ ] Weather signals appear on the map or in region/global UI according to their scope.
- [ ] Weather signals appear in the priority feed.
- [ ] Freshness is visible for weather signals.

## 24. Build Region Dossier Overview Facts

**Type**: AFK  
**Blocked by**: 6, 7

## What to build

Add selected-region overview facts for countries, country groups, and continents.

## Acceptance criteria

- [ ] Country dossiers show supported overview facts when available.
- [ ] Country group and continent dossiers compute facts from member countries where appropriate.
- [ ] Source links are included where applicable.
- [ ] Missing enrichment data is handled gracefully.

## 25. Add Active Signals to Region Dossier

**Type**: AFK  
**Blocked by**: 18, 20, 23, 24

## What to build

Filter active signals by selected region and display them inside the region dossier.

## Acceptance criteria

- [ ] The dossier shows active signals relevant to the selected region.
- [ ] Global signals are shown as global context rather than local events.
- [ ] Active signals include severity, confidence, source links, and freshness.
- [ ] Empty states distinguish no active signals from unavailable provider coverage.

## 26. Implement Risk Scoring

**Type**: AFK  
**Blocked by**: 25

## What to build

Implement 72-hour signal-window risk scoring with worst-signal floor, diminishing additional weight, and tests.

## Acceptance criteria

- [ ] Risk score uses the default 72-hour signal window.
- [ ] The worst active signal sets a meaningful score floor.
- [ ] Additional signals increase the score with diminishing returns.
- [ ] Risk scoring avoids emergency-response or safety-rating semantics.
- [ ] Risk scoring is covered by focused tests.

## 27. Display Risk Score and Risk Level

**Type**: AFK  
**Blocked by**: 24, 26

## What to build

Display risk score and Quiet/Watch/Elevated/High/Critical risk levels in the region dossier.

## Acceptance criteria

- [ ] The dossier shows both risk score and risk level.
- [ ] Risk language is clearly informational.
- [ ] Risk display updates when selected region changes.
- [ ] The UI avoids official warning or safety-rating language.

## 28. Create Watched Region Snapshots

**Type**: AFK  
**Blocked by**: 9, 26

## What to build

Store previous and current signal state for watched regions.

## Acceptance criteria

- [ ] Watched regions have snapshot records.
- [ ] Snapshot generation runs from the worker.
- [ ] Snapshots include enough data to compare signals and risk movement.
- [ ] Snapshot creation is idempotent.

## 29. Generate Change Reports

**Type**: AFK  
**Blocked by**: 28

## What to build

Generate change reports for watched regions by detecting new signals, expired signals, severity changes, and notable risk movement.

## Acceptance criteria

- [ ] New signals are reported.
- [ ] Expired signals are reported.
- [ ] Severity changes are reported.
- [ ] Risk movement is reported only when risk level changes or the score moves by at least 10 points.
- [ ] Change report behavior is covered by tests.

## 30. Display Change Reports

**Type**: AFK  
**Blocked by**: 24, 29

## What to build

Show change reports in watched-region dossiers.

## Acceptance criteria

- [ ] Watched-region dossiers show the latest change report.
- [ ] Non-watched region dossiers do not imply change reports exist.
- [ ] Empty change-report states are clear.
- [ ] Change report content uses Oracle glossary vocabulary.

## 31. Store Raw Provider Payloads

**Type**: AFK  
**Blocked by**: 15, 20, 23

## What to build

Store bounded raw provider payloads for ingested providers and dedupe unchanged responses where possible.

## Acceptance criteria

- [ ] Raw payloads are stored for meaningful fetched responses.
- [ ] Repeated unchanged responses are deduped where provider metadata or content hashes allow it.
- [ ] Raw payload records are linked to provider ingestion context.
- [ ] Raw storage avoids affecting normalized signal queries.

## 32. Clean Up Expired Raw Payloads

**Type**: AFK  
**Blocked by**: 31

## What to build

Add worker cleanup for seven-day raw payload retention.

## Acceptance criteria

- [ ] Raw payloads older than seven days are deleted.
- [ ] Cleanup runs from the worker.
- [ ] Cleanup is safe to run repeatedly.
- [ ] Cleanup behavior is covered by a test or smoke check.

## 33. Polish Map Dashboard Interaction

**Type**: HITL  
**Blocked by**: 23, 27, 30

## What to build

Review and polish dashboard density, panel layout, map controls, toggles, selected-region treatment, and analytical operations tone.

## Acceptance criteria

- [ ] The dashboard feels dark, calm, serious, data-rich, and readable.
- [ ] Map, feed, watched regions, and dossier panels are usable together.
- [ ] Signal toggles and selected-region interactions are clear.
- [ ] UI avoids theatrical sci-fi styling and marketing-page composition.

## 34. Harden API Contract Coverage

**Type**: AFK  
**Blocked by**: 30, 32

## What to build

Ensure dossier, feed, watched-region, change-report, and GeoJSON endpoints have contract coverage.

## Acceptance criteria

- [ ] Dossier endpoints have contract tests.
- [ ] Feed endpoints have contract tests.
- [ ] Watched-region endpoints have contract tests.
- [ ] Change-report endpoints have contract tests.
- [ ] GeoJSON map endpoints have contract tests.

## 35. Run MVP Quality Gate

**Type**: AFK  
**Blocked by**: 33, 34

## What to build

Verify MVP success metrics, source attribution, freshness visibility, language constraints, and out-of-scope boundaries.

## Acceptance criteria

- [ ] Core success metrics from the PRD are checked.
- [ ] Source attribution appears where provider data allows it.
- [ ] Freshness is visible for shown signal categories.
- [ ] The product avoids emergency-response, official-warning, prediction, and safety-rating language.
- [ ] Out-of-scope features are not accidentally included.

