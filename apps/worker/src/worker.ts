import { readPlaceholderIntervalMs } from "./config";
import { createWorkerLogger, type WorkerLogger } from "./logger";
import { createScheduler, type Scheduler } from "./scheduler";

export type WorkerRuntime = {
  shutdown(): Promise<void>;
};

export type WorkerSignal = "SIGINT" | "SIGTERM";

export type SignalSource = {
  once(signal: WorkerSignal, listener: () => void): void;
};

export type StartWorkerOptions = {
  env?: NodeJS.ProcessEnv;
  logger?: WorkerLogger;
  scheduler?: Scheduler;
  signals?: SignalSource;
};

export function startWorker(options: StartWorkerOptions = {}): WorkerRuntime {
  const logger = options.logger ?? createWorkerLogger();
  const scheduler =
    options.scheduler ??
    createScheduler({
      logger,
    });
  const signals = options.signals ?? process;
  const placeholderIntervalMs = readPlaceholderIntervalMs(options.env);
  let shuttingDown = false;

  scheduler.registerIntervalJob({
    name: "placeholder",
    intervalMs: placeholderIntervalMs,
    run() {
      return Promise.resolve();
    },
  });

  logger.info("worker.started", {
    metadata: {
      placeholderIntervalMs,
    },
  });

  const shutdown = async (): Promise<void> => {
    if (shuttingDown) {
      return;
    }

    shuttingDown = true;
    logger.info("worker.shutdown.started");
    await scheduler.stop();
    logger.info("worker.shutdown.completed");
  };

  signals.once("SIGINT", () => {
    void shutdown();
  });
  signals.once("SIGTERM", () => {
    void shutdown();
  });

  return {
    shutdown,
  };
}
