import { Hono } from "hono";
import type { MiddlewareHandler } from "hono";
import type { Auth } from "./auth";
import type { AppBindings } from "./auth-middleware";
import { regionsRoutes } from "./regions";
import {
  createWatchedRegionsRoutes,
  type WatchedRegionStore,
} from "./watched-regions";

export type WatchedRegionsOptions = {
  store: WatchedRegionStore;
  requireAuth: MiddlewareHandler<AppBindings>;
};

export type AppOptions = {
  auth?: Pick<Auth, "handler">;
  watchedRegions?: WatchedRegionsOptions;
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

  if (options.watchedRegions) {
    const watchedRegionsRoutes = createWatchedRegionsRoutes(options.watchedRegions);
    app.route("/watched-regions", watchedRegionsRoutes);
  }

  return app;
}

export const app = createApp();
