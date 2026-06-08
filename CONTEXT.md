# Oracle

Oracle is an analyst-style public signal monitoring tool for observing global and regional events from public data sources. It is informational, not an emergency-response or life-safety system.

## Language

**Public Signal Monitoring**:
Observing events and indicators from public data sources to build situational awareness.
_Avoid_: Emergency response, official warning system

**Signal Event**:
A public data item that represents something happening at a time and, when available, a place.
_Avoid_: Incident, alert

**Signal Scope**:
The geographic reach of a signal event. Oracle supports global, region, point, and geometry scopes so signals can be shown without inventing precision.
_Avoid_: Required coordinates, fake location

**Provider Adapter**:
A boundary that translates a provider's response into Oracle signal events without owning persistence or UI response shape.
_Avoid_: API wrapper, importer

**Provider Evaluation**:
A focused check that determines whether a provider is suitable for Oracle before the app depends on it. Provider evaluations examine coverage, response shape, limits, pricing, and deployment terms.
_Avoid_: Spike, experiment

**Confidence**:
A High, Medium, or Low quality label for how much Oracle trusts a normalized signal record. Confidence reflects source reliability, completeness, freshness, location precision, normalization quality, and duplicate or corroboration state; it does not measure severity.
_Avoid_: Probability, certainty, severity

**Severity**:
A label for how important or disruptive a signal may be within its category. Oracle uses Minor, Moderate, Significant, Severe, and Extreme as shared severity labels across signal categories.
_Avoid_: Confidence, risk score, danger level

**Signal Category**:
A kind of public signal that Oracle treats as a first-class event stream. The MVP signal categories are earthquakes, weather alerts, and space weather.
_Avoid_: Data layer, feed type

**Weather Signal**:
A first-class signal category for severe weather information with global or near-global coverage. Oracle may use a keyed weather provider for this category.
_Avoid_: U.S.-only alert, local weather

**Space Weather Signal**:
A first-class signal category for solar and geomagnetic conditions that Oracle treats as global context.
_Avoid_: Country space alert, regional space weather

**Health Signal**:
A future signal category for public disease outbreak and pandemic information from authoritative health sources. Health signals are not part of the MVP.
_Avoid_: Pandemic tracker, medical alert

**Region**:
The primary area of interest that a user monitors for public signals and changing conditions. A region may be a country, a known country group, or a continent.
_Avoid_: Area, location, place, bounding box

**Region Catalog**:
Oracle's curated source of truth for supported regions, including country IDs, display names, country group membership, and continent membership. External country and indicator APIs enrich regions but do not define the catalog.
_Avoid_: Dynamic country list, provider geography

**Region Dossier**:
The primary summary view for a selected region. The MVP dossier includes overview facts, risk score, active signals, change report, and source links.
_Avoid_: Profile, detail page, info card

**Overview Facts**:
Basic descriptive facts shown in a region dossier. Country facts include capital, population, languages, currencies, region or subregion, coordinates, flag, and a small set of indicators; country group and continent facts are computed from member countries where appropriate.
_Avoid_: Encyclopedia entry, static trivia

**Regional Briefing**:
A future generated summary of a region's dossier and signal changes. Regional briefings are not part of the MVP.
_Avoid_: AI summary, automated analysis

**Source Link**:
A link to the public source behind a signal, fact, score input, or dossier claim.
_Avoid_: Citation decoration, reference

**Watched Region**:
A region that a user has explicitly chosen to monitor over time. Oracle creates change reports for watched regions, and anonymous sessions may watch up to 10 regions in the MVP.
_Avoid_: Saved area, tracked location

**Anonymous Session**:
A guest identity that lets a user watch regions and receive change reports without signing up. An anonymous session may later be upgraded into a full account.
_Avoid_: Local-only profile, temporary browser state

**Country Group**:
A curated, named cluster of countries that users monitor as a single region, such as East Africa. Country groups are represented by highlighting their member countries rather than drawing custom merged boundaries.
_Avoid_: Custom region, saved area

**Risk Score**:
A relative public-signal intensity score for a region over a recent time window. The score is driven by the worst active signal plus the diminishing combined weight of additional signals; it is informational and does not predict safety or represent an official danger level.
_Avoid_: Danger score, threat level, safety rating

**Risk Level**:
A plain-language label paired with a region's risk score. Oracle uses Quiet, Watch, Elevated, High, and Critical as region risk levels.
_Avoid_: Alert level, threat level, safety status

**Change Report**:
A comparison of a region's current signal state against its previous signal state. It summarizes new signals, expired signals, severity changes, and notable risk movement when the risk level changes or the risk score moves by at least 10 points.
_Avoid_: Sweep, scan, delta

**Map Dashboard**:
The primary Oracle workspace where users view the map, choose regions, inspect signals, and monitor watched regions.
_Avoid_: Landing page, home page, marketing page

**Analytical Operations Tone**:
Oracle's visual tone: dark, calm, serious, data-rich, and readable. It should feel like an analytical monitoring workspace without theatrical sci-fi styling.
_Avoid_: Marketing hero, sci-fi console, decorative chaos

**Global Signal View**:
The map-level view of active public signals across the world. Analytical panels become region-scoped when a region is selected.
_Avoid_: Global feed, world report

**Signal Cluster**:
A map grouping of nearby signal events used to keep the global signal view readable. Signal clusters are visual summaries, not separate signal events.
_Avoid_: Heatmap, risk blob

**Signal Feed**:
A priority-sorted list of signal events. Active severe signals appear before lower-priority items, with recency used within comparable severity and confidence.
_Avoid_: Pure timeline, activity log

**Freshness**:
The visible recency of Oracle's signal data, usually shown as the last time a signal category or region view was updated. Oracle should describe freshness honestly rather than claiming perfect real-time coverage.
_Avoid_: Real-time guarantee, live guarantee

**Signal Window**:
The time period Oracle uses to evaluate recent public-signal activity for a region. The default signal window is 72 hours, with shorter and longer windows expected later.
_Avoid_: History range, date filter
