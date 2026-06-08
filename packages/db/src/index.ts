import { sql } from "drizzle-orm";
import { drizzle, type PostgresJsDatabase } from "drizzle-orm/postgres-js";
import postgres, { type Sql } from "postgres";
import { schema } from "./schema";

export { schema };

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

  const client = postgres(databaseUrl);
  const db = drizzle(client, { schema });

  return {
    db,
    close: () => client.end(),
  };
}

export async function checkDatabaseConnection(
  connection: DatabaseQueryExecutor,
): Promise<void> {
  await connection.execute(databaseConnectionProbe);
}

export type PostgresClient = Sql;
