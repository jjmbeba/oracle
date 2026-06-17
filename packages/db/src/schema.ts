import * as appSchema from "./app-schema";
import * as authSchema from "./auth-schema";
import * as signalSchema from "./signal-schema";

export * from "./app-schema";
export * from "./auth-schema";
export * from "./signal-schema";

export const schema = {
  ...appSchema,
  ...authSchema,
  ...signalSchema,
};
