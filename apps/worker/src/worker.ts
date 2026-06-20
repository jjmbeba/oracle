import { createDatabaseConnection } from "@oracle/db";
import {
  readDatabaseUrl,
  readOpenweatherApiKey,
  readOpenweatherPollIntervalMs,
  readSwpcPollIntervalMs,
  readUsgsPollIntervalMs,
} from "./config";
import { createWorkerLogger, type WorkerLogger } from "./logger";
import { createScheduler, type Scheduler } from "./scheduler";
import { createUsgsIngestionJob } from "./jobs/usgs-ingestion";
import { createSwpcIngestionJob } from "./jobs/swpc-ingestion";
import { createOpenweatherIngestionJob } from "./jobs/openweather-ingestion";

export type WorkerRuntime = {
  shutdown(): Promise<void>;
};

export type WorkerSignal = "SIGINT" | "SIGTERM";

export type SignalSource = {
  once(signal: WorkerSignal, listener: () => void): void;
};

type ExitProcess = (code: 0 | 1) => void;

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
  const env = options.env ?? process.env;
  const usgsPollIntervalMs = readUsgsPollIntervalMs(env);
  const swpcPollIntervalMs = readSwpcPollIntervalMs(env);
  const openweatherPollIntervalMs = readOpenweatherPollIntervalMs(env);
  const openweatherApiKey = readOpenweatherApiKey(env);
  let shuttingDown = false;
  let dbConnection: ReturnType<typeof createDatabaseConnection> | undefined;

  const databaseUrl = readDatabaseUrl(env);
  if (!databaseUrl) {
    throw new Error("DATABASE_URL is required. Set it in the environment or .env file.");
  }

  dbConnection = createDatabaseConnection(databaseUrl);

  const usgsJob = createUsgsIngestionJob({
    db: dbConnection.db,
    logger,
    env,
  });

  const swpcJob = createSwpcIngestionJob({
    db: dbConnection.db,
    logger,
    env,
  });

  const openweatherJob = createOpenweatherIngestionJob({
    db: dbConnection.db,
    logger,
    env,
  });

  scheduler.registerIntervalJob(usgsJob);
  scheduler.registerIntervalJob(swpcJob);
  scheduler.registerIntervalJob(openweatherJob);

  logger.info("worker.started", {
    metadata: {
      usgsPollIntervalMs,
      swpcPollIntervalMs,
      openweatherPollIntervalMs,
      openweatherApiKeyConfigured: openweatherApiKey.length > 0,
    },
  });

  const shutdown = async (): Promise<void> => {
    if (shuttingDown) {
      return;
    }

    shuttingDown = true;
    logger.info("worker.shutdown.started");
    try {
      await scheduler.stop();
    } finally {
      if (dbConnection) {
        await dbConnection.close();
      }
    }

    logger.info("worker.shutdown.completed");
  };

  const handleSignal = (): void => {
    void handleSignalShutdown({
      shutdown,
      logger,
      exitProcess: (code) => {
        process.exit(code);
      },
    });
  };

  signals.once("SIGINT", handleSignal);
  signals.once("SIGTERM", handleSignal);

  return {
    shutdown,
  };
}

export async function handleSignalShutdown(options: {
  shutdown(): Promise<void>;
  logger: WorkerLogger;
  exitProcess: ExitProcess;
}): Promise<void> {
  try {
    await options.shutdown();
    options.exitProcess(0);
  } catch (error: unknown) {
    options.logger.error("worker.shutdown.failed", { error });
    options.exitProcess(1);
  }
}
