export const API_HEALTH_PATH = "/api/health";

export type ApiHealth = {
  status: "ok";
  service: "api";
};

type Fetcher = (input: RequestInfo | URL, init?: RequestInit) => Promise<Response>;

function isApiHealth(value: unknown): value is ApiHealth {
  return (
    typeof value === "object" &&
    value !== null &&
    "status" in value &&
    value.status === "ok" &&
    "service" in value &&
    value.service === "api"
  );
}

export async function fetchApiHealth(fetcher: Fetcher = fetch): Promise<ApiHealth> {
  const response = await fetcher(API_HEALTH_PATH);

  if (!response.ok) {
    throw new Error(`API health check failed with status ${response.status}`);
  }

  const health: unknown = await response.json();

  if (!isApiHealth(health)) {
    throw new Error("API health check returned an invalid response");
  }

  return health;
}
