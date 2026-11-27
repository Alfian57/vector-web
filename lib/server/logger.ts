import { configure, getConsoleSink, getLogger, getJsonLinesFormatter } from "@logtape/logtape";
import { db } from "./db";

type SystemSource = "api" | "auth" | "worker" | "seed";
type SystemSeverity = "info" | "warn" | "error";

const runtime = globalThis as typeof globalThis & { vektorLoggerReady?: Promise<void> };
const logger = getLogger(["vektor", "system"]);

async function ready() {
  runtime.vektorLoggerReady ??= configure({
    sinks: { console: getConsoleSink({ formatter: getJsonLinesFormatter() }) },
    loggers: [
      { category: ["vektor"], lowestLevel: "info", sinks: ["console"] },
      { category: ["logtape", "meta"], lowestLevel: "warning", sinks: ["console"] },
    ],
  });
  await runtime.vektorLoggerReady;
}

export async function logSystemEvent(
  source: SystemSource,
  code: string,
  severity: SystemSeverity = "error",
  outcome: "success" | "failure" = severity === "info" ? "success" : "failure",
) {
  const safeCode = /^[a-z0-9_.-]{1,80}$/i.test(code) ? code : "service_failure";
  await ready().catch(() => {});
  logger[severity]("{source}: {code}", { source, code: safeCode });
  try {
    await db().activityLog.create({
      data: {
        kind: "system",
        category: source,
        action: safeCode,
        outcome,
        severity: severity === "info" ? undefined : severity,
        summary: `${source}: ${safeCode}`,
      },
    });
  } catch {
    console.error("VEKTOR system log could not be persisted", source, safeCode);
  }
}
