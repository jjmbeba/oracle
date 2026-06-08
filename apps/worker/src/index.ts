import { pathToFileURL } from "node:url";

export function createStartupMessage(): string {
  return "Oracle worker shell ready";
}

if (import.meta.url === pathToFileURL(process.argv[1] ?? "").href) {
  console.info(createStartupMessage());
}
