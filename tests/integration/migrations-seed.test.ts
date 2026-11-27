import { randomUUID } from "node:crypto";
import { readFileSync } from "node:fs";
import { afterAll, describe, expect, test } from "bun:test";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "../../generated/prisma/client";
import { db } from "../../lib/server/db";
import { assertSafeTestDatabase } from "./helpers/test-kit";

function makeClient(connectionString: string) {
  return new PrismaClient({
    adapter: new PrismaPg({ connectionString, max: 4, connectionTimeoutMillis: 3000 }),
  });
}

function splitSqlStatements(sql: string) {
  return sql
    .split(/;\s*\r?\n/)
    .map((chunk) => chunk.trim())
    .filter((chunk) => chunk.length > 0 && chunk !== "BEGIN" && chunk !== "COMMIT");
}

async function runMigrateScript(databaseUrl: string) {
  const child = Bun.spawn([process.execPath, "scripts/migrate.ts"], {
    stdin: "ignore",
    stdout: "pipe",
    stderr: "pipe",
    env: { ...process.env, DATABASE_URL: databaseUrl },
  });
  const [exitCode, stdout, stderr] = await Promise.all([
    child.exited,
    new Response(child.stdout).text(),
    new Response(child.stderr).text(),
  ]);
  if (exitCode !== 0) {
    throw new Error(`scripts/migrate.ts failed (${exitCode}):\n${stdout}\n${stderr}`);
  }
}

async function runSeedScript(envOverrides: Record<string, string | undefined>) {
  const child = Bun.spawn([process.execPath, "scripts/seed.ts"], {
    stdin: "ignore",
    stdout: "pipe",
    stderr: "pipe",
    env: { ...process.env, ...envOverrides },
  });
  const [exitCode, stdout, stderr] = await Promise.all([
    child.exited,
    new Response(child.stdout).text(),
    new Response(child.stderr).text(),
  ]);
  return { exitCode, stdout, stderr };
}

