# Provider ID Dedupe with Conservative Fingerprints

Oracle will deduplicate repeated signals by using provider-native identifiers when available, such as USGS GeoJSON feature IDs. When a provider does not expose a clean event ID, Oracle will derive a provider-specific identifier from stable fields, such as SWPC message code and serial number, and fall back to conservative fingerprints only when needed; possible cross-provider duplicates may be flagged but will not be automatically merged in the MVP.

