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

  it("wraps malformed database URL errors", () => {
    let error: unknown;

    try {
      createDatabaseConnection("not a url");
    } catch (caughtError) {
      error = caughtError;
    }

    expect(error).toBeInstanceOf(Error);
    expect((error as Error).message).toMatch(/^Invalid database URL/);
    expect((error as Error).cause).toBeDefined();
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
