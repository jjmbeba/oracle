import { sql } from "drizzle-orm";
import { describe, expect, it } from "vitest";
import {
  checkDatabaseConnection,
  createDatabaseConnection,
  schema,
} from "./index";

describe("db package", () => {
  it("exports the current schema object", () => {
    expect(schema).toEqual({});
  });

  it("requires an explicit database URL", () => {
    expect(() => createDatabaseConnection("")).toThrow("Database URL is required.");
    expect(() => createDatabaseConnection("   ")).toThrow("Database URL is required.");
  });

  it("creates a closeable database connection", async () => {
    const connection = createDatabaseConnection("postgresql://user:pass@localhost:5432/db");

    expect(connection.db).toBeDefined();
    expect(connection.close).toEqual(expect.any(Function));

    await connection.close();
  });

  it("checks connectivity with a trivial query", async () => {
    const queries: unknown[] = [];
    const connection = {
      execute: async (query: unknown) => {
        queries.push(query);
      },
    };

    await checkDatabaseConnection(connection);

    expect(queries).toEqual([sql`select 1`]);
  });
});
