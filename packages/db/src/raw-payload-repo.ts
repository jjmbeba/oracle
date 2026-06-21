import { createHash } from "node:crypto";
import { lt } from "drizzle-orm";
import type { PostgresJsDatabase } from "drizzle-orm/postgres-js";
import type { SignalCategory } from "@oracle/domain";
import { providerPayload } from "./raw-payload-schema";
import type { schema } from "./schema";

type Database = PostgresJsDatabase<typeof schema>;

type JsonScalar = string | number | boolean | null;
export type JsonValue =
  | JsonScalar
  | readonly JsonValue[]
  | { readonly [key: string]: JsonValue };

export type RawPayloadInput = {
  id: string;
  provider: string;
  category: SignalCategory;
  sourceUrl: string;
  jobName: string;
  httpStatus: number;
  payload: JsonValue;
  fetchedAt: Date;
};

export async function insertRawPayload(
  db: Database,
  input: RawPayloadInput,
): Promise<{ inserted: boolean }> {
  const contentHash = createHash("sha256")
    .update(JSON.stringify(input.payload))
    .digest("hex");
  const [row] = await db
    .insert(providerPayload)
    .values({
      id: input.id,
      provider: input.provider,
      category: input.category,
      sourceUrl: input.sourceUrl,
      contentHash,
      jobName: input.jobName,
      httpStatus: input.httpStatus,
      payload: input.payload,
      fetchedAt: input.fetchedAt,
    })
    .onConflictDoNothing({
      target: [
        providerPayload.provider,
        providerPayload.sourceUrl,
        providerPayload.contentHash,
      ],
    })
    .returning({ id: providerPayload.id });
  return { inserted: !!row };
}

export async function deleteExpiredRawPayloads(
  db: Database,
  cutoff: Date,
): Promise<{ deletedCount: number }> {
  const deleted = await db
    .delete(providerPayload)
    .where(lt(providerPayload.fetchedAt, cutoff))
    .returning({ id: providerPayload.id });
  return { deletedCount: deleted.length };
}
