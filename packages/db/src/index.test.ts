import { describe, expect, it } from "vitest";
import { dbPackageName } from "./index";

describe("db package", () => {
  it("exports a baseline module", () => {
    expect(dbPackageName).toBe("@oracle/db");
  });
});
