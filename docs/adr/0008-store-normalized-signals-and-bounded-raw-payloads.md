# Store Normalized Signals and Bounded Raw Payloads

Oracle will store normalized signal records for product queries and bounded raw provider payloads for debugging, auditability, and future re-normalization. Raw payload retention is seven days by default, unchanged provider responses should be deduplicated when possible, and expired raw payloads should be cleaned up by the worker so the database does not become overloaded by provider history that no longer supports the product.
