export type LogLevel = "info" | "error";

export type SerializedError = {
  name: string;
  message: string;
  stack?: string;
};

export type WorkerLogFields = {
  jobName?: string;
  durationMs?: number;
  error?: unknown;
  metadata?: Record<string, unknown>;
};

export type WorkerLogRecord = {
  timestamp: string;
  level: LogLevel;
  service: "worker";
  event: string;
  jobName?: string;
  durationMs?: number;
  error?: SerializedError;
  metadata?: Record<string, unknown>;
};

type ConsoleSink = {
  info(message: string): void;
  error(message: string): void;
};

export type WorkerLogger = {
  info(event: string, fields?: WorkerLogFields): void;
  error(event: string, fields?: WorkerLogFields): void;
};

export type WorkerLoggerOptions = {
  sink?: ConsoleSink;
  now?: () => Date;
};

export function createWorkerLogger(options: WorkerLoggerOptions = {}): WorkerLogger {
  const sink = options.sink ?? console;
  const now = options.now ?? (() => new Date());

  const write = (level: LogLevel, event: string, fields: WorkerLogFields = {}): void => {
    const record: WorkerLogRecord = {
      timestamp: now().toISOString(),
      level,
      service: "worker",
      event,
      ...copyDefinedFields(fields),
    };
    const message = JSON.stringify(record);

    if (level === "error") {
      sink.error(message);
      return;
    }

    sink.info(message);
  };

  return {
    info(event, fields) {
      write("info", event, fields);
    },
    error(event, fields) {
      write("error", event, fields);
    },
  };
}

function copyDefinedFields(fields: WorkerLogFields): Partial<WorkerLogRecord> {
  const recordFields: Partial<WorkerLogRecord> = {};

  if (fields.jobName !== undefined) {
    recordFields.jobName = fields.jobName;
  }

  if (fields.durationMs !== undefined) {
    recordFields.durationMs = fields.durationMs;
  }

  if (fields.error !== undefined) {
    recordFields.error = serializeError(fields.error);
  }

  if (fields.metadata !== undefined) {
    recordFields.metadata = fields.metadata;
  }

  return recordFields;
}

export function serializeError(error: unknown): SerializedError {
  if (error instanceof Error) {
    return {
      name: error.name,
      message: error.message,
      ...(error.stack === undefined ? {} : { stack: error.stack }),
    };
  }

  return {
    name: "NonError",
    message: String(error),
  };
}
