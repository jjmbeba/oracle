import {
  createIngestionJob,
  type IngestionJobDeps,
  type ProviderFetcher,
  type ProviderNormalizer,
} from "./create-ingestion-job";
import { normalizeOpenweatherResponse } from "../providers/openweather/normalizer";
import { fetchOpenweatherAlerts } from "../providers/openweather/fetch";
import { readOpenweatherApiKey, readOpenweatherPollIntervalMs } from "../config";
import type { ScheduledJob } from "../scheduler";

export type OpenweatherIngestionJobOptions = IngestionJobDeps & {
  env?: NodeJS.ProcessEnv;
};

export function createOpenweatherIngestionJob(options: OpenweatherIngestionJobOptions): ScheduledJob {
  const env = options.env ?? process.env;
  const intervalMs = readOpenweatherPollIntervalMs(env);
  const apiKey = readOpenweatherApiKey(env);

  if (!apiKey) {
    const { logger } = options;
    return {
      name: "openweather-ingestion",
      intervalMs,
      run() {
        logger.info("openweather.skipped.no_api_key");
      },
    };
  }

  const fetchData: ProviderFetcher = () =>
    fetchOpenweatherAlerts({
      apiKey,
    });

  const normalize: ProviderNormalizer = (data) => normalizeOpenweatherResponse(data);

  return createIngestionJob(
    {
      name: "openweather-ingestion",
      provider: "openweather",
      category: "weather",
      fetchData,
      normalize,
      logPrefix: "openweather",
      intervalMs,
    },
    options,
  );
}
