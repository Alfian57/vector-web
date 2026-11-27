import { z } from "zod";
import { db, transaction, type DatabaseTransaction } from "../lib/server/db";

const legacyMigrations = [
  ["001-pilot.sql", "001_pilot"],
  ["002-aid-allocations.sql", "002_aid_allocations"],
  ["003-pilot-corrections.sql", "003_pilot_corrections"],
] as const;

const districtDataset = z.object({
  features: z
    .array(
      z.object({
        properties: z.object({ id: z.string(), name: z.string() }),
        geometry: z.object({ type: z.literal("MultiPolygon"), coordinates: z.array(z.unknown()) }),
      }),
    )
    .length(30),
});

async function migrate(...args: string[]) {
  const child = Bun.spawn(["bun", "run", "prisma", "migrate", ...args], {
    stdin: "ignore",
    stdout: "inherit",
    stderr: "inherit",
  });
  if ((await child.exited) !== 0) throw new Error(`Prisma migrate ${args[0]} failed`);
}

async function adoptLegacyMigrations(client: DatabaseTransaction) {
  const [ledgers] = await client.$queryRaw<{ legacy: boolean; prisma: boolean }[]>`
    SELECT to_regclass('public.schema_migrations') IS NOT NULL AS legacy,
      to_regclass('public._prisma_migrations') IS NOT NULL AS prisma
  `;
  if (!ledgers.legacy) return;

  const applied = new Set((await client.legacyMigration.findMany()).map(({ name }) => name));
  const recorded = ledgers.prisma
    ? await client.$queryRaw<{ name: string }[]>`
    SELECT migration_name AS name FROM _prisma_migrations
    WHERE finished_at IS NOT NULL AND rolled_back_at IS NULL
  `
    : [];
  const baselined = new Set(recorded.map(({ name }) => name));
  for (const [name, migration] of legacyMigrations) {
    if (applied.has(name) && !baselined.has(migration)) await migrate("resolve", "--applied", migration);
  }
}

const prisma = db();
try {
  // Serialize adoption and deployment, including when migrating from an older checkout.
  await prisma.$transaction(
    async (client) => {
      await client.$queryRaw`SELECT 1 FROM pg_advisory_xact_lock(280581)`;
      await adoptLegacyMigrations(client);
      await migrate("deploy");
    },
    { timeout: 120_000 },
  );

  const { features } = districtDataset.parse(await Bun.file("public/maps/karawang-districts.geojson").json());
  await transaction(async (client) => {
    for (const { properties, geometry } of features) {
      await client.$executeRaw`
        INSERT INTO districts (id, name, geom)
        VALUES (${properties.id}, ${properties.name},
          ST_Multi(ST_CollectionExtract(ST_MakeValid(ST_GeomFromGeoJSON(${JSON.stringify(geometry)})), 3)))
        ON CONFLICT (id) DO UPDATE SET name = EXCLUDED.name, geom = EXCLUDED.geom
      `;
    }
  });
} finally {
  await prisma.$disconnect();
}
