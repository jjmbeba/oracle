import { ref, type Ref } from "vue";
import { authClient, type AuthClient } from "../lib/better-auth-client";

export type AuthState = "initializing" | "authenticated" | "unavailable";

let initialized = false;
let initPromise: Promise<void> | null = null;

const authState: Ref<AuthState> = ref("initializing");

export function __testReset(): void {
  initialized = false;
  initPromise = null;
  authState.value = "initializing";
}

export function useAnonymousSession(client: AuthClient = authClient) {
  async function initialize(): Promise<void> {
    if (initialized) return;
    if (initPromise) return initPromise;

    initPromise = createSession();
    return initPromise;
  }

  async function createSession(): Promise<void> {
    authState.value = "initializing";

    try {
      const { data: session } = await client.getSession();

      if (session) {
        authState.value = "authenticated";
        initialized = true;
        return;
      }

      const { error } = await client.signIn.anonymous();

      if (!error) {
        authState.value = "authenticated";
      } else {
        authState.value = "unavailable";
      }
    } catch {
      authState.value = "unavailable";
    }

    initialized = true;
  }

  return { authState, initialize };
}
