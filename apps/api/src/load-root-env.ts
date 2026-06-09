import { fileURLToPath } from "node:url";
import { config } from "dotenv";

const rootEnvPath = fileURLToPath(new URL("../../../.env", import.meta.url));

export function loadRootEnv(path = rootEnvPath): void {
  config({ path, quiet: true });
}
