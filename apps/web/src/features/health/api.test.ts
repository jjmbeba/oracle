import { describe, expect, it } from "vitest";
import { API_HEALTH_PATH, fetchApiHealth } from "./api";

describe("api health client", () => {
  it("calls the configured API health path", async () => {
    const calls: Array<RequestInfo | URL> = [];
    const fetcher = async (input: RequestInfo | URL) => {
      calls.push(input);

      return Response.json({ status: "ok", service: "api" });
    };

    await fetchApiHealth(fetcher);

    expect(calls).toEqual([API_HEALTH_PATH]);
  });

  it("parses a successful health response", async () => {
    const health = await fetchApiHealth(async () => {
      return Response.json({ status: "ok", service: "api" });
    });

    expect(health).toEqual({ status: "ok", service: "api" });
  });

  it("rejects a failed health response", async () => {
    await expect(
      fetchApiHealth(async () => {
        return new Response(null, { status: 503 });
      }),
    ).rejects.toThrow("API health check failed with status 503");
  });

  it("rejects a malformed health response", async () => {
    await expect(
      fetchApiHealth(async () => {
        return Response.json({ status: "down", service: "api" });
      }),
    ).rejects.toThrow("API health check returned an invalid response");
  });
});
