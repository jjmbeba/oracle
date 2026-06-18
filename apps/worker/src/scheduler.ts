import type { WorkerLogger } from "./logger";

export type ScheduledJob = {
  name: string;
  intervalMs: number;
  run(): Promise<void> | void;
};

export type Scheduler = {
  registerIntervalJob(job: ScheduledJob): Promise<void>;
  stop(): Promise<void>;
};

export type SchedulerOptions = {
  logger: WorkerLogger;
  now?: () => number;
};

type JobState = {
  job: ScheduledJob;
  timer: ReturnType<typeof setInterval>;
  running: boolean;
  inFlight: Promise<void> | undefined;
};

export function createScheduler(options: SchedulerOptions): Scheduler {
  const now = options.now ?? Date.now;
  const jobs = new Map<string, JobState>();

  const runJob = (state: JobState): void => {
    const { job } = state;

    if (state.running) {
      options.logger.info("job.skipped", { jobName: job.name });
      return;
    }

    state.running = true;
    const startedAt = now();

    state.inFlight = Promise.resolve()
      .then(() => job.run())
      .then(() => {
        options.logger.info("job.success", {
          jobName: job.name,
          durationMs: now() - startedAt,
        });
      })
      .catch((error: unknown) => {
        options.logger.error("job.failure", {
          jobName: job.name,
          durationMs: now() - startedAt,
          error,
        });
      })
      .finally(() => {
        state.running = false;
        state.inFlight = undefined;
      });
  };

  return {
    registerIntervalJob(job) {
      if (jobs.has(job.name)) {
        throw new Error(`Scheduled job already registered: ${job.name}`);
      }

      const state: JobState = {
        job,
        timer: setInterval(() => {
          runJob(state);
        }, job.intervalMs),
        running: false,
        inFlight: undefined,
      };
      jobs.set(job.name, state);
      runJob(state);
      return state.inFlight ?? Promise.resolve();
    },
    async stop() {
      for (const state of jobs.values()) {
        clearInterval(state.timer);
      }

      await Promise.all(
        [...jobs.values()]
          .map((state) => state.inFlight)
          .filter((inFlight): inFlight is Promise<void> => inFlight !== undefined),
      );
    },
  };
}
