import { serve } from "@hono/node-server";
import { app } from "./app";

const port = Number.parseInt(process.env.PORT ?? "3000", 10);

serve({ fetch: app.fetch, port });

console.info(`Oracle API listening on http://localhost:${port}`);
