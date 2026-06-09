import { describe, expect, it } from "vitest";
import { getAuthEnv, getRequiredEnv, getTrustedOrigins } from "./env";

describe("api env", () => {
  it("requires named environment variables", () => {
    expect(() => getRequiredEnv("MISSING_VALUE", {})).toThrow("MISSING_VALUE is required.");
  });

  it("parses trusted origins from a comma-separated value", () => {
    expect(getTrustedOrigins(" http://localhost:5173, https://example.com ")).toEqual([
      "http://localhost:5173",
      "https://example.com",
    ]);
  });

  it("requires explicit trusted origins in production", () => {
    expect(() => getTrustedOrigins("", "production")).toThrow(
      "BETTER_AUTH_TRUSTED_ORIGINS is required in production.",
    );
  });

  it("reads auth configuration from env", () => {
    expect(
      getAuthEnv({
        BETTER_AUTH_URL: "http://localhost:3000",
        BETTER_AUTH_SECRET: "replace-with-at-least-32-characters",
        BETTER_AUTH_TRUSTED_ORIGINS: "http://localhost:5173",
      }),
    ).toEqual({
      baseUrl: "http://localhost:3000",
      secret: "replace-with-at-least-32-characters",
      trustedOrigins: ["http://localhost:5173"],
    });
  });
});
