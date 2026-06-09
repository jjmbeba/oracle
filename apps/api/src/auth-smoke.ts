import { createDatabaseConnection } from "@oracle/db";
import { createApp } from "./app";
import { createAuth } from "./auth";
import { getAuthEnv, getRequiredEnv } from "./env";
import { loadRootEnv } from "./load-root-env";

loadRootEnv();

const connection = createDatabaseConnection(getRequiredEnv("DATABASE_URL"));

try {
  const authEnv = getAuthEnv();
  const origin = new URL(authEnv.baseUrl).origin;
  const auth = createAuth(connection, authEnv);
  const app = createApp({ auth });
  const response = await app.request("/api/auth/sign-in/anonymous", {
    method: "POST",
    headers: {
      origin,
    },
  });

  if (!response.ok) {
    throw new Error(`Anonymous sign-in failed with ${response.status}: ${await response.text()}`);
  }

  const cookie = response.headers.get("set-cookie");

  if (!cookie) {
    throw new Error("Anonymous sign-in did not return a session cookie.");
  }

  const authSession = await auth.api.getSession({
    headers: new Headers({
      cookie,
    }),
  });

  if (!authSession?.user.isAnonymous) {
    throw new Error("Created session did not resolve to an anonymous user.");
  }

  const deleteResponse = await app.request("/api/auth/delete-anonymous-user", {
    method: "POST",
    headers: {
      cookie,
      origin,
    },
  });

  if (!deleteResponse.ok) {
    throw new Error(
      `Anonymous user cleanup failed with ${deleteResponse.status}: ${await deleteResponse.text()}`,
    );
  }

  console.info("Created, resolved, and deleted an anonymous Better Auth session.");
} finally {
  await connection.close();
}
