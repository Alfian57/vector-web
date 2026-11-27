import { setTimeout as delay } from "node:timers/promises";
import { db, transaction } from "../lib/server/db";
import { deliverPush, refreshWeather } from "../lib/server/jobs";
import { recomputeRadar } from "../lib/server/radar";
import { pruneOldActivityLogs, updateWorkerStatus } from "../lib/server/admin";

const shutdown = new AbortController();
for (const signal of ["SIGINT", "SIGTERM"] as const) {
  process.on(signal, () => shutdown.abort());
}
try {
  let lastPruneDay = "";
  while (!shutdown.signal.aborted) {
    const jobs: [string, () => Promise<unknown>][] = [
      ["weather", refreshWeather],
      ["radar", () => transaction(recomputeRadar)],
      ["push", deliverPush],
    ];
    await Promise.all(jobs.map(async ([job, run]) => {
      try {
        await run();
        await updateWorkerStatus(job);
      } catch {
        console.error(`VEKTOR worker: ${job} failed`);
        await updateWorkerStatus(job, "job_failed").catch(() => {});
      }
    }));
    const pruneDay = new Date().toISOString().slice(0, 10);
    if (lastPruneDay !== pruneDay) {
      try {
        await pruneOldActivityLogs();
        await updateWorkerStatus("log-prune");
        lastPruneDay = pruneDay;
      } catch {
        console.error("VEKTOR worker: log-prune failed");
        await updateWorkerStatus("log-prune", "job_failed").catch(() => {});
      }
    }
    await delay(30_000, undefined, { signal: shutdown.signal }).catch(() => {});
  }
} finally {
  await db().$disconnect();
}
