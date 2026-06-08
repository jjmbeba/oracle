# Oracle PRD

## Problem Statement

People who want to monitor public signals across the world have to jump between disconnected maps, feeds, agency pages, weather services, country references, and indicator databases. That makes it hard to understand what is happening in a region, what changed recently, how serious the current public signals appear to be, and which source supports each claim.

Oracle should provide an analyst-style public signal monitoring workspace that is map-first, region-centered, source-aware, and honest about freshness and uncertainty. It must help a user watch countries, curated country groups, and continents without presenting itself as an emergency-response system, official warning system, prediction product, or safety rating.

## Solution

Oracle will open directly into a dark analytical map dashboard. Users can inspect a global signal view, select a region, watch up to 10 regions through Better Auth anonymous sessions, and view a region dossier with overview facts, active signals, risk score, change report, and source links.

The MVP will focus on three first-class signal categories: earthquakes, globally or near-globally covered weather signals, and space weather signals as global context. Oracle will normalize public provider data into a shared signal model, deduplicate repeated provider records, score regional signal intensity over a 72-hour signal window, and show visible freshness timestamps instead of claiming perfect real-time coverage.

## Success Metrics

- Provider evaluations confirm that each MVP provider has suitable coverage, response shape, limits, pricing, and deployment terms before Oracle depends on it.
- Provider ingestion jobs complete successfully at least 95% of the time during normal development and demo use.
- Each signal category shown in the dashboard includes a visible freshness timestamp.
- At least 95% of normalized signal events include a dedupe key, severity label, confidence label, signal scope, occurred or issued time, and source link when the provider exposes one.
- Repeated polls of the same provider event do not create duplicate active signals.
- Weather signals work for multiple non-U.S. regions before weather is treated as an MVP-ready category.
- Region dossiers render for countries, curated country groups, and continents from the region catalog.
- Country dossiers include the agreed overview facts when the enrichment providers expose them.
- Watched regions produce change reports after their signal state changes.
- Change reports call out new signals, expired signals, severity changes, and notable risk movement without reporting small risk-score noise as meaningful change.
- The map dashboard loads with global signal points or clusters, region search, signal category toggles, signal feed, watched regions, and the selected region dossier.
- Users can select and watch a region from an anonymous session without creating a full account.
- Anonymous sessions enforce the 10 watched-region MVP limit.
- API responses for core dossier, feed, watched-region, change-report, and map-layer endpoints are covered by contract tests.
- Provider adapter, dedupe, risk scoring, and change-report behavior are covered by focused tests before heavy UI test investment.
- Oracle avoids emergency-response, official-warning, prediction, or safety-rating language in the product experience.

## User Stories

