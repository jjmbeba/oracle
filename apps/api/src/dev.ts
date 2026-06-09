import { serve } from "@hono/node-server";
import { createDatabaseConnection } from "@oracle/db";
import { pathToFileURL } from "node:url";
import { createApp } from "./app";
import { createAuth } from "./auth";
import { getAuthEnv, getRequiredEnv } from "./env";
import { loadRootEnv } from "./load-root-env";

import type { ServerType } from "@hono/node-server";

export type ApiRuntime = {
  shutdown(): Promise<void>;
};

export type ApiSignal = "SIGINT" | "SIGTERM";

export type SignalSource = {
  once(signal: ApiSignal, listener: () => void): void;
};

type ExitProcess = (code: 0 | 1) => void;

export type StartApiDevServerOptions = {
  env?: NodeJS.ProcessEnv;
  exitProcess?: ExitProcess;
  logger?: Pick<Console, "error" | "info">;
  signals?: SignalSource;
};

function parsePort(value: string | undefined): number {
  const parsedPort = Number.parseInt(value ?? "3000", 10);

  return Number.isInteger(parsedPort) && parsedPort >= 1 && parsedPort <= 65535 ? parsedPort : 3000;
}

function closeServer(server: ServerType): Promise<void> {
  return new Promise((resolve, reject) => {
    server.close((error?: Error) => {
      if (error) {
        reject(error);
        return;
      }

      resolve();
    });
  });
}

export function startApiDevServer(options: StartApiDevServerOptions = {}): ApiRuntime {
  loadRootEnv();

  const env = options.env ?? process.env;
  const logger = options.logger ?? console;
  const signals = options.signals ?? process;
  const exitProcess =
    options.exitProcess ??
    ((code) => {
      process.exit(code);
    });
  const port = parsePort(env.PORT);
  const connection = createDatabaseConnection(getRequiredEnv("DATABASE_URL", env));
  const auth = createAuth(connection, getAuthEnv(env));
  const app = createApp({ auth });
  const server = serve({ fetch: app.fetch, port });
  let shuttingDown = false;

  logger.info(`Oracle API listening on http://localhost:${port}`);

  const shutdown = async (): Promise<void> => {
    if (shuttingDown) {
      return;
    }

    shuttingDown = true;

    try {
      await closeServer(server);
    } finally {
      await connection.close();
    }

  };

  const handleSignal = (): void => {
    void handleApiSignalShutdown({
      shutdown,
      logger,
      exitProcess,
    });
  };

  signals.once("SIGINT", handleSignal);
  signals.once("SIGTERM", handleSignal);

  return {
    shutdown,
  };
}

export async function handleApiSignalShutdown(options: {
  exitProcess: ExitProcess;
  logger: Pick<Console, "error">;
  shutdown(): Promise<void>;
}): Promise<void> {
  try {
    await options.shutdown();
    options.exitProcess(0);
  } catch (error: unknown) {
    options.logger.error("api.shutdown.failed", error);
    options.exitProcess(1);
  }
}

if (import.meta.url === pathToFileURL(process.argv[1] ?? "").href) {
  startApiDevServer();
}
