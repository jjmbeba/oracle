import { describe, expect, it, vi } from "vitest";
import { handleApiSignalShutdown } from "./dev";

describe("api dev runtime", () => {
  it("exits zero after successful signal shutdown", async () => {
    const options = {
      shutdown: vi.fn(() => Promise.resolve()),
      logger: {
        error: vi.fn(),
      },
      exitProcess: vi.fn(),
    };

    await handleApiSignalShutdown(options);

    expect(options.shutdown).toHaveBeenCalledOnce();
    expect(options.logger.error).not.toHaveBeenCalled();
    expect(options.exitProcess).toHaveBeenCalledWith(0);
  });

  it("logs failure and exits one after failed signal shutdown", async () => {
    const error = new Error("shutdown failed");
    const options = {
      shutdown: vi.fn(() => Promise.reject(error)),
      logger: {
        error: vi.fn(),
      },
      exitProcess: vi.fn(),
    };

    await handleApiSignalShutdown(options);

    expect(options.shutdown).toHaveBeenCalledOnce();
    expect(options.logger.error).toHaveBeenCalledWith("api.shutdown.failed", error);
    expect(options.exitProcess).toHaveBeenCalledWith(1);
  });
});
