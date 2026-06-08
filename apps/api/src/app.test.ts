import { describe, expect, it } from "vitest";
import { app } from "./app";

describe("api shell", () => {
  it("starts without product routes yet", async () => {
    const response = await app.request("/");

    expect(response.status).toBe(404);
  });
});
