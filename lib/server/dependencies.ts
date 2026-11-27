type DependencyFailure = "database_not_configured" | "database_connection_failed" | "database_schema_missing";

export class DatabaseNotConfigured extends Error {}

export function dependencyFailure(error: unknown): DependencyFailure | undefined {
  if (error instanceof DatabaseNotConfigured) return "database_not_configured";
  if (!error || typeof error !== "object") return;
  if ("errors" in error && Array.isArray(error.errors)) {
    for (const cause of error.errors) {
      const failure = dependencyFailure(cause);
      if (failure) return failure;
    }
  }
  if (error instanceof Error && [
    "Connection terminated unexpectedly", "Connection terminated due to connection timeout",
  ].includes(error.message)) return "database_connection_failed";
  if ("cause" in error) {
    const failure = dependencyFailure(error.cause);
    if (failure) return failure;
  }
  if ("errorCode" in error) {
    const failure = dependencyFailure({ code: error.errorCode });
    if (failure) return failure;
  }
  if (!("code" in error) || typeof error.code !== "string") return;
  if (error.code === "P2010" && "meta" in error) return dependencyFailure(error.meta);
  if (["42P01", "3F000", "42703", "P2021", "P2022"].includes(error.code)) return "database_schema_missing";
  if (error.code.startsWith("08") ||
    ["ECONNREFUSED", "ENOTFOUND", "EAI_AGAIN", "ETIMEDOUT", "ECONNRESET", "28P01", "3D000", "57P01", "57P02", "57P03",
      "P1000", "P1001", "P1002", "P1003", "P1008", "P1010", "P1017", "P2024"].includes(error.code)) {
    return "database_connection_failed";
  }
}
