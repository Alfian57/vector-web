import { createHash } from "node:crypto";
import { hashPassword } from "better-auth/crypto";
import sharp from "sharp";
import { db, type DatabaseTransaction } from "../lib/server/db";
import { logSystemEvent } from "../lib/server/logger";
import { Prisma } from "../generated/prisma/client";
import { bumpRevision, recomputeRadar } from "../lib/server/radar";
import { allocations, deliveries, districts, followUps, plots, reports } from "./seed-data";

const farmer = { id: "vektor-demo-farmer", email: "petani@gmail.com", name: "Petani Demo", role: "farmer" };
const officer = { id: "vektor-demo-officer", email: "petugas@gmail.com", name: "Petugas Demo", role: "officer" };
const administrator = { id: "vektor-demo-admin", email: "admin@gmail.com", name: "Admin VEKTOR", role: "admin" };
const demoPassword = "password";
const now = Date.now();
const ago = (hours: number) => new Date(now - hours * 3_600_000);
const demoId = (key: number) => `f2dd2def-2336-4c5c-ae1e-${key.toString(16).padStart(12, "0")}`;

function requireLocalDatabase() {
  const url = URL.parse(process.env.DATABASE_URL ?? "");
  const deploymentSeed = process.argv.includes("--demo-deployment") && process.env.VEKTOR_DEMO_DEPLOYMENT === "1" &&
    process.env.NODE_ENV === "production" && url?.hostname === "db" && url.port === "5432" && url.pathname === "/vektor";
  const isolatedTestSeed = process.env.VEKTOR_SEED_TEST_ISOLATED === "1" &&
    process.env.VEKTOR_SEED_TEST_URL === process.env.DATABASE_URL && url?.port === "5433" && url.pathname === "/vektor";
  const localSeed = process.env.NODE_ENV !== "production" && url && ["localhost", "127.0.0.1"].includes(url.hostname) &&
    url.port === "5433" && url.pathname === "/vektor";
  if (!deploymentSeed && !isolatedTestSeed && !localSeed) {
    throw new Error("Seeder memerlukan database lokal VEKTOR :5433 atau flag deployment demo di Compose.");
  }
}

async function seedAccounts(client: DatabaseTransaction, passwordHash: string) {
  for (const account of [farmer, officer, administrator]) {
    const existing = await client.user.findUnique({ where: { email: account.email }, select: { id: true } });
    if (existing && existing.id !== account.id) {
      throw new Error(`Email ${account.email} sudah digunakan oleh akun lain.`);
    }
    await client.user.upsert({
      where: { id: account.id },
      create: { ...account, emailVerified: true },
      update: { emailVerified: true, role: account.role },
    });
    await client.account.upsert({
      where: { id: account.id },
      create: { id: account.id, userId: account.id, accountId: account.id, providerId: "credential", password: passwordHash },
      update: { password: passwordHash, updatedAt: ago(0) },
    });
  }
}

const sourceA = "https://pustaka.bppsdmp.pertanian.go.id/info-literasi/info-literasi-kendalikan-penyakit-padi-dengan-tepat-kunci-sukses-cegah-gagal-panen";
const sourceB = "https://pustaka.bppsdmp.pertanian.go.id/info-literasi/info-teknologi-pengendalian-hama-dan-penyakit-padi-untuk-semua-ekosistem";
const text = (value: string, href?: string) => ({ type: "text", text: value, ...(href ? { marks: [{ type: "link", attrs: { href, target: "_blank", rel: "noopener noreferrer" } }] } : {}) });
const paragraph = (...content: ReturnType<typeof text>[]) => ({ type: "paragraph", content });
const heading = (value: string, level = 2) => ({ type: "heading", attrs: { level }, content: [text(value)] });
const bulletList = (values: string[]) => ({ type: "bulletList", content: values.map((value) => ({ type: "listItem", content: [paragraph(text(value))] })) });

