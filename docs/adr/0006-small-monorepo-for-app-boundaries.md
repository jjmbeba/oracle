# Small Monorepo for App Boundaries

Oracle will use a small monorepo with separate frontend, API, worker, database, and shared domain boundaries. This reflects the product shape: Vue owns the map dashboard, Hono owns the API, a worker owns ingestion, Drizzle/PostgreSQL owns persistence, and shared packages prevent signal and region rules from drifting between processes.

