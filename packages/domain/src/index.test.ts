import { describe, expect, it } from "vitest";
import { domainPackageName } from "./index";

describe("domain package", () => {
  it("exports a baseline module", () => {
    expect(domainPackageName).toBe("@oracle/domain");
  });
});
