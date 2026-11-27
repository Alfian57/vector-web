import { describe, expect, test } from "bun:test";
import { DatabaseNotConfigured, dependencyFailure } from "../../lib/server/dependencies";

describe("service diagnostics", () => {
  test("reports safe codes for database configuration, connection and schema errors", () => {
    expect(dependencyFailure(new DatabaseNotConfigured())).toBe("database_not_configured");
    expect(dependencyFailure(new AggregateError([{ code: "ECONNREFUSED" }]))).toBe("database_connection_failed");
    expect(dependencyFailure({ code: "42P01" })).toBe("database_schema_missing");
    expect(dependencyFailure(new Error("unknown failure"))).toBeUndefined();
  });
});
