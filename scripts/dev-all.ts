import { createRequire } from "node:module";

const bun = process.execPath;
const resolve = createRequire(import.meta.url).resolve;
const shutdown = new AbortController();
const processes: Promise<number>[] = [];

for (const [signal, exitCode] of [
  ["SIGINT", 130],
  ["SIGTERM", 143],
] as const) {
  process.once(signal, () => {
    process.exitCode = exitCode;
    shutdown.abort();
  });
}

function run(command: string[]) {
  const child = Bun.spawn(command, {
    stdin: "inherit",
    stdout: "inherit",
    stderr: "inherit",
    signal: shutdown.signal,
  });
  processes.push(child.exited);
  return child.exited;
}

async function startDevelopment() {
  if (!(await Bun.file(".env").exists()) || !(await Bun.file(".env.local").exists())) {
    throw new Error("Siapkan .env dan .env.local sesuai README sebelum menjalankan dev:all.");
  }
  const database = URL.parse(process.env.DATABASE_URL ?? "");
  if (!database || !["127.0.0.1", "localhost"].includes(database.hostname) || database.port !== "5433") {
    throw new Error("dev:all memerlukan DATABASE_URL ke PostgreSQL lokal pada port 5433.");
  }

  const next = resolve("next/dist/bin/next");
  const steps = [
    {
      name: "Memperbarui Prisma Client",
      command: [bun, "run", "db:generate"],
    },
    {
      name: "Menyalakan PostGIS",
      command: [
        "docker",
        "compose",
        "--env-file",
        ".env",
        "-p",
        "vektor-dev",
        "-f",
        "docker/compose.yaml",
        "-f",
        "docker/compose.dev.yaml",
        "up",
        "-d",
        "--wait",
        "db",
      ],
    },
    {
      name: "Menjalankan migrasi Prisma",
      command: [bun, "--env-file=.env.local", "run", "db:migrate"],
    },
    {
      name: "Menyiapkan aset development",
      command: [bun, "run", "dev:prepare"],
    },
  ];

  for (const { name, command } of steps) {
    if (shutdown.signal.aborted) return;
    console.log(name);
    const status = await run(command);
    if (shutdown.signal.aborted) return;
    if (status !== 0) throw new Error(`${name} gagal dengan kode ${status}.`);
  }

  const status = await Promise.race([
    run([bun, "--env-file=.env.local", "scripts/worker.ts"]),
    run(["node", next, "dev", ...process.argv.slice(2)]),
  ]);
  if (!shutdown.signal.aborted) process.exitCode = status;
}

try {
  await startDevelopment();
} catch (error) {
  if (!shutdown.signal.aborted) {
    console.error(error instanceof Error ? error.message : "Gagal menjalankan VEKTOR.");
    process.exitCode = 1;
  }
} finally {
  shutdown.abort();
  await Promise.allSettled(processes);
}