const educationArticles = [
  {
    id: demoId(301), slug: "mulai-mengamati-gejala-padi", category: "Pengamatan lahan",
    title: "Mulai dari pengamatan yang konsisten",
    summary: "Catatan sederhana tentang bagian tanaman, pola sebaran, dan waktu pengamatan membantu penyuluh memahami kondisi lahan.",
    content: { type: "doc", content: [
      heading("Amati sebelum mengambil kesimpulan"),
      paragraph(text("Perubahan warna daun atau pertumbuhan yang tidak merata dapat memiliki beberapa penyebab. Periksa beberapa rumpun di titik berbeda, lalu catat apa yang terlihat tanpa lebih dulu menyimpulkan jenis gangguannya.")),
      heading("Catat hal yang bisa dibandingkan"),
      bulletList(["Bagian tanaman yang berubah dan bentuk gejalanya.", "Lokasi serta perkiraan luas bagian petak yang terdampak.", "Kapan gejala pertama kali terlihat dan apakah bertambah.", "Kondisi sekitar, termasuk air dan cuaca beberapa hari terakhir."]),
      paragraph(text("Foto dari jarak dekat dan foto area sekitarnya dapat memberi konteks berbeda. Ambil gambar dengan pencahayaan cukup dan jangan mengeditnya agar ciri tanaman tetap terlihat.")),
      heading("Diskusikan temuan dengan penyuluh"),
      paragraph(text("Gunakan catatan sebagai bahan pemeriksaan bersama. Petugas dapat meminta pengamatan tambahan sebelum menyarankan tindak lanjut. Lihat juga panduan pengamatan dan pengendalian dari "), text("Kementerian Pertanian", sourceB), text(".")),
    ] },
  },
  {
    id: demoId(302), slug: "mengenali-gangguan-pada-padi", category: "Hama dan penyakit",
    title: "Mengenali gangguan pada padi secara bertahap",
    summary: "Kenali pola perubahan tanaman dan sampaikan bukti lapangan agar penilaian tidak hanya bergantung pada satu gejala.",
    content: { type: "doc", content: [
      heading("Gejala adalah petunjuk awal"),
      paragraph(text("Bercak, daun menguning, atau tanaman layu perlu dilihat bersama lokasi, umur tanaman, pola air, dan persebarannya. Gejala yang tampak mirip belum tentu memiliki penyebab yang sama.")),
      heading("Langkah pengamatan"),
      bulletList(["Periksa tanaman di beberapa titik, termasuk area yang tampak sehat sebagai pembanding.", "Perhatikan apakah gejala muncul pada satu rumpun, berkelompok, atau menyebar mengikuti bagian petak.", "Simpan foto dan catatan waktu pengamatan tanpa menyebut diagnosis yang belum dipastikan.", "Minta PPL meninjau sampel atau kondisi lahan jika gejala berkembang."]),
      paragraph(text("Kementerian Pertanian menekankan pengenalan gejala dan pemilihan pengendalian berdasarkan kondisi lapangan. Baca rujukan "), text("kendali penyakit padi", sourceA), text(" dan bahas penerapannya dengan penyuluh setempat.")),
    ] },
  },
  {
    id: demoId(303), slug: "menyusun-laporan-pengamatan-yang-bermanfaat", category: "Pelaporan",
    title: "Susun laporan pengamatan yang mudah ditindaklanjuti",
    summary: "Lokasi yang jelas, waktu pengamatan, foto, dan uraian singkat membuat laporan lebih berguna bagi petani dan petugas.",
    content: { type: "doc", content: [
      heading("Laporan yang baik dimulai dari fakta"),
      paragraph(text("Tulis apa yang terlihat, bukan dugaan penyebabnya. Tandai titik pengamatan sedekat mungkin dengan lokasi kejadian dan pastikan foto tidak memperlihatkan data pribadi yang tidak diperlukan.")),
      heading("Sebelum mengirim laporan"),
      bulletList(["Pastikan penanda lokasi berada di petak yang benar.", "Pilih foto yang memperlihatkan ciri gejala dengan jelas.", "Tambahkan kapan perubahan pertama kali terlihat.", "Jika koneksi terputus, simpan laporan dan biarkan aplikasi menyinkronkannya saat perangkat kembali daring."]),
      paragraph(text("Setelah dikirim, petugas penyuluh memeriksa laporan sebelum temuan masuk ke radar terverifikasi. Hasil peninjauan menjadi konteks bersama, bukan pengganti kunjungan lapangan.")),
    ] },
  },
];

async function seedEducation(client: DatabaseTransaction) {
  const seeded = [];
  for (const article of educationArticles) {
    const row = await client.educationArticle.upsert({
      where: { slug: article.slug },
      create: {
        ...article, content: article.content as Prisma.InputJsonValue, status: "published",
        authorId: administrator.id, publishedAt: ago(72), updatedAt: ago(72),
      },
      update: {},
      select: { id: true },
    });
    seeded.push(row);
  }
  await client.activityLog.createMany({
    data: seeded.map((article, index) => ({
      id: demoId(401 + index), kind: "audit", category: "education", action: "education.article.seeded",
      actorId: administrator.id, actorRole: "admin", targetType: "education_article", targetId: article.id,
      summary: "Artikel edukasi demo disiapkan untuk presentasi.", createdAt: ago(72 - index),
    })),
    skipDuplicates: true,
  });
  await client.activityLog.createMany({
    data: [{
      id: demoId(404), kind: "audit", category: "account", action: "account.demo.seeded",
      actorId: administrator.id, actorRole: "admin", targetType: "user", targetId: administrator.id,
      summary: "Akun demo Admin disiapkan untuk pengelolaan VEKTOR.", createdAt: ago(72),
    }],
    skipDuplicates: true,
  });
}

