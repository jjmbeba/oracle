# Simple Worker Scheduling Before Queues

Oracle will start with simple scheduled jobs in a separate TypeScript worker process rather than BullMQ and Redis/Valkey. This is enough for provider polling and watched-region snapshots in the MVP, while keeping the ingestion logic portable if durable queues become necessary later.

