import { fileURLToPath } from "node:url";
import { config } from "dotenv";
import { checkDatabaseConnection, createDatabaseConnection } from "./index";

config({ path: fileURLToPath(new URL("../../../.env", import.meta.url)), quiet: true });

const databaseUrl = process.env.DATABASE_URL;

if (!databaseUrl) {
  throw new Error("DATABASE_URL is required.");
}

const connection = createDatabaseConnection(databaseUrl);

try {
  await checkDatabaseConnection(connection.db);
  console.log("Database connection ok.");
} finally {
  await connection.close();
}
