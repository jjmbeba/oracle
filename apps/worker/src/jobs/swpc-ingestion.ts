import { createIngestionJob, type IngestionJobDeps } from "./create-ingestion-job";
import type { ProviderFetcher, ProviderNormalizer } from "./create-ingestion-job";
import { normalizeSwpcResponse } from "../providers/swpc/normalizer";
import { fetchSwpcAlerts } from "../providers/swpc/fetch";
import { readSwpcPollIntervalMs } from "../config";

const SWPC_FETCH: ProviderFetcher = () => fetchSwpcAlerts();
const SWPC_NORMALIZE: ProviderNormalizer = (data) => normalizeSwpcResponse(data);

export type SwpcIngestionJobOptions = IngestionJobDeps & {
  env?: NodeJS.ProcessEnv;
};

export function createSwpcIngestionJob(options: SwpcIngestionJobOptions) {
  const intervalMs = readSwpcPollIntervalMs(options.env);
  return createIngestionJob(
    {
      name: "swpc-ingestion",
      provider: "noaa-swpc",
      category: "space-weather",
      fetchData: SWPC_FETCH,
      normalize: SWPC_NORMALIZE,
      logPrefix: "swpc",
      intervalMs,
    },
    options,
  );
}
