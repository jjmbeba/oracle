import { schema, type DatabaseConnection } from "@oracle/db";
import { betterAuth } from "better-auth";
import { drizzleAdapter } from "better-auth/adapters/drizzle";
import { anonymous } from "better-auth/plugins";
import type { AuthEnv } from "./env";

export type Auth = ReturnType<typeof createAuth>;

export function createAuth(connection: Pick<DatabaseConnection, "db">, env: AuthEnv) {
  return betterAuth({
    baseURL: env.baseUrl,
    secret: env.secret,
    trustedOrigins: env.trustedOrigins,
    database: drizzleAdapter(connection.db, {
      provider: "pg",
      schema: {
        user: schema.user,
        session: schema.session,
        account: schema.account,
        verification: schema.verification,
      },
    }),
    plugins: [anonymous()],
  });
}
