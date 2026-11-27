import { createRequire } from "node:module";
import { rm } from "node:fs/promises";
import { generateVAPIDKeys } from "web-push";
import { startFonnteStub } from "../tests/integration/helpers/fonnte-control";

const bun = process.execPath;
const resolve = createRequire(import.meta.url).resolve;

const testPgPort = Number(process.env.VEKTOR_TEST_PG_PORT ?? "55433");
if (!Number.isInteger(testPgPort) || testPgPort === 5433 || testPgPort < 1024 || testPgPort > 65535) {
  throw new Error(
    `Invalid VEKTOR_TEST_PG_PORT=${testPgPort}; port 5433 is reserved and never allowed for disposable tests.`,
  );
}

const appPort = Number(process.env.VEKTOR_TEST_APP_PORT ?? "3101");
const containerName = `vektor-test-postgis-${process.pid}`;
const nextDistDir = ".next-integration";
const testDbUrl = `postgresql://vektor_test:vektor_test@127.0.0.1:${testPgPort}/vektor_test`;
const baseURL = `http://127.0.0.1:${appPort}`;

async function runChecked(command: string[], env: Record<string, string | undefined>) {
  const child = Bun.spawn(command, {
    stdin: "ignore",
    stdout: "inherit",
    stderr: "inherit",
    env,
  });
  const code = await child.exited;
  if (code !== 0) throw new Error(`Command failed (${code}): ${command.join(" ")}`);
}

async function waitForPostgres() {
  for (let attempt = 0; attempt < 40; attempt++) {
    const check = Bun.spawn(
      ["docker", "exec", containerName, "pg_isready", "-h", "127.0.0.1", "-U", "vektor_test", "-d", "vektor_test"],
      { stdin: "ignore", stdout: "ignore", stderr: "ignore" },
    );
    if ((await check.exited) === 0) return;
    await Bun.sleep(500);
  }
  throw new Error("Timed out waiting for disposable PostGIS container");
}

async function waitForServer(url: string) {
  for (let attempt = 0; attempt < 60; attempt++) {
    try {
      const response = await fetch(`${url}/api/session`);
      if (response.ok) return;
    } catch {
      // Server not ready yet
    }
    await Bun.sleep(250);
  }
  throw new Error(`Timed out waiting for Next.js server at ${url}`);
}

const cleanBaseEnv: Record<string, string | undefined> = {
  ...process.env,
  DATABASE_URL: testDbUrl,
  POSTGRES_PASSWORD: "",
  FONNTE_TOKEN: "",
  OPEN_METEO_API_KEY: "",
  MAPTILER_API_KEY: "",
};

const vapid = generateVAPIDKeys();
const fonnte = startFonnteStub(0);
let appProcess: ReturnType<typeof Bun.spawn> | undefined;
let dockerStarted = false;

try {
  console.log(`Starting disposable PostGIS container ${containerName} on 127.0.0.1:${testPgPort}...`);
  await runChecked(
    [
      "docker",
      "run",
      "--rm",
      "-d",
      "--name",
      containerName,
      "-e",
      "POSTGRES_USER=vektor_test",
      "-e",
      "POSTGRES_PASSWORD=vektor_test",
      "-e",
      "POSTGRES_DB=vektor_test",
      "-p",
      `127.0.0.1:${testPgPort}:5432`,
      "postgis/postgis:17-3.5",
    ],
    cleanBaseEnv,
  );
  dockerStarted = true;
  await waitForPostgres();

  const runtimeEnv: Record<string, string | undefined> = {
    ...cleanBaseEnv,
    DATABASE_URL: testDbUrl,
    BETTER_AUTH_URL: baseURL,
    BETTER_AUTH_SECRET: "vektor-integration-test-secret-at-least-32-chars",
    FONNTE_TEST_URL: fonnte.sendUrl,
    FONNTE_CONTROL_URL: fonnte.controlUrl,
    INTEGRATION_BASE_URL: baseURL,
    VEKTOR_TEST_NEXT_DIST_DIR: nextDistDir,
    VEKTOR_TEST_PG_PORT: String(testPgPort),
    VAPID_PUBLIC_KEY: vapid.publicKey,
    VAPID_PRIVATE_KEY: vapid.privateKey,
    VAPID_SUBJECT: "mailto:test@vektor.invalid",
  };

  console.log("Applying Prisma migrations and district boundaries to disposable database...");
  await runChecked([bun, "scripts/migrate.ts"], runtimeEnv);

  console.log("Preparing assets and starting isolated Next.js dev server...");
  await runChecked([bun, "run", "dev:prepare"], runtimeEnv);

  console.log(`Starting isolated Next.js server at ${baseURL}...`);
  const nextBin = resolve("next/dist/bin/next");
  appProcess = Bun.spawn(["node", nextBin, "dev", "-H", "127.0.0.1", "-p", String(appPort)], {
    stdin: "ignore",
    stdout: "inherit",
    stderr: "inherit",
    env: runtimeEnv,
  });
  await waitForServer(baseURL);

  console.log("Running non-UI API, DB, worker, and migration integration tests...");
  await runChecked([bun, "test", "tests/integration", "--timeout", "45000"], runtimeEnv);

  console.log("Running headless Chromium IndexedDB & Service Worker harness (no product UI pages)...");
  await runChecked([bun, "x", "playwright", "test", "--config=tests/offline/playwright.config.ts"], runtimeEnv);

  console.log("All VEKTOR non-UI integration tests passed.");
} finally {
  if (appProcess) {
    appProcess.kill("SIGTERM");
    await appProcess.exited.catch(() => {});
  }
  fonnte.stop();
  if (dockerStarted) {
    const cleanup = Bun.spawn(["docker", "rm", "-f", "-v", containerName], {
      stdin: "ignore",
      stdout: "ignore",
      stderr: "ignore",
    });
    await cleanup.exited.catch(() => {});
  }
  await rm(nextDistDir, { recursive: true, force: true });
}
