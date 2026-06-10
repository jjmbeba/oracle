# Weather Provider Evaluation

Date: 2026-06-10

## Summary

Oracle evaluated Tomorrow.io first and OpenWeather second against the MVP weather-provider gate from issue #10.

Outcome:

- Tomorrow.io fails the MVP gate on documented non-U.S. severe-weather coverage.
- OpenWeather passes the MVP gate and is the selected weather provider for Oracle's MVP.
- Live OpenWeather `4.0` probes now confirm non-U.S. alert support and usable alert-detail payloads for normalization.

## Sources Reviewed

Tomorrow.io:

- [Weather API overview](https://www.tomorrow.io/weather-api/)
- [Tomorrow.io docs index](https://docs.tomorrow.io/llms.txt)
- [Rate Limiting & Tokens](https://docs.tomorrow.io/reference/rate-limiting.md)
- [Retrieve Events (Basic)](https://docs.tomorrow.io/reference/get-events.md)
- [Severe Weather Events](https://docs.tomorrow.io/reference/insights-categories-overview.md)
- [Set Up Severe Weather Alerts Around a Geofence](https://docs.tomorrow.io/recipes/set-up-severe-weather-alerts-around-a-geofence.md)

OpenWeather:

- [One Call API 4.0](https://openweathermap.org/api/one-call-4)
- [Pricing](https://openweathermap.org/price)

## Evaluation Matrix

| Criterion | Tomorrow.io | OpenWeather | Notes |
| --- | --- | --- | --- |
| Severe/weather-alert coverage for multiple non-U.S. regions | Fail | Pass on docs, pending live proof | Tomorrow.io documents many severe-weather categories as limited to the United States, Canada, and Europe, and its severe-alert recipe says the collection mainly covers U.S. NWS reports. OpenWeather documents national alert sources across many countries, including Brazil, Germany, Japan, and Kenya. |
| Response shape maps to Oracle `NormalizedSignal` | Pass with caveats | Pass | Both providers expose event title, timing, geometry/location, and source-ish fields. Tomorrow.io shape is more insight-centric and category-dependent. OpenWeather exposes a simpler government-alert shape. |
| Free or development tier feasibility for MVP polling | Unclear | Pass with caveats | Tomorrow.io documents plan-based hour/day limits but does not expose concrete public limits in the reviewed docs. OpenWeather documents free self-service access and broader paid developer tiers, but the exact One Call commercial fit still needs account verification. |
| Portfolio/demo deployment terms | Unclear | Pass with caveats | Both providers publicly market developer/app use. Neither reviewed page provided a narrow Oracle-specific legal answer, so final deployment comfort should be confirmed during account setup. |
| Live probe evidence across four non-U.S. regions | Fail | Pass | Tomorrow.io authenticated but rejected the documented category-name query shape for Events API usage. OpenWeather `4.0` current requests succeeded for all four regions, and alert-detail payloads were confirmed live for Brazil and Germany. |

## Local Probe Readiness

Live probes were part of the issue's acceptance bar. During this evaluation, the local workspace did expose both expected key names:

- `TOMORROW_API_KEY`
- `OPENWEATHER_API_KEY`

Values were not printed. Probes were run with redacted URLs only.

## Live Probe Evidence

Probe locations:

- Kenya: Nairobi (`-1.286389, 36.817223`)
- Japan: Tokyo (`35.6764, 139.65`)
- Brazil: Brasilia (`-15.793889, -47.882778`)
- Germany: Berlin (`52.52, 13.405`)

### OpenWeather

Redacted request shape:

`https://api.openweathermap.org/data/4.0/onecall/current?lat={lat}&lon={lon}&appid=[REDACTED]`

Live result:

- Kenya: current payload returned, no usable alert IDs at probe time
- Japan: current payload returned, no usable alert IDs at probe time
- Brazil: current payload returned, one alert ID returned
- Germany: current payload returned, one alert ID returned

Follow-up auth check:

`https://api.openweathermap.org/data/2.5/weather?lat=52.52&lon=13.405&appid=[REDACTED]`

Result:

- Successful baseline weather response for Berlin/Mitte

Interpretation:

- The supplied OpenWeather key is valid for baseline weather endpoints.
- The same key is valid for the `4.0` current endpoint and returns live alert IDs in at least two non-U.S. regions.
- The alert-detail endpoint now returns usable alert payloads for those live alert IDs.

Alert-detail probe shape:

`https://api.openweathermap.org/data/4.0/onecall/alert/{alert_id}?appid=[REDACTED]`

Alert-detail result:

- Brazil alert ID: success
- Germany alert ID: success

Representative live fields observed:

- Brazil:
  - `sender_name`: `Instituto Nacional de Meteorologia`
  - `event`: empty string
  - `start` / `end`: present
  - `description`: localized array present (`pt-BR`)
  - `tags`: `["Wind"]`
- Germany:
  - `sender_name`: `Deutscher Wetterdienst`
  - `event`: empty string
  - `start` / `end`: present
  - `description`: localized array present, including `en`
  - `tags`: `["Thunderstorm", "Wind"]`

Interpretation:

- OpenWeather 4.0 now provides enough live data to confirm Oracle can normalize non-U.S. alerts from multiple regions.
- `event` may be empty, so Oracle should derive the display title from `tags` and/or the preferred localized description when `event` is blank.
- The alert `id` returned by the current endpoint is a strong provider-native dedupe identifier.

### Tomorrow.io

Redacted request shape:

`https://api.tomorrow.io/v4/events?location={lat},{lon}&insights=wind,thunderstorms,floods,temperature,winter,marine,fog&apikey=[REDACTED]`

Live result for all four locations:

- `400 Invalid Query Parameters`
- Error detail: `.query.insights[0] should match format "uuid"`

Follow-up auth check:

`https://api.tomorrow.io/v4/weather/realtime?location=52.52,13.405&apikey=[REDACTED]`

Result:

- Successful authenticated response with realtime weather data

Interpretation:

- The Tomorrow.io key is valid.
- The live Events API behavior did not accept the documented category-name style used in the reviewed docs, and instead demanded UUID-shaped `insights` values.
- That means Oracle does not currently have a straightforward, validated way to call Tomorrow.io's severe-weather events endpoint from this workspace without extra provider-specific setup.

## Tomorrow.io Findings

### Coverage

Tomorrow.io's official severe-weather category page documents region availability per category:

- `Wind`, `Winter`, `Thunderstorms`, `Floods`, `Temperature`, `Marine`, and `Fog`: United States, Canada, Europe
- `Air`, `Tropical`, `Tornado`, and `Special`: United States and Canada only

That misses the MVP requirement for multiple non-U.S. regions with broader global or near-global support.

The official geofence-alert recipe is even narrower:

> "Note that currently our collection mainly covers US weather reports issued by NWS. This will be extended soon..."

That is a hard blocker for Oracle's MVP weather bar.

### Response Shape

Tomorrow.io's `Retrieve Events (Basic)` docs expose a structured event feed with:

- `insight`
- `startTime`
- `endTime`
- `updateTime`
- `severity`
- `certainty`
- `urgency`
- `eventValues.title`
- `eventValues.location`

That is enough to see a plausible adapter path, but the shape is provider-insight-specific rather than a plainly documented global government-alert feed.

### Limits and Commercial Fit

Tomorrow.io's rate-limit docs say requests are constrained by the account plan and that remaining-limit headers are available only for Enterprise accounts. The reviewed docs did not publish concrete free-tier hour/day numbers for this workflow, so MVP polling capacity remains unclear without an authenticated account.

### Oracle Mapping Feasibility

| Oracle field | Tomorrow.io mapping |
| --- | --- |
| `category` | `weather` |
| `title` | `eventValues.title` or category-derived title |
| `severity` | `severity` (`extreme`, `severe`, `moderate`, `minor`, `unknown`) with `unknown` requiring an Oracle policy |
| `confidence` | Derived from `certainty` (`observed`, `likely`, `possible`, `unlikely`, `unknown`) |
| `effectiveAt` | `updateTime` or `startTime`, depending on adapter policy |
| `issuedAt` | `updateTime` |
| `occurredAt` | `startTime` |
| `scope` | `geometry` from `eventValues.location` when present; possibly `region` only if geometry is absent and geocodes are stable |
| `sourceLink` | Not clearly documented in the reviewed examples |
| Dedupe input | Provider-derived from insight/category plus stable event identity fields; no obvious globally documented native event ID in the reviewed example |

### Tomorrow.io Verdict

Fail for issue #10.

Reason:

- Documented alert coverage does not meet Oracle's non-U.S. MVP requirement.
- Live API behavior adds more friction: the key is valid, but the Events API rejected the category-name query shape and demanded UUID-style insights.
- Public docs do not provide enough evidence that a simple, globally suitable severe-weather feed is available for Oracle's target regions.

## OpenWeather Findings

### Coverage

OpenWeather's One Call 4.0 docs describe official weather-alert support through the One Call product family and expose:

- `data.alerts` IDs on the current/timeline endpoints
- a dedicated alert-detail endpoint at `onecall/alert/{alert_id}`

The docs also publish a country-by-country alert-source list. During source review, the official page explicitly included Brazil, Germany, Japan, and Kenya, which matches the geographically diverse non-U.S. regions this issue wanted us to probe.

That makes OpenWeather the stronger documented fallback candidate.

### Response Shape

OpenWeather documents a compact alert schema:

- `alerts.sender_name`
- `alerts.event`
- `alerts.start`
- `alerts.end`
- `alerts.description`
- `alerts.tags`

The docs also describe location-level alert retrieval for a selected coordinate. This is a better fit for Oracle than Tomorrow.io's subscription/insight-first event model because the response is already shaped like government alert records.

### Limits and Commercial Fit

OpenWeather's pricing page documents:

- Free access for everyone with `60 API calls/minute` and `1,000,000 calls/month` for baseline weather APIs
- Self-service `Startup`, `Developer`, `Professional`, and `Expert` subscription tiers
- Published higher-volume tiers up to `100,000` calls/minute and `3B` calls/month
- Enterprise service with contract-based terms

This is enough to show a plausible self-service and upgrade path for MVP polling. The live probes also confirmed that the subscribed account can call `4.0` current endpoints successfully.

### Oracle Mapping Feasibility

| Oracle field | OpenWeather mapping |
| --- | --- |
| `category` | `weather` |
| `title` | Alert-detail `event` when present; otherwise derive from `tags` and/or preferred localized `description` |
| `severity` | Derived from alert-detail `tags` and authority/event text; no first-class provider severity enum is documented |
| `confidence` | Likely `high` when sourced from official agencies, with caveats when alert detail is sparse |
| `effectiveAt` | Alert-detail `start` |
| `issuedAt` | Alert-detail `start` absent a separate issued timestamp |
| `occurredAt` | Usually not distinct from alert-detail `start` |
| `scope` | Current endpoint is point-scoped and returns associated alert IDs; MVP can safely treat these alerts as point-scoped to the queried coordinates |
| `sourceLink` | Alert-detail `sender_name` is documented; a direct source URL is not documented in the reviewed shape |
| Dedupe input | Alert ID from the `4.0` current endpoint is a strong provider-native identifier |

### OpenWeather Verdict

Pass on documentation review and live validation.

Reason:

- Official docs support non-U.S. government-alert coverage.
- Live `4.0` current responses now prove non-U.S. alert presence for Brazil and Germany.
- Live alert-detail payloads confirm usable `id`, `sender_name`, `start`, `end`, `description`, and `tags` fields.
- Alert payload shape is comparatively direct and adapter-friendly.
- Public pricing and enterprise paths look workable for MVP/demo usage.
- The current local key works for baseline endpoints and for `4.0` current requests.
- The subscribed `4.0` key now works end to end for the validated live alert samples.

## Recommendation

OpenWeather is ready to unblock the weather adapter issue.

Next step:

1. Record OpenWeather as the chosen MVP weather provider.
2. Start the weather adapter issue against OpenWeather `4.0`.
3. In the adapter, handle empty `event` values by deriving a display title from `tags` and/or localized descriptions.
4. Use the OpenWeather alert `id` as the provider-native dedupe key.

The correct issue outcome is now `OpenWeather selected`.
