# Background Ingestion with On-Demand Refresh

Oracle will use background ingestion as the backbone for provider data and watched-region snapshots, with on-demand refresh used only to fill gaps or update a selected region. This avoids turning every user interaction into provider API traffic and gives change reports a reliable previous state to compare against.

