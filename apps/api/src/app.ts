import { Hono } from "hono";
import { regionsRoutes } from "./regions";

export const app = new Hono();

app.get("/health", (context) => {
  return context.json({
    status: "ok",
    service: "api",
  });
});

app.route("/regions", regionsRoutes);
