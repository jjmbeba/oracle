import { serve } from "@hono/node-server";
import { app } from "./app";

const parsedPort = Number.parseInt(process.env.PORT ?? "3000", 10);
const port =
  Number.isInteger(parsedPort) && parsedPort >= 1 && parsedPort <= 65535
    ? parsedPort
    : 3000;

serve({ fetch: app.fetch, port });

console.info(`Oracle API listening on http://localhost:${port}`);