1. As a visitor, I want Oracle to open directly into the map dashboard, so that I can start monitoring public signals immediately.
2. As a visitor, I want Oracle to create an anonymous session without requiring signup, so that I can use watched regions without account friction.
3. As a visitor, I want my anonymous session to be upgradeable later, so that I can keep my watched regions if full accounts are added.
4. As a visitor, I want my watchlist to start empty, so that Oracle does not assume which regions I care about.
5. As a visitor, I want to search for countries, country groups, and continents, so that I can quickly find the region I want to inspect.
6. As a visitor, I want to select a region, so that the dashboard can focus the dossier and feed on that region.
7. As a visitor, I want to watch a selected region, so that Oracle can monitor it over time.
8. As a visitor, I want to watch up to 10 regions in an anonymous session, so that I can monitor a useful set of places without creating unbounded background work.
9. As a visitor, I want to remove a watched region, so that my watchlist stays relevant.
10. As a visitor, I want to see the global signal view on a map, so that I can understand worldwide public signal activity spatially.
11. As a visitor, I want signal points and clusters on the map, so that the map remains readable at different zoom levels.
12. As a visitor, I want selected countries to be highlighted, so that I can see the geographic boundary of the selected region.
13. As a visitor, I want country groups and continents to highlight member countries, so that Oracle does not imply custom merged boundaries.
14. As a visitor, I want signal category toggles, so that I can focus the map on earthquakes, weather signals, or space weather context.
15. As a visitor, I want severe and extreme signals to stand out visually, so that high-priority public signals are easy to notice.
16. As a visitor, I want space weather to be shown as global context, so that Oracle does not invent country-level precision.
17. As a visitor, I want the signal feed to be priority-sorted, so that active severe signals do not get buried by newer minor signals.
18. As a visitor, I want recency to matter within comparable severity and confidence, so that the signal feed still feels current.
19. As a visitor, I want each signal to show severity, so that I can understand how important or disruptive it may be within its category.
20. As a visitor, I want each signal to show confidence, so that I can understand how much Oracle trusts the normalized record.
21. As a visitor, I want confidence to be separate from severity, so that a severe but messy signal is not confused with a high-quality record.
22. As a visitor, I want each signal to include a source link when available, so that I can verify the public source.
23. As a visitor, I want locationless and global signals to be displayed honestly, so that Oracle does not fake geographic precision.
24. As a visitor, I want the region dossier to be the dominant selected-region panel, so that I can understand a region rather than only seeing dots and a feed.
25. As a visitor, I want the region dossier to show overview facts, so that I understand the selected country, country group, or continent.
26. As a visitor, I want country overview facts such as capital, population, languages, currencies, region, subregion, coordinates, flag, and selected indicators, so that the dossier has useful context.
27. As a visitor, I want country group and continent facts to be computed from member countries where appropriate, so that group dossiers are useful without depending on an external group API.
28. As a visitor, I want the region dossier to show active signals, so that I can see what is currently affecting the selected region.
29. As a visitor, I want the region dossier to show a risk score and risk level, so that I can quickly gauge recent public-signal intensity.
30. As a visitor, I want risk level labels such as Quiet, Watch, Elevated, High, and Critical, so that the score is understandable at a glance.
31. As a visitor, I want the risk score to be driven by the worst active signal plus the diminishing weight of additional signals, so that one extreme event and many smaller events are both represented sensibly.
32. As a visitor, I want Oracle to make clear that risk is informational, so that I do not mistake it for a safety rating or official danger level.
33. As a visitor, I want the default signal window to be 72 hours, so that the dashboard balances recency with enough event density.
34. As a visitor, I want shorter and longer signal windows later, so that I can inspect different time horizons after the MVP.
35. As a visitor, I want change reports for watched regions, so that I can see what changed since the previous signal state.
36. As a visitor, I want change reports to summarize new signals, expired signals, severity changes, and notable risk movement, so that I can focus on meaningful updates.
37. As a visitor, I want risk movement to be called out only when the risk level changes or the score changes by at least 10 points, so that change reports do not become noisy.
38. As a visitor, I want visible freshness timestamps, so that I know how recently Oracle updated the data.
39. As a visitor, I want Oracle to avoid claiming perfect real-time coverage, so that I can trust the product's honesty.
40. As a visitor, I want weather signals to use global or near-global coverage, so that non-U.S. regions do not appear unsupported by design.
41. As a developer, I want weather provider evaluation criteria, so that Oracle does not depend on a provider before coverage, response shape, limits, pricing, and deployment terms are understood.
42. As a developer, I want provider adapters to normalize responses into the domain signal model, so that provider quirks do not leak into persistence or UI response shapes.
43. As a developer, I want provider-native identifiers used for dedupe when available, so that repeated polls update the same signal.
44. As a developer, I want conservative provider-specific fingerprints when provider-native identifiers are unavailable, so that Oracle reduces duplicate spam without merging distinct events too aggressively.
45. As a developer, I want possible cross-provider duplicates to be flagged but not automatically merged in the MVP, so that source disagreement stays visible.
46. As a developer, I want raw provider payloads retained for seven days, so that recent ingestion issues can be debugged and re-normalized without overloading the database.
47. As a developer, I want unchanged provider responses deduplicated where possible, so that polling does not create unnecessary storage growth.
48. As a developer, I want expired raw payloads cleaned up by the worker, so that retention limits are enforced automatically.
49. As a developer, I want background ingestion to be the backbone, so that change reports have reliable previous signal states.
50. As a developer, I want on-demand refresh as a supplement, so that selected regions can fill gaps without making user clicks the primary provider traffic source.
51. As a developer, I want TanStack Query refetching instead of SSE or WebSockets in the MVP, so that frontend freshness matches provider polling intervals without realtime infrastructure.
52. As a developer, I want GeoJSON-shaped endpoints for map layers, so that MapLibre can consume map data naturally.
53. As a developer, I want domain-shaped JSON for dossiers, feeds, watched regions, and change reports, so that non-map UI is not forced into a map data shape.
54. As a developer, I want provider adapter, scoring, dedupe, and API contract tests to come first, so that the riskiest data behavior is protected early.
55. As a portfolio viewer, I want Oracle to feel calm, serious, data-rich, and readable, so that it demonstrates sophisticated frontend and systems thinking.

