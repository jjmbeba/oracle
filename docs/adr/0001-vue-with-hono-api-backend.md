# Vue with Hono API Backend

Oracle will start as a Vue frontend backed by a TypeScript Hono API instead of a frontend-only application. The backend is needed early because Oracle uses anonymous sessions, server-backed watched regions, keyed provider calls, caching, and change reports; Hono keeps that backend small while still supporting a backend-for-frontend architecture.

