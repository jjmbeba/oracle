import "dotenv/config";
import { checkDatabaseConnection, createDatabaseConnection } from "./index";

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