## Implementation Decisions

- Oracle is a Vue 3 frontend backed by a TypeScript Hono API.
- Oracle is organized as a small monorepo with separate frontend, API, worker, database, and shared domain boundaries.
- The frontend owns the map dashboard, region selection, watched-region interactions, signal feed, region dossier, and freshness display.
- The API owns anonymous-session-aware product endpoints, watched-region mutations, dossier responses, feed responses, change report responses, and map-layer responses.
- A separate TypeScript worker owns scheduled provider ingestion, watched-region snapshots, cleanup of expired raw payloads, and background recomputation work.
- PostgreSQL is the primary database from the MVP.
- Drizzle is used for database access and schema management.
- Better Auth anonymous sessions are used for MVP identity, with optional full account upgrade later.
- Anonymous sessions may watch up to 10 regions.
- Watched regions are server-backed rather than local-only browser state.
- Hono route definitions are the source of truth for the API contract, with OpenAPI and client artifacts generated where useful.
- Zod is used for validation and normalization schemas.
- TanStack Query is used for frontend data fetching, caching, and refetching.
- SSE and WebSocket streams are out of scope for the MVP.
- MapLibre GL is used directly through a small local Vue wrapper.
- The MVP map prioritizes signal points and signal clusters, with selected-region highlighting second.
- Heatmaps and risk choropleths are out of scope for the MVP.
- A keyed map tile provider is used, with MapTiler as the first candidate.
- The region catalog is checked in and acts as Oracle's source of truth for countries, country groups, and continents.
- External APIs enrich region facts but do not define Oracle's region taxonomy.
- Country groups and continents are represented by highlighting member countries.
- Provider adapters normalize provider responses into the domain signal model before persistence or UI shaping.
- The MVP first-class signal categories are earthquakes, weather signals, and space weather signals.
- Health signals are a future category and are out of scope for the MVP.
- News and geopolitical signals are out of scope for the MVP.
- Weather signals require global or near-global coverage and may use a keyed provider.
- Tomorrow.io is the first weather provider candidate, with OpenWeather as fallback if the provider evaluation fails.
- Weather provider evaluation must confirm non-U.S. coverage, response shape, free or development tier feasibility, and portfolio/demo deployment terms.
- Space weather is global context rather than region-specific scoring precision.
- Signals support global, region, point, and geometry scopes.
- Signal severity uses Minor, Moderate, Significant, Severe, and Extreme.
- Signal confidence uses High, Medium, and Low.
- Confidence measures normalized record quality and is separate from severity.
- Risk score is calculated over a 72-hour default signal window.
- Future signal window filters should support shorter and longer windows.
- Risk scoring uses a hybrid model: the worst active signal sets a strong floor, while additional signals increase the score with diminishing returns.
- Risk level labels are Quiet, Watch, Elevated, High, and Critical.
- Change reports are generated for watched regions.
- Change reports summarize new signals, expired signals, severity changes, and notable risk movement.
- Risk movement is notable when the risk level changes or the risk score changes by at least 10 points.
- Oracle stores normalized signal records for product queries.
- Oracle stores bounded raw provider payloads for debugging, auditability, and future re-normalization.
- Raw provider payload retention is seven days by default.
- Unchanged provider responses should be deduplicated when possible.
- Expired raw provider payloads are cleaned up by the worker.
- Repeated signals are deduplicated by provider-native identifiers when available.
- When provider-native identifiers are unavailable, provider-specific stable identifiers or conservative fingerprints are used.
- Possible cross-provider duplicates may be flagged but are not automatically merged in the MVP.
- USGS GeoJSON feature IDs are used as earthquake provider-native identifiers.
- NOAA SWPC message code and serial number are used as a provider-specific identifier where applicable.
- Raw payload storage is intentionally bounded to avoid overloading PostgreSQL.
- Background ingestion is the backbone for provider data and watched-region snapshots.
- On-demand refresh is a supplement for filling gaps or updating a selected region.
- Simple scheduled jobs in a separate worker process are used before BullMQ, Redis, or Valkey.
- The map dashboard uses a dark analytical operations tone, avoiding theatrical sci-fi styling.
- Oracle uses Tunez selectively as a reference for Better Auth anonymous sessions and project ergonomics.

