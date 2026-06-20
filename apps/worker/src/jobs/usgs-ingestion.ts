import { createIngestionJob, type IngestionJobDeps } from "./create-ingestion-job";
import { normalizeUsgsResponse } from "../providers/usgs/normalizer";
import { fetchUsgsSignals } from "../providers/usgs/fetch";
import { readUsgsPollIntervalMs } from "../config";
import type { ProviderFetcher, ProviderNormalizer } from "./create-ingestion-job";

const USGS_FETCH: ProviderFetcher = () => fetchUsgsSignals();
const USGS_NORMALIZE: ProviderNormalizer = (data) => normalizeUsgsResponse(data);

export type UsgsIngestionJobOptions = IngestionJobDeps & {
  env?: NodeJS.ProcessEnv;
};

export function createUsgsIngestionJob(options: UsgsIngestionJobOptions) {
  const intervalMs = readUsgsPollIntervalMs(options.env);
  return createIngestionJob(
    {
      name: "usgs-ingestion",
      provider: "usgs",
      category: "earthquake",
      fetchData: USGS_FETCH,
      normalize: USGS_NORMALIZE,
      logPrefix: "usgs",
      intervalMs,
    },
    options,
  );
}
