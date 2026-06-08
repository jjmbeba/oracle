import { describe, expect, it } from "vitest";
import { app } from "./app";

describe("api shell", () => {
  it("exposes API health", async () => {
    const response = await app.request("/health");

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual({
      status: "ok",
      service: "api",
    });
  });

  it("starts without product routes yet", async () => {
    const response = await app.request("/");

    expect(response.status).toBe(404);
  });
});
