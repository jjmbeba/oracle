const defaultTrustedOrigins = ["http://localhost:5173"];

export type AuthEnv = {
  baseUrl: string;
  secret: string;
  trustedOrigins: string[];
};

export function getRequiredEnv(name: string, env: NodeJS.ProcessEnv = process.env): string {
  const value = env[name];

  if (!value) {
    throw new Error(`${name} is required.`);
  }

  return value;
}

export function getTrustedOrigins(
  value = process.env.BETTER_AUTH_TRUSTED_ORIGINS,
  nodeEnv = process.env.NODE_ENV,
): string[] {
  const parsed = value
    ?.split(",")
    .map((origin) => origin.trim())
    .filter(Boolean);

  if (parsed && parsed.length > 0) {
    return parsed;
  }

  if (nodeEnv === "production") {
    throw new Error("BETTER_AUTH_TRUSTED_ORIGINS is required in production.");
  }

  return defaultTrustedOrigins;
}

export function getAuthEnv(env: NodeJS.ProcessEnv = process.env): AuthEnv {
  return {
    baseUrl: getRequiredEnv("BETTER_AUTH_URL", env),
    secret: getRequiredEnv("BETTER_AUTH_SECRET", env),
    trustedOrigins: getTrustedOrigins(env.BETTER_AUTH_TRUSTED_ORIGINS, env.NODE_ENV),
  };
}
