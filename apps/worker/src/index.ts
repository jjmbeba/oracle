import { fileURLToPath, pathToFileURL } from "node:url";
import { config } from "dotenv";
import { startWorker } from "./worker";

config({
  path: fileURLToPath(new URL("../../../.env", import.meta.url)),
  quiet: true,
});

export {
  defaultOpenweatherPollIntervalMs,
  defaultPlaceholderIntervalMs,
  defaultSwpcPollIntervalMs,
  defaultUsgsPollIntervalMs,
  maxIntervalMs,
  parseOpenweatherPollIntervalMs,
  parsePlaceholderIntervalMs,
  parseSwpcPollIntervalMs,
  parseUsgsPollIntervalMs,
  readDatabaseUrl,
  readOpenweatherApiKey,
  readOpenweatherPollIntervalMs,
  readSwpcPollIntervalMs,
  readUsgsPollIntervalMs,
} from "./config";
export { createWorkerLogger, serializeError } from "./logger";
export { createScheduler } from "./scheduler";
export { startWorker } from "./worker";
export type { WorkerLogger, WorkerLogRecord } from "./logger";
export type { ScheduledJob, Scheduler } from "./scheduler";
export type { SignalSource, WorkerRuntime, WorkerSignal } from "./worker";

if (import.meta.url === pathToFileURL(process.argv[1] ?? "").href) {
  startWorker();
}
