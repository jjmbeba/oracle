import { describe, expect, it } from "vitest";
import { createStartupMessage } from "./index";

describe("worker shell", () => {
  it("has a startup message", () => {
    expect(createStartupMessage()).toContain("Oracle worker");
  });
});
