import sharp from "sharp";
import { hashPassword } from "better-auth/crypto";
import { db } from "../lib/server/db";
import { logSystemEvent } from "../lib/server/logger";
import { bumpRevision, recomputeRadar } from "../lib/server/radar";
import { seedAccounts, prepareSeedAvatars } from "./seed/accounts";
import { seedEducation, educationArticles } from "./seed/education";
import { seedPlots, seedReports } from "./seed/reports";
import { seedInbox } from "./seed/inbox";
import { seedFollowUps } from "./seed/follow-ups";
import { seedAid } from "./seed/aid";
import { ago, demoPassword } from "./seed/shared";
import { districts, reports, plots, allocations } from "./seed-data";

function requireLocalDatabase() {
  const url = URL.parse(process.env.DATABASE_URL ?? "");
  const deploymentSeed =
    process.argv.includes("--demo-deployment") &&
    process.env.VEKTOR_DEMO_DEPLOYMENT === "1" &&
    process.env.NODE_ENV === "production" &&
    url?.hostname === "db" &&
    url.port === "5432" &&
    url.pathname === "/vektor";
  const isolatedTestSeed =
    process.env.VEKTOR_SEED_TEST_ISOLATED === "1" &&
    process.env.VEKTOR_SEED_TEST_URL === process.env.DATABASE_URL &&
    url?.port === "5433" &&
    url.pathname === "/vektor";
  const localSeed =
    process.env.NODE_ENV !== "production" &&
    url &&
    ["localhost", "127.0.0.1"].includes(url.hostname) &&
    url.port === "5433" &&
    url.pathname === "/vektor";
  if (!deploymentSeed && !isolatedTestSeed && !localSeed) {
    throw new Error("Seeder memerlukan database lokal VEKTOR :5433 atau flag deployment demo di Compose.");
  }
}

requireLocalDatabase();
const prisma = db();
try {
  const [passwordHash, photo, avatars] = await Promise.all([
    hashPassword(demoPassword),
    sharp("public/sawah-cikampek.webp").resize(900, 520, { fit: "inside" }).jpeg({ quality: 82 }).toBuffer(),
    prepareSeedAvatars(),
  ]);
  await prisma.$transaction(
    async (client) => {
      await client.$queryRaw`SELECT 1 FROM pg_advisory_xact_lock(280582)`;
      const districtIds = Object.values(districts);
      if ((await client.district.count({ where: { id: { in: districtIds } } })) !== districtIds.length) {
        throw new Error("Batas kecamatan belum lengkap. Jalankan db:migrate terlebih dahulu.");
      }
      await seedAccounts(client, passwordHash, avatars);
      await seedEducation(client);
      await seedPlots(client);
      await seedReports(client, photo);
      await seedInbox(client);
      await seedFollowUps(client);
      await seedAid(client);
      await client.localWeather.upsert({
        where: { onlyRow: true },
        update: {},
        create: {
          onlyRow: true,
          observedAt: ago(0.25),
          fetchedAt: ago(0.25),
          windSpeed: 11.5,
          windDirection: 120,
          humidity: 79,
        },
      });
      // Demo aggregation must not enqueue Web Push for real subscribers.
      if (!(await recomputeRadar(client, { notify: false }))) await bumpRevision(client);
    },
    { timeout: 60_000 },
  );
  await logSystemEvent("seed", "demo_seed_completed", "info", "success");
  console.log(
    `Demo VEKTOR siap: 3 akun dengan WhatsApp terverifikasi (admin@gmail.com, petani@gmail.com, petugas@gmail.com; sandi password), ${educationArticles.length} artikel, ${reports.length} laporan, ${plots.length} petak, dan ${allocations.length} alokasi bantuan.`,
  );
} finally {
  await prisma.$disconnect();
}