describe("P1.7 database migrations, legacy upgrade, and demo seed guard", () => {
  const info = assertSafeTestDatabase();
  const baseUrl = new URL(info.url);
  const adminClient = db();

  const freshDbName = "vektor_mig_fresh";
  const legacyDbName = "vektor_mig_legacy";

  const dbUrlFor = (name: string) => {
    const next = new URL(baseUrl.href);
    next.pathname = `/${name}`;
    return next.href;
  };

  afterAll(async () => {
    await adminClient.$executeRawUnsafe(`DROP DATABASE IF EXISTS "${freshDbName}" WITH (FORCE)`).catch(() => {});
    await adminClient.$executeRawUnsafe(`DROP DATABASE IF EXISTS "${legacyDbName}" WITH (FORCE)`).catch(() => {});
    await adminClient.$disconnect();
  });

  test("applies migrations cleanly to an empty PostGIS database and is idempotent", async () => {
    await adminClient.$executeRawUnsafe(`DROP DATABASE IF EXISTS "${freshDbName}" WITH (FORCE)`);
    await adminClient.$executeRawUnsafe(`CREATE DATABASE "${freshDbName}"`);

    const freshUrl = dbUrlFor(freshDbName);
    await runMigrateScript(freshUrl);
    await runMigrateScript(freshUrl);

    const fresh = makeClient(freshUrl);
    try {
      expect(await fresh.district.count()).toBe(30);
      expect(await fresh.radarState.count()).toBe(1);

      const applied = await fresh.$queryRaw<{ migration_name: string }[]>`
        SELECT migration_name FROM _prisma_migrations WHERE finished_at IS NOT NULL ORDER BY migration_name
      `;
      expect(applied.map((row) => row.migration_name)).toEqual([
        "001_pilot",
        "002_aid_allocations",
        "003_pilot_corrections",
        "004_prisma_adoption",
        "005_whatsapp_accounts",
        "006_education_admin_logs",
        "007_user_avatars",
      ]);

      const postgisCols = await fresh.$queryRaw<{ table_name: string; column_name: string; udt_name: string }[]>`
        SELECT table_name, column_name, udt_name
        FROM information_schema.columns
        WHERE table_schema = 'public' AND udt_name = 'geometry'
        ORDER BY table_name, column_name
      `;
      expect(postgisCols).toEqual([
        { table_name: "districts", column_name: "geom", udt_name: "geometry" },
        { table_name: "plots", column_name: "geom", udt_name: "geometry" },
        { table_name: "reports", column_name: "geom", udt_name: "geometry" },
      ]);
    } finally {
      await fresh.$disconnect();
    }
  });

  test("upgrades a legacy 001+002 schema database while preserving sample rows and backfilling history", async () => {
    await adminClient.$executeRawUnsafe(`DROP DATABASE IF EXISTS "${legacyDbName}" WITH (FORCE)`);
    await adminClient.$executeRawUnsafe(`CREATE DATABASE "${legacyDbName}"`);

    const legacyUrl = dbUrlFor(legacyDbName);
    const legacy = makeClient(legacyUrl);

    const legacyUserId = randomUUID();
    const legacyOfficerId = randomUUID();
    const legacyVerifiedReportId = randomUUID();
    const legacyPendingReportId = randomUUID();
    const legacyAllocId = randomUUID();
    const legacyDeliveryId = randomUUID();
    const legacyAlertId = randomUUID();

    try {
      for (const file of [
        "prisma/migrations/001_pilot/migration.sql",
        "prisma/migrations/002_aid_allocations/migration.sql",
      ]) {
        const sql = readFileSync(file, "utf8");
        for (const stmt of splitSqlStatements(sql)) {
          await legacy.$executeRawUnsafe(stmt);
        }
      }

      // Legacy migration ledger recording 001 & 002 before Prisma adoption
      await legacy.$executeRawUnsafe(`CREATE TABLE schema_migrations (name text PRIMARY KEY)`);
      await legacy.$executeRawUnsafe(
        `INSERT INTO schema_migrations (name) VALUES ('001-pilot.sql'), ('002-aid-allocations.sql')`,
      );

      // Seed representative legacy data on old schema
      await legacy.$executeRaw`
        INSERT INTO districts (id, name, geom)
        VALUES ('32-15-13', 'Cikampek', ST_Multi(ST_GeomFromText('POLYGON((107.4 -6.4, 107.5 -6.4, 107.5 -6.3, 107.4 -6.3, 107.4 -6.4))', 4326)))
      `;
      await legacy.$executeRaw`
        INSERT INTO "user" (id, name, email, "emailVerified", role)
        VALUES
          (${legacyUserId}, 'Petani Lama', 'lama@example.test', true, 'farmer'),
          (${legacyOfficerId}, 'PPL Lama', 'ppl-lama@example.test', true, 'officer')
      `;
      await legacy.$executeRaw`
        INSERT INTO reports (id, client_id, owner_id, payload_digest, district_id, geom, observed_at, notes, finding, status, severity, reviewer_id, review_note, reviewed_at)
        VALUES
          (${legacyVerifiedReportId}::uuid, ${randomUUID()}::uuid, ${legacyUserId}, 'digest-1', '32-15-13',
            ST_SetSRID(ST_MakePoint(107.45, -6.35), 4326), now() - INTERVAL '1 day', 'Laporan lama terverifikasi',
            'blast'::finding, 'verified'::report_status, 'mild'::severity, ${legacyOfficerId}, 'Terverifikasi lama', now() - INTERVAL '12 hours'),
          (${legacyPendingReportId}::uuid, ${randomUUID()}::uuid, ${legacyUserId}, 'digest-2', '32-15-13',
            ST_SetSRID(ST_MakePoint(107.46, -6.36), 4326), now() - INTERVAL '2 hours', 'Laporan lama pending',
            'unknown'::finding, 'pending'::report_status, NULL, NULL, NULL, NULL)
      `;
      await legacy.$executeRaw`
        INSERT INTO follow_ups (district_id, kind, status, note, author_id)
        VALUES ('32-15-13', 'outreach', 'planned', 'Tindak lanjut lama', ${legacyOfficerId})
      `;
      await legacy.$executeRaw`
        INSERT INTO aid_allocations (id, district_id, item, quantity, unit, note, author_id)
        VALUES (${legacyAllocId}::uuid, '32-15-13', 'Perangkap lama', 25, 'unit', 'Catatan lama', ${legacyOfficerId})
      `;
      await legacy.$executeRaw`
        INSERT INTO aid_deliveries (allocation_id, id, quantity, recipient, note, author_id)
        VALUES (${legacyAllocId}::uuid, ${legacyDeliveryId}::uuid, 10, 'Poktan Lama', 'Tahap 1', ${legacyOfficerId})
      `;
      await legacy.$executeRaw`
        INSERT INTO alerts (id, district_id, title, body, author_id)
        VALUES (${legacyAlertId}::uuid, '32-15-13', 'Peringatan lama', 'Isi lama', ${legacyOfficerId})
      `;

      // Run upgrade migration script
      await runMigrateScript(legacyUrl);

      // Verify migrations baselined + applied
      const applied = await legacy.$queryRaw<{ migration_name: string }[]>`
        SELECT migration_name FROM _prisma_migrations WHERE finished_at IS NOT NULL ORDER BY migration_name
      `;
      expect(applied.map((row) => row.migration_name)).toEqual([
        "001_pilot",
        "002_aid_allocations",
        "003_pilot_corrections",
        "004_prisma_adoption",
        "005_whatsapp_accounts",
        "006_education_admin_logs",
        "007_user_avatars",
      ]);

      // Verify legacy data preserved and backfilled cleanly
      expect(await legacy.district.count()).toBe(30);
      const preservedUser = await legacy.user.findUniqueOrThrow({ where: { id: legacyUserId } });
      expect(preservedUser).toMatchObject({
        email: "lama@example.test",
        phoneNumber: null,
        phoneNumberVerified: false,
      });

      const verifiedReport = await legacy.report.findUniqueOrThrow({ where: { id: legacyVerifiedReportId } });
      const pendingReport = await legacy.report.findUniqueOrThrow({ where: { id: legacyPendingReportId } });
      expect(verifiedReport.reviewRevision).toBe(1);
      expect(pendingReport.reviewRevision).toBe(0);

      const reviewHistory = await legacy.reportReviewHistory.findMany({ where: { reportId: legacyVerifiedReportId } });
      expect(reviewHistory).toHaveLength(1);
      expect(reviewHistory[0]).toMatchObject({ revision: 1, status: "verified", finding: "blast", severity: "mild" });

      const followUpHistory = await legacy.followUpEntry.findMany({ where: { districtId: "32-15-13" } });
      expect(followUpHistory).toHaveLength(1);
      expect(followUpHistory[0]).toMatchObject({ note: "Tindak lanjut lama", status: "planned" });

      const preservedAlloc = await legacy.aidAllocation.findUniqueOrThrow({ where: { id: legacyAllocId } });
      expect(preservedAlloc.originalInput).toMatchObject({
        districtId: "32-15-13",
        item: "Perangkap lama",
        quantity: 25,
        unit: "unit",
      });

      const preservedDelivery = await legacy.aidDelivery.findUniqueOrThrow({
        where: { allocationId_id: { allocationId: legacyAllocId, id: legacyDeliveryId } },
      });
      expect(preservedDelivery.originalInput).toMatchObject({ recipient: "Poktan Lama", quantity: 10 });

      expect(await legacy.alert.count({ where: { id: legacyAlertId } })).toBe(1);
    } finally {
      await legacy.$disconnect();
    }
  });

  test("enforces scripts/seed.ts local port-5433 guard and verifies idempotency when isolated 5433 target is explicitly provided", async () => {
    // 1. Guard rejects disposable non-5433 test database
    const non5433 = await runSeedScript({ DATABASE_URL: info.url, NODE_ENV: "test" });
    expect(non5433.exitCode).not.toBe(0);
    expect(non5433.stderr).toContain("5433");

    // 2. Guard rejects NODE_ENV=production even with :5433/vektor URL without touching any DB
    const prodGuard = await runSeedScript({
      DATABASE_URL: "postgresql://vektor:blocked@127.0.0.1:5433/vektor",
      NODE_ENV: "production",
    });
    expect(prodGuard.exitCode).not.toBe(0);
    expect(prodGuard.stderr).toContain("5433");

    // 3. Only run scripts/seed.ts twice if an isolated disposable DB explicitly owns :5433/vektor
    if (process.env.VEKTOR_SEED_TEST_ISOLATED === "1" && process.env.VEKTOR_SEED_TEST_URL) {
      const seedUrl = process.env.VEKTOR_SEED_TEST_URL;
      const parsed = URL.parse(seedUrl);
      if (!parsed || parsed.port !== "5433" || parsed.pathname !== "/vektor") {
        throw new Error("VEKTOR_SEED_TEST_URL must target isolated :5433/vektor");
      }
      await runMigrateScript(seedUrl);
      const first = await runSeedScript({
        DATABASE_URL: seedUrl,
        NODE_ENV: "test",
        VEKTOR_SEED_TEST_ISOLATED: "1",
        VEKTOR_SEED_TEST_URL: seedUrl,
      });
      expect(first.exitCode).toBe(0);
      const second = await runSeedScript({
        DATABASE_URL: seedUrl,
        NODE_ENV: "test",
        VEKTOR_SEED_TEST_ISOLATED: "1",
        VEKTOR_SEED_TEST_URL: seedUrl,
      });
      expect(second.exitCode).toBe(0);

      const seeded = makeClient(seedUrl);
      try {
        expect(await seeded.user.count()).toBe(3);
        const roles = await seeded.user.groupBy({ by: ["role"], _count: { _all: true } });
        expect(roles.map((row) => [row.role, row._count._all]).sort()).toEqual([
          ["admin", 1],
          ["farmer", 1],
          ["officer", 1],
        ]);
        expect(await seeded.educationArticle.count()).toBe(3);
        expect(await seeded.report.count()).toBe(27);
        expect(await seeded.plot.count()).toBe(3);
        expect(await seeded.aidAllocation.count()).toBe(3);
        expect(await seeded.aidDelivery.count()).toBe(3);
      } finally {
        await seeded.$disconnect();
      }
    }
  });
});