## Testing Decisions

- The highest-value testing seams are provider adapters, signal normalization, dedupe behavior, risk scoring, API contracts, and product-level API responses.
- Provider adapter tests should verify external provider response fixtures are converted into the correct domain signal model.
- Signal normalization tests should verify severity labels, confidence labels, signal scope, source links, time fields, and location or region fields.
- Dedupe tests should verify provider-native ID dedupe, provider-specific derived identifiers, conservative fingerprint fallback, and non-merging of possible cross-provider duplicates.
- Risk scoring tests should verify worst-signal floors, diminishing additional signal weight, risk level thresholds, and notable risk movement thresholds.
- Change report tests should verify new signals, expired signals, severity changes, and notable risk movement.
- Region catalog tests should verify supported region IDs, country group membership, continent membership, and member-country highlighting expectations.
- API contract tests should verify domain-shaped JSON responses for region dossiers, watched regions, signal feeds, and change reports.
- Map endpoint tests should verify GeoJSON-shaped responses for map layers.
- Worker tests should verify ingestion orchestration, snapshot generation, raw payload retention cleanup, and safe handling of unchanged provider responses.
- Better Auth integration tests should verify anonymous-session watchlist behavior, watchlist limits, and upgrade-ready identity assumptions where practical.
- UI tests should expand after data paths are stable, focusing on user-observable behavior rather than implementation details.
- Map dashboard UI tests should eventually cover selecting regions, toggling signal categories, watching and unwatching regions, viewing the dossier, and seeing freshness timestamps.
- Tests should prefer external behavior at the highest useful seam instead of asserting implementation details inside adapters, stores, or components.
- Existing project conventions from Tunez should be inspected before finalizing the test runner and test layout.

## Out of Scope

- A marketing landing page.
- An emergency-response workflow.
- Official warning or safety-rating claims.
- Predictive risk modeling.
- Arbitrary drawn custom regions.
- User-created country groups.
- Full user accounts as the default MVP identity model.
- AI-generated regional briefings.
- Health signals.
- News signals.
- Geopolitical signals.
- Heatmaps.
- Risk choropleths.
- SSE or WebSocket live updates.
- BullMQ, Redis, or Valkey queues.
- Per-signal dismiss state.
- Per-signal read state.
- Automatic cross-provider signal merging.
- Unbounded raw provider payload retention.
- Direct dependence on public OpenStreetMap tiles.

## Further Notes

Oracle should use its glossary vocabulary consistently. In particular, use "Change Report" instead of "sweep", "Provider Evaluation" instead of "spike", "Region" instead of generic area/location language, and "Confidence" only for normalized record quality.

The first implementation pass should inspect Tunez for Better Auth anonymous-session patterns and useful project ergonomics, then reuse those patterns selectively. Oracle should not copy Tunez wholesale because its core boundaries include map interaction, provider ingestion, worker scheduling, region snapshots, and public-signal normalization.

The PRD is local-only and has not been published to an issue tracker.
