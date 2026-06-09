import type { MiddlewareHandler } from "hono";
import type { Auth } from "./auth";

export type AuthSession = Awaited<ReturnType<Auth["api"]["getSession"]>>;
export type AuthUser = NonNullable<AuthSession>["user"];
export type Session = NonNullable<AuthSession>["session"];

export type AppBindings = {
  Variables: {
    user: AuthUser | null;
    session: Session | null;
  };
};

export type SessionResolver = (headers: Headers) => Promise<AuthSession>;

async function setAuthContext(
  context: Parameters<MiddlewareHandler<AppBindings>>[0],
  resolveSession: SessionResolver,
): Promise<AuthSession> {
  const authSession = await resolveSession(context.req.raw.headers);

  context.set("user", authSession?.user ?? null);
  context.set("session", authSession?.session ?? null);

  return authSession;
}

export function createOptionalAuth(
  resolveSession: SessionResolver,
): MiddlewareHandler<AppBindings> {
  return async (context, next) => {
    await setAuthContext(context, resolveSession);
    await next();
  };
}

export function createRequireAuth(resolveSession: SessionResolver): MiddlewareHandler<AppBindings> {
  return async (context, next) => {
    const authSession = await setAuthContext(context, resolveSession);

    if (!authSession) {
      return context.json(
        {
          error: {
            code: "unauthorized",
            message: "Unauthorized",
          },
        },
        401,
      );
    }

    await next();
  };
}

export function getAuthenticatedUser(
  context: Parameters<MiddlewareHandler<AppBindings>>[0],
): AuthUser {
  const user = context.get("user");

  if (!user) {
    throw new Error("Authenticated user is unavailable outside requireAuth boundary.");
  }

  return user;
}

export function createAuthMiddleware(auth: Auth) {
  const resolveSession: SessionResolver = (headers) => auth.api.getSession({ headers });

  return {
    optionalAuth: createOptionalAuth(resolveSession),
    requireAuth: createRequireAuth(resolveSession),
  };
}
