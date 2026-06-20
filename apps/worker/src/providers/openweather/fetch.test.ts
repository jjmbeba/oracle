import { describe, expect, it, vi } from "vitest";
import brazilFixture from "./__fixtures__/alert-brazil.json";
import germanyFixture from "./__fixtures__/alert-germany.json";
import {
  defaultOpenweatherProbeCoordinates,
  fetchOpenweatherAlerts,
  type OpenweatherFetchPayload,
} from "./fetch";

const BRAZIL_LAT = -15.793889;
const BRAZIL_LON = -47.882778;
const GERMANY_LAT = 52.52;
const GERMANY_LON = 13.405;

function makeJsonResponse(data: unknown): Response {
  return {
    ok: true,
    json: () => Promise.resolve(data),
  } as Response;
}

function makeErrorResponse(status: number, statusText: string): Response {
  return {
    ok: false,
    status,
    statusText,
  } as Response;
}

describe("defaultOpenweatherProbeCoordinates", () => {
  it("includes the four non-U.S. probe regions", () => {
    expect(defaultOpenweatherProbeCoordinates).toEqual([
      { lat: -1.286389, lon: 36.817223 },
      { lat: 35.6764, lon: 139.65 },
      { lat: -15.793889, lon: -47.882778 },
      { lat: 52.52, lon: 13.405 },
    ]);
  });
});

