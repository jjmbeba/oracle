# TanStack Query Refetch Before Realtime Streams

Oracle will use TanStack Query refetching for MVP data freshness instead of SSE or WebSocket streams. Provider data is already refreshed on minute-scale intervals, so query caching, refetch intervals, and visible freshness provide enough responsiveness without adding realtime stream infrastructure too early.

