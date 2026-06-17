import { beforeEach, describe, expect, it } from "vitest";
import type { AuthClient } from "../lib/better-auth-client";
import { useAnonymousSession, __testReset } from "./use-anonymous-session";

function mockClient(overrides: Partial<AuthClient> = {}): AuthClient {
  return {
    getSession: async () => ({ data: null, error: null }),
    signIn: { anonymous: async () => ({ error: null }) },
    ...overrides,
  } as AuthClient;
}

beforeEach(() => {
  __testReset();
});

describe("useAnonymousSession", () => {
  it("resolves authenticated when session already exists", async () => {
    const client = mockClient({
      getSession: async () => ({ data: { user: { id: "u1" } }, error: null }),
    });

    const { initialize, authState } = useAnonymousSession(client);
    await initialize();

    expect(authState.value).toBe("authenticated");
  });

  it("resolves authenticated when sign-in succeeds", async () => {
    const client = mockClient();

    const { initialize, authState } = useAnonymousSession(client);
    await initialize();

    expect(authState.value).toBe("authenticated");
  });

  it("resolves unavailable when sign-in fails", async () => {
    const client = mockClient({
      signIn: {
        anonymous: async () => ({ error: { message: "rate limited" } }),
      },
    });

    const { initialize, authState } = useAnonymousSession(client);
    await initialize();

    expect(authState.value).toBe("unavailable");
  });

  it("resolves unavailable when getSession throws", async () => {
    const client = mockClient({
      getSession: async () => { throw new Error("network error"); },
    });

    const { initialize, authState } = useAnonymousSession(client);
    await initialize();

    expect(authState.value).toBe("unavailable");
  });

  it("resolves unavailable when signIn throws", async () => {
    const client = mockClient({
      signIn: {
        anonymous: async () => { throw new Error("network error"); },
      },
    });

    const { initialize, authState } = useAnonymousSession(client);
    await initialize();

    expect(authState.value).toBe("unavailable");
  });

  it("deduplicates concurrent initialize calls", async () => {
    let getSessionCalls = 0;
    const client = mockClient({
      getSession: async () => {
        getSessionCalls++;
        return { data: { user: { id: "u1" } }, error: null };
      },
    });

    const { initialize } = useAnonymousSession(client);
    await Promise.all([initialize(), initialize()]);

    expect(getSessionCalls).toBe(1);
  });

  it("skips initialization once complete", async () => {
    const client = mockClient({
      getSession: async () => ({ data: { user: { id: "u1" } }, error: null }),
    });

    const { initialize: initA, authState } = useAnonymousSession(client);
    await initA();
    expect(authState.value).toBe("authenticated");

    const { initialize: initB } = useAnonymousSession();
    await initB();
    expect(authState.value).toBe("authenticated");
  });
});
