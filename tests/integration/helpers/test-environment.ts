export function baseUrl() {
  const value = process.env.INTEGRATION_BASE_URL ?? process.env.BETTER_AUTH_URL;
  if (!value) throw new Error("INTEGRATION_BASE_URL is required");
  return value;
}

export function fonnteControlUrl() {
  const value = process.env.FONNTE_CONTROL_URL;
  if (!value) throw new Error("FONNTE_CONTROL_URL is required");
  return value;
}

export function assertSafeTestDatabase(
  allowedDatabases = new Set(["vektor_test", "vektor_mig_fresh", "vektor_mig_legacy"]),
) {
  const raw = process.env.DATABASE_URL?.trim();
  if (!raw) throw new Error("DATABASE_URL is required for integration tests");
  const parsed = URL.parse(raw);
  if (!parsed || !["127.0.0.1", "localhost"].includes(parsed.hostname)) {
    throw new Error(`Refusing non-local DATABASE_URL host: ${parsed?.hostname ?? "invalid"}`);
  }
  if (parsed.port === "5433") {
    throw new Error("Refusing active development port 5433 in integration test helper");
  }
  const dbName = parsed.pathname.replace(/^\//, "");
  if (!allowedDatabases.has(dbName)) {
    throw new Error(`Refusing unexpected database '${dbName}'; expected one of ${[...allowedDatabases].join(", ")}`);
  }
  return { url: raw, dbName, port: parsed.port };
}
