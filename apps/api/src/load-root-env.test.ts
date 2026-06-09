import { mkdtempSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { loadRootEnv } from "./load-root-env";

describe("root env loading", () => {
  it("loads an env file without overwriting existing process values", () => {
    const envPath = join(mkdtempSync(join(tmpdir(), "oracle-env-")), ".env");
    const originalExistingValue = process.env.ORACLE_EXISTING_VALUE;
    const originalLoadedValue = process.env.ORACLE_LOADED_VALUE;

    process.env.ORACLE_EXISTING_VALUE = "already-set";
    delete process.env.ORACLE_LOADED_VALUE;
    writeFileSync(envPath, "ORACLE_EXISTING_VALUE=from-file\nORACLE_LOADED_VALUE=from-file\n");

    try {
      loadRootEnv(envPath);

      expect(process.env.ORACLE_EXISTING_VALUE).toBe("already-set");
      expect(process.env.ORACLE_LOADED_VALUE).toBe("from-file");
    } finally {
      if (originalExistingValue === undefined) {
        delete process.env.ORACLE_EXISTING_VALUE;
      } else {
        process.env.ORACLE_EXISTING_VALUE = originalExistingValue;
      }

      if (originalLoadedValue === undefined) {
        delete process.env.ORACLE_LOADED_VALUE;
      } else {
        process.env.ORACLE_LOADED_VALUE = originalLoadedValue;
      }
    }
  });
});
