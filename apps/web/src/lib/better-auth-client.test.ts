import { describe, expect, it } from "vitest";
import { authClient } from "./better-auth-client";

describe("better auth client", () => {
  it("creates a client with expected methods", () => {
    expect(authClient).toBeDefined();
    expect(typeof authClient.getSession).toBe("function");
    expect(typeof authClient.signIn.anonymous).toBe("function");
  });
});