async function seedPlots(client: DatabaseTransaction) {
  for (const [index, [districtId, name]] of plots.entries()) {
    await client.$executeRaw`
      INSERT INTO plots (id, owner_id, district_id, geom, name)
      SELECT ${demoId(100 + index)}::uuid, ${farmer.id}, id, ST_PointOnSurface(geom), ${`Demo · ${name}`}
      FROM districts WHERE id = ${districtId}
      ON CONFLICT (id) DO NOTHING
    `;
  }
}

async function seedReports(client: DatabaseTransaction, photo: Buffer) {
  for (const report of reports) {
    const id = demoId(report.key);
    const revision = report.corrected ? 2 : report.status === "pending" ? 0 : 1;
    const reviewer = revision ? officer.id : null;
    const reviewNote = report.status === "rejected" ? "Demo: unggah ulang dengan foto yang lebih jelas."
      : revision ? "Demo: pemeriksaan lapangan selesai." : null;
    const reviewedAt = ago(report.hoursAgo - 1);
    const offset = (report.key % 5 - 2) * 0.00035;
    const digest = createHash("sha256").update(`vektor-demo:${id}`).digest("hex");
    const [saved] = await client.$queryRaw<{ id: string }[]>`
      WITH district AS (
        SELECT id, geom, ST_PointOnSurface(geom) AS anchor FROM districts WHERE id = ${report.district}
      ), sample AS (
        SELECT id, geom, anchor, ST_Translate(anchor, ${offset}::double precision, 0) AS point FROM district
      )
      INSERT INTO reports (id, client_id, owner_id, payload_digest, district_id, geom,
        observed_at, submitted_at, notes, finding, status, severity, reviewer_id, review_note, reviewed_at, review_revision)
      SELECT ${id}::uuid, ${id}::uuid, ${farmer.id}, ${digest}, id,
        CASE WHEN ST_Covers(geom, point) THEN point ELSE anchor END,
        ${ago(report.hoursAgo).toISOString()}::timestamptz, ${ago(report.hoursAgo - 0.5).toISOString()}::timestamptz,
        ${`Demo: ${report.notes} Foto hanya ilustrasi.`}, ${report.finding}::finding, ${report.status}::report_status,
        ${report.severity ?? null}::severity, ${reviewer}, ${reviewNote},
        ${revision ? reviewedAt.toISOString() : null}::timestamptz, ${revision}::integer
      FROM sample
      ON CONFLICT (id) DO UPDATE SET observed_at = EXCLUDED.observed_at,
        submitted_at = EXCLUDED.submitted_at, reviewed_at = EXCLUDED.reviewed_at
      WHERE reports.owner_id = EXCLUDED.owner_id AND reports.review_revision = EXCLUDED.review_revision
        AND reports.status = EXCLUDED.status
      RETURNING id
    `;
    if (!saved) continue;

    await client.reportPhoto.upsert({ where: { reportId: id }, create: { reportId: id, image: photo }, update: {} });
    for (let index = 1; index <= revision; index++) {
      const initial = index < revision;
      const recordedAt = initial ? ago(report.hoursAgo - 0.75) : reviewedAt;
      await client.reportReviewHistory.upsert({
        where: { reportId_revision: { reportId: id, revision: index } },
        create: {
          reportId: id, revision: index, reviewerId: reviewer, recordedAt, status: report.status,
          finding: report.finding, severity: initial ? "mild" : report.severity ?? null,
          note: initial ? "Demo: pemeriksaan pertama dicatat sebagai ringan." : reviewNote,
          reason: report.corrected && !initial ? "Demo: tingkat temuan diperbarui setelah kunjungan ulang." : null,
        },
        update: { recordedAt },
      });
    }
  }
}

