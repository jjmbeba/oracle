import { Hono } from "hono";
import type { Auth } from "./auth";
import type { AppBindings } from "./auth-middleware";
import { regionsRoutes } from "./regions";

export type AppOptions = {
  auth?: Pick<Auth, "handler">;
};

export function createApp(options: AppOptions = {}) {
  const app = new Hono<AppBindings>();
  const auth = options.auth;

  app.get("/health", (context) => {
    return context.json({
      status: "ok",
      service: "api",
    });
  });

  if (auth) {
    app.on(["GET", "POST"], "/api/auth/*", (context) => auth.handler(context.req.raw));
  }

  app.route("/regions", regionsRoutes);

  return app;
}

export const app = createApp();