describe("fetchOpenweatherAlerts", () => {
  it("queries the current endpoint for each coordinate", async () => {
    const mockFetch = vi.fn().mockResolvedValue(makeJsonResponse({ data: [{ alerts: [] }] }));

    await fetchOpenweatherAlerts({
      fetchFn: mockFetch,
      apiKey: "test-key",
    });

    const calledUrls = mockFetch.mock.calls.map((call) => call[0] as string);
    expect(calledUrls).toHaveLength(4);
    for (const coord of defaultOpenweatherProbeCoordinates) {
      const expected = `https://api.openweathermap.org/data/4.0/onecall/current?lat=${coord.lat}&lon=${coord.lon}&appid=test-key`;
      expect(calledUrls).toContain(expected);
    }
  });

  it("fetches alert detail for each unique alert id returned by current", async () => {
    const currentByCoord: Record<string, string[]> = {
      "lat=-1.286389&lon=36.817223": ["alert-1"],
      "lat=35.6764&lon=139.65": ["alert-2"],
      "lat=-15.793889&lon=-47.882778": ["alert-1"],
      "lat=52.52&lon=13.405": [],
    };
    const detailByAlert: Record<string, unknown> = {
      "alert-1": { id: "alert-1" },
      "alert-2": { id: "alert-2" },
    };

    const mockFetch = vi.fn().mockImplementation(async (url: string) => {
      if (url.includes("/alert/")) {
        const alertId = decodeURIComponent(url.split("/alert/")[1]!.split("?")[0]!);
        return makeJsonResponse(detailByAlert[alertId] ?? { id: alertId });
      }
      for (const [query, alertIds] of Object.entries(currentByCoord)) {
        if (url.includes(query)) {
          return makeJsonResponse({ data: [{ alerts: alertIds }] });
        }
      }
      return makeJsonResponse({ data: [{ alerts: [] }] });
    });

    const result = await fetchOpenweatherAlerts({
      fetchFn: mockFetch,
      apiKey: "test-key",
    });

    const calledUrls = mockFetch.mock.calls.map((call) => call[0] as string);
    const detailUrls = calledUrls.filter((url) => url.includes("/alert/"));
    expect(detailUrls).toEqual([
      "https://api.openweathermap.org/data/4.0/onecall/alert/alert-1?appid=test-key",
      "https://api.openweathermap.org/data/4.0/onecall/alert/alert-2?appid=test-key",
    ]);

    const payload = result.data as OpenweatherFetchPayload;
    expect(payload.alerts).toHaveLength(2);
  });

  it("encodes alert ids in the detail URL", async () => {
    const mockFetch = vi.fn().mockImplementation(async (url: string) => {
      if (url.includes("/alert/")) {
        return makeJsonResponse({ id: "8B46C632-DCA7-44D7-8BDF-02445621BAFF" });
      }
      if (url.includes("lat=52.52")) {
        return makeJsonResponse({
          data: [{ alerts: ["8B46C632-DCA7-44D7-8BDF-02445621BAFF"] }],
        });
      }
      return makeJsonResponse({ data: [{ alerts: [] }] });
    });

    await fetchOpenweatherAlerts({
      fetchFn: mockFetch,
      apiKey: "test-key",
    });

    const detailCall = mockFetch.mock.calls.find((call) => (call[0] as string).includes("/alert/"));
    expect(detailCall?.[0]).toBe(
      "https://api.openweathermap.org/data/4.0/onecall/alert/8B46C632-DCA7-44D7-8BDF-02445621BAFF?appid=test-key",
    );
  });

  it("returns fetched alerts with their coordinates as [lng, lat]", async () => {
    const mockFetch = vi.fn().mockImplementation(async (url: string) => {
      if (url.includes("/alert/")) {
        const alertId = decodeURIComponent(url.split("/alert/")[1]!.split("?")[0]!);
        if (alertId === "brazil-1") return makeJsonResponse(brazilFixture);
        if (alertId === "germany-1") return makeJsonResponse(germanyFixture);
        return makeJsonResponse({ id: alertId });
      }
      if (url.includes("lat=-15.793889")) {
        return makeJsonResponse({ data: [{ alerts: ["brazil-1"] }] });
      }
      if (url.includes("lat=52.52")) {
        return makeJsonResponse({ data: [{ alerts: ["germany-1"] }] });
      }
      return makeJsonResponse({ data: [{ alerts: [] }] });
    });

    const result = await fetchOpenweatherAlerts({
      fetchFn: mockFetch,
      apiKey: "test-key",
    });

    const payload = result.data as OpenweatherFetchPayload;
    expect(payload.alerts).toHaveLength(2);

    const brazil = payload.alerts.find((a) => a.coordinates[1] === BRAZIL_LAT);
    expect(brazil).toBeDefined();
    expect(brazil!.coordinates).toEqual([BRAZIL_LON, BRAZIL_LAT]);

    const germany = payload.alerts.find((a) => a.coordinates[1] === GERMANY_LAT);
    expect(germany).toBeDefined();
    expect(germany!.coordinates).toEqual([GERMANY_LON, GERMANY_LAT]);
  });

  it("returns empty payload when no alerts are reported", async () => {
    const mockFetch = vi.fn().mockResolvedValue(makeJsonResponse({ data: [{ alerts: [] }] }));

    const result = await fetchOpenweatherAlerts({
      fetchFn: mockFetch,
      apiKey: "test-key",
    });

    const payload = result.data as OpenweatherFetchPayload;
    expect(payload.alerts).toEqual([]);
    expect(mockFetch).toHaveBeenCalledTimes(4);
  });

  it("treats a current response with no `data` field as no alerts", async () => {
    const mockFetch = vi.fn().mockResolvedValue(makeJsonResponse({}));

    const result = await fetchOpenweatherAlerts({
      fetchFn: mockFetch,
      apiKey: "test-key",
    });

    const payload = result.data as OpenweatherFetchPayload;
    expect(payload.alerts).toEqual([]);
  });

  it("ignores non-array `data` in the current response", async () => {
    const mockFetch = vi
      .fn()
      .mockResolvedValueOnce(makeJsonResponse({ data: "not-an-array" }))
      .mockResolvedValueOnce(makeJsonResponse({ data: [{ alerts: ["only-one"] }] }))
      .mockResolvedValue(makeJsonResponse({}));

    const result = await fetchOpenweatherAlerts({
      fetchFn: mockFetch,
      apiKey: "test-key",
    });

    const payload = result.data as OpenweatherFetchPayload;
    expect(payload.alerts).toHaveLength(1);
  });

  it("aggregates alerts from multiple entries in the current response data array", async () => {
    const mockFetch = vi
      .fn()
      .mockResolvedValueOnce(
        makeJsonResponse({
          data: [{ alerts: ["alert-a"] }, { alerts: ["alert-b"] }, {}],
        }),
      )
      .mockResolvedValueOnce(makeJsonResponse({ data: [{ alerts: [] }] }))
      .mockResolvedValueOnce(makeJsonResponse({ data: [{ alerts: [] }] }))
      .mockResolvedValueOnce(makeJsonResponse({ data: [{ alerts: [] }] }))
      .mockResolvedValue(makeJsonResponse({ id: "x" }));

    const result = await fetchOpenweatherAlerts({
      fetchFn: mockFetch,
      apiKey: "test-key",
    });

    const payload = result.data as OpenweatherFetchPayload;
    expect(payload.alerts).toHaveLength(2);
  });

  it("propagates non-ok responses from the current endpoint", async () => {
    const mockFetch = vi.fn().mockResolvedValueOnce(makeErrorResponse(401, "Unauthorized"));

    await expect(
      fetchOpenweatherAlerts({ fetchFn: mockFetch, apiKey: "test-key" }),
    ).rejects.toThrow("OpenWeather API returned 401 Unauthorized for");
  });

  it("propagates non-ok responses from the alert detail endpoint", async () => {
    const mockFetch = vi
      .fn()
      .mockResolvedValueOnce(makeJsonResponse({ data: [{ alerts: ["alert-x"] }] }))
      .mockResolvedValueOnce(makeErrorResponse(404, "Not Found"));

    await expect(
      fetchOpenweatherAlerts({ fetchFn: mockFetch, apiKey: "test-key" }),
    ).rejects.toThrow("OpenWeather API returned 404 Not Found for");
  });

  it("uses a custom baseUrl when provided", async () => {
    const mockFetch = vi
      .fn()
      .mockResolvedValueOnce(makeJsonResponse({ data: [{ alerts: [] }] }))
      .mockResolvedValue(makeJsonResponse({ data: [{ alerts: [] }] }));

    await fetchOpenweatherAlerts({
      fetchFn: mockFetch,
      baseUrl: "https://proxy.example.com/onecall",
      coordinates: [{ lat: 1, lon: 2 }],
      apiKey: "k",
    });

    expect(mockFetch.mock.calls[0]![0]).toBe(
      "https://proxy.example.com/onecall/current?lat=1&lon=2&appid=k",
    );
  });

  it("skips duplicate alert ids across probe coordinates", async () => {
    const alertDetailPayload = { id: "shared-alert" };
    const mockFetch = vi
      .fn()
      .mockResolvedValueOnce(makeJsonResponse({ data: [{ alerts: ["shared-alert"] }] }))
      .mockResolvedValueOnce(makeJsonResponse({ data: [{ alerts: ["shared-alert"] }] }))
      .mockResolvedValueOnce(makeJsonResponse({ data: [{ alerts: [] }] }))
      .mockResolvedValueOnce(makeJsonResponse({ data: [{ alerts: [] }] }))
      .mockResolvedValue(makeJsonResponse(alertDetailPayload));

    const result = await fetchOpenweatherAlerts({
      fetchFn: mockFetch,
      apiKey: "test-key",
    });

    const detailCalls = mockFetch.mock.calls.filter((call) =>
      (call[0] as string).includes("/alert/"),
    );
    expect(detailCalls).toHaveLength(1);
    expect((result.data as OpenweatherFetchPayload).alerts).toHaveLength(1);
  });
});