async function seedInbox(client: DatabaseTransaction) {
  const messages = [
    { id: demoId(201), districtId: districts.cikampek, title: "Demo · Klaster terverifikasi", body: "Radar mencatat klaster temuan di Cikampek. Periksa petak pantauan Anda.", hours: 25 },
    { id: demoId(202), districtId: districts.jatisari, title: "Demo · Jadwal pendampingan PPL", body: "Siapkan catatan pengamatan untuk kunjungan kelompok tani berikutnya.", hours: 5 },
    { id: demoId(203), districtId: districts.klari, title: "Demo · Pemeriksaan petak selesai", body: "Lihat hasil verifikasi pada riwayat laporan Anda.", hours: 47 },
  ];
  await client.alert.createMany({
    data: messages.map(({ hours, ...message }) => ({ ...message, authorId: officer.id, createdAt: ago(hours) })),
    skipDuplicates: true,
  });
  await client.alertRecipient.createMany({
    data: messages.map(({ id, hours }) => ({ alertId: id, ownerId: farmer.id, readAt: hours > 30 ? ago(hours - 1) : null })),
    skipDuplicates: true,
  });
}

async function seedFollowUps(client: DatabaseTransaction) {
  // Insert the most recent snapshot first and preserve any follow-up already in use.
  for (const { key, hoursAgo, ...entry } of [...followUps].reverse()) {
    const id = demoId(key);
    const recordedAt = ago(hoursAgo);
    const data = { ...entry, authorId: officer.id };
    await client.followUpEntry.upsert({ where: { id }, create: { ...data, id, recordedAt }, update: {} });
    await client.followUp.upsert({
      where: { districtId_kind: { districtId: entry.districtId, kind: entry.kind } },
      create: { ...data, updatedAt: recordedAt },
      update: {},
    });
  }
}

async function seedAid(client: DatabaseTransaction) {
  await client.aidAllocation.createMany({
    data: allocations.map(({ key, hoursAgo, ...input }) => ({
      ...input, id: demoId(key), authorId: officer.id, createdAt: ago(hoursAgo), originalInput: input,
    })),
    skipDuplicates: true,
  });
  for (const delivery of deliveries) {
    const { key, allocation, quantity, recipient, note, hoursAgo } = delivery;
    const id = demoId(key);
    const allocationId = demoId(allocation);
    const current = { quantity, recipient, note };
    const previous = { ...current, quantity: "previousQuantity" in delivery ? delivery.previousQuantity : quantity };
    const corrected = previous.quantity !== quantity;
    await client.aidDelivery.upsert({
      where: { allocationId_id: { allocationId, id } },
      create: { ...current, id, allocationId, recordedAt: ago(hoursAgo), authorId: officer.id, originalInput: previous, revision: Number(corrected) },
      update: {},
    });
    if (!corrected) continue;

    const reason = "Demo: jumlah dikoreksi berdasarkan berita acara serah terima.";
    const existing = await client.aidCorrection.findFirst({ where: { allocationId, deliveryId: id, authorId: officer.id, reason } });
    if (!existing) await client.aidCorrection.create({
      data: {
        allocationId, deliveryId: id, kind: "delivery", reason, authorId: officer.id, recordedAt: ago(hoursAgo - 1),
        previous: { ...previous, voided: false }, current: { ...current, voided: false },
      },
    });
  }
}

requireLocalDatabase();
const prisma = db();
try {
  const [passwordHash, photo] = await Promise.all([
    hashPassword(demoPassword),
    sharp("public/sawah-cikampek.webp").resize(900, 520, { fit: "inside" }).jpeg({ quality: 82 }).toBuffer(),
  ]);
  await prisma.$transaction(async (client) => {
    await client.$queryRaw`SELECT 1 FROM pg_advisory_xact_lock(280582)`;
    const districtIds = Object.values(districts);
    if (await client.district.count({ where: { id: { in: districtIds } } }) !== districtIds.length) {
      throw new Error("Batas kecamatan belum lengkap. Jalankan db:migrate terlebih dahulu.");
    }
    await seedAccounts(client, passwordHash);
    await seedEducation(client);
    await seedPlots(client);
    await seedReports(client, photo);
    await seedInbox(client);
    await seedFollowUps(client);
    await seedAid(client);
    await client.localWeather.upsert({
      where: { onlyRow: true },
      update: {},
      create: { onlyRow: true, observedAt: ago(0.25), fetchedAt: ago(0.25), windSpeed: 11.5, windDirection: 120, humidity: 79 },
    });
    // Demo aggregation must not enqueue Web Push for real subscribers.
    if (!await recomputeRadar(client, { notify: false })) await bumpRevision(client);
  }, { timeout: 60_000 });
  await logSystemEvent("seed", "demo_seed_completed", "info", "success");
  console.log(`Demo VEKTOR siap: 3 akun (admin@gmail.com, petani@gmail.com, petugas@gmail.com; sandi password), ${educationArticles.length} artikel, ${reports.length} laporan, ${plots.length} petak, dan ${allocations.length} alokasi bantuan.`);
} finally {
  await prisma.$disconnect();
}
