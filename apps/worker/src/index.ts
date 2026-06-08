import { pathToFileURL } from "node:url";
import { startWorker } from "./worker";

export { defaultPlaceholderIntervalMs, parsePlaceholderIntervalMs } from "./config";
export { createWorkerLogger, serializeError } from "./logger";
export { createScheduler } from "./scheduler";
export { startWorker } from "./worker";
export type { WorkerLogger, WorkerLogRecord } from "./logger";
export type { ScheduledJob, Scheduler } from "./scheduler";
export type { SignalSource, WorkerRuntime, WorkerSignal } from "./worker";

if (import.meta.url === pathToFileURL(process.argv[1] ?? "").href) {
  startWorker();
}
