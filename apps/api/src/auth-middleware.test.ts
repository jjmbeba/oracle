import { Hono } from "hono";
import { describe, expect, it } from "vitest";
import {
  createOptionalAuth,
  createRequireAuth,
  getAuthenticatedUser,
  type AppBindings,
  type AuthSession,
  type SessionResolver,
} from "./auth-middleware";

const guestSession = {
  user: {
    id: "guest-user-id",
    name: "Anonymous",
    email: "guest@example.com",
    emailVerified: false,
    image: null,
    isAnonymous: true,
    createdAt: new Date("2026-01-01T00:00:00.000Z"),
    updatedAt: new Date("2026-01-01T00:00:00.000Z"),
  },
  session: {
    id: "session-id",
    token: "session-token",
    userId: "guest-user-id",
    expiresAt: new Date("2026-01-08T00:00:00.000Z"),
    createdAt: new Date("2026-01-01T00:00:00.000Z"),
    updatedAt: new Date("2026-01-01T00:00:00.000Z"),
    ipAddress: null,
    userAgent: null,
  },
} satisfies AuthSession;

describe("auth middleware", () => {
  it("sets anonymous session state on the Hono context", async () => {
    const app = new Hono<AppBindings>();
    const resolveSession: SessionResolver = async () => guestSession;

    app.use("*", createOptionalAuth(resolveSession));
    app.get("/session", (context) => {
      return context.json({
        user: context.get("user"),
        session: context.get("session"),
      });
    });

    const response = await app.request("/session");

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toMatchObject({
      user: {
        id: "guest-user-id",
        isAnonymous: true,
      },
      session: {
        id: "session-id",
        userId: "guest-user-id",
      },
    });
  });

  it("returns unauthorized when a required session is missing", async () => {
    const app = new Hono<AppBindings>();
    const resolveSession: SessionResolver = async () => null;

    app.use("*", createRequireAuth(resolveSession));
    app.get("/protected", (context) => context.json({ ok: true }));

    const response = await app.request("/protected");

    expect(response.status).toBe(401);
    await expect(response.json()).resolves.toEqual({
      error: {
        code: "unauthorized",
        message: "Unauthorized",
      },
    });
  });

  it("exposes the authenticated user inside a required-auth boundary", async () => {
    const app = new Hono<AppBindings>();
    const resolveSession: SessionResolver = async () => guestSession;

    app.use("*", createRequireAuth(resolveSession));
    app.get("/protected", (context) => {
      const user = getAuthenticatedUser(context);

      return context.json({ userId: user.id });
    });

    const response = await app.request("/protected");

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual({
      userId: "guest-user-id",
    });
  });

  it("throws when authenticated user access happens outside auth context", async () => {
    expect(() =>
      getAuthenticatedUser({
        get: () => null,
      } as Parameters<typeof getAuthenticatedUser>[0]),
    ).toThrow("Authenticated user is unavailable outside requireAuth boundary.");
  });
});
