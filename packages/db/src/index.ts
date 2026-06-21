import { sql } from "drizzle-orm";
import { drizzle, type PostgresJsDatabase } from "drizzle-orm/postgres-js";
import postgres, { type Sql } from "postgres";
import { schema } from "./schema";

export { schema };
export { watchedRegion, watchedRegionSnapshot } from "./app-schema";
export type { SnapshotSignalEntry } from "./app-schema";
export { signal } from "./signal-schema";
export { providerFreshness } from "./signal-schema";
export {
  upsertSignal,
  querySignals,
  querySignalFeed,
  upsertProviderFreshness,
  queryProviderFreshness,
} from "./signal-repo";
export type { SignalQueryFilters, SignalFeedFilters, ProviderFreshness } from "./signal-repo";
export { upsertWatchedRegionSnapshot } from "./snapshot-repo";
export type { WatchedRegionSnapshot } from "./snapshot-repo";

export type DatabaseConnection = {
  db: PostgresJsDatabase<typeof schema>;
  close: () => Promise<void>;
};

type DatabaseQueryExecutor = {
  execute: (query: ReturnType<typeof sql>) => Promise<unknown>;
};

const databaseConnectionProbe = sql`select 1`;

export function createDatabaseConnection(databaseUrl: string): DatabaseConnection {
  if (databaseUrl.trim() === "") {
    throw new Error("Database URL is required.");
  }

  let client: Sql;

  try {
    client = postgres(databaseUrl);
  } catch (error) {
    const detail = error instanceof Error ? `: ${error.message}` : "";

    throw new Error(`Invalid database URL${detail}`, { cause: error });
  }

  const db = drizzle(client, { schema });

  return {
    db,
    close: () => client.end(),
  };
}

export async function checkDatabaseConnection(connection: DatabaseQueryExecutor): Promise<void> {
  await connection.execute(databaseConnectionProbe);
}

export type PostgresClient = Sql;
