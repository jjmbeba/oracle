import { createAuthClient } from "better-auth/client";
import { anonymousClient } from "better-auth/client/plugins";

export const authClient = createAuthClient({
  plugins: [anonymousClient()],
});

export type AuthClient = {
  getSession(): ReturnType<typeof authClient.getSession>;
  signIn: {
    anonymous(): ReturnType<typeof authClient.signIn.anonymous>;
  };
};
