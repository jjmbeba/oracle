export type LogLevel = "info" | "warn" | "error";

export type SerializedError = {
  name: string;
  message: string;
  stack?: string;
  url?: string;
  errorLabel?: string;
  status?: number;
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
  warn(message: string): void;
  error(message: string): void;
};

export type WorkerLogger = {
  info(event: string, fields?: WorkerLogFields): void;
  warn(event: string, fields?: WorkerLogFields): void;
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

    if (level === "warn") {
      sink.warn(message);
      return;
    }

    sink.info(message);
  };

  return {
    info(event, fields) {
      write("info", event, fields);
    },
    warn(event, fields) {
      write("warn", event, fields);
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
    recordFields.metadata = sanitizeMetadata(fields.metadata);
  }

  return recordFields;
}

export function serializeError(error: unknown): SerializedError {
  const base: SerializedError =
    error instanceof Error
      ? { name: error.name, message: error.message, stack: error.stack }
      : { name: "NonError", message: String(error) };

  if (typeof error === "object" && error !== null) {
    const { url, errorLabel, status } = error as {
      url?: unknown;
      errorLabel?: unknown;
      status?: unknown;
    };
    if (typeof url === "string") base.url = url;
    if (typeof errorLabel === "string") base.errorLabel = errorLabel;
    if (typeof status === "number") base.status = status;
  }

  return base;
}

export function sanitizeMetadata(metadata: Record<string, unknown>): Record<string, unknown> {
  const seen = new WeakSet<object>();

  try {
    const serialized = JSON.stringify(metadata, (_key, value: unknown) => {
      if (typeof value === "bigint") {
        return value.toString();
      }

      if (typeof value === "object" && value !== null) {
        if (seen.has(value)) {
          return "[Circular]";
        }

        seen.add(value);
      }

      return value;
    });

    if (serialized === undefined) {
      return { unserializable: true };
    }

    const parsed = JSON.parse(serialized) as unknown;

    if (isRecord(parsed)) {
      return parsed;
    }
  } catch {
    return { unserializable: true };
  }

  return { unserializable: true };
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}
