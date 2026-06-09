import { fileURLToPath } from "node:url";
import { defineConfig } from "drizzle-kit";
import { config } from "dotenv";

config({ path: fileURLToPath(new URL("../../.env", import.meta.url)), quiet: true });

if (!process.env.DATABASE_URL) {
  throw new Error("DATABASE_URL is required for Drizzle commands.");
}

export default defineConfig({
  dialect: "postgresql",
  schema: "./src/schema.ts",
  out: "./drizzle",
  dbCredentials: {
    url: process.env.DATABASE_URL,
  },
});
