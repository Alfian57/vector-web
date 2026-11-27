import type { DatabaseTransaction } from "../../lib/server/db";
import { districts } from "../seed-data";
import { ago, demoId, farmer, officer } from "./shared";

export async function seedInbox(client: DatabaseTransaction) {
  const messages = [
    {
      id: demoId(201),
      districtId: districts.cikampek,
      title: "Demo · Klaster terverifikasi",
      body: "Radar mencatat klaster temuan di Cikampek. Periksa petak pantauan Anda.",
      hours: 25,
    },
    {
      id: demoId(202),
      districtId: districts.jatisari,
      title: "Demo · Jadwal pendampingan PPL",
      body: "Siapkan catatan pengamatan untuk kunjungan kelompok tani berikutnya.",
      hours: 5,
    },
    {
      id: demoId(203),
      districtId: districts.klari,
      title: "Demo · Pemeriksaan petak selesai",
      body: "Lihat hasil verifikasi pada riwayat laporan Anda.",
      hours: 47,
    },
  ];
  await client.alert.createMany({
    data: messages.map(({ hours, ...message }) => ({ ...message, authorId: officer.id, createdAt: ago(hours) })),
    skipDuplicates: true,
  });
  await client.alertRecipient.createMany({
    data: messages.map(({ id, hours }) => ({
      alertId: id,
      ownerId: farmer.id,
      readAt: hours > 30 ? ago(hours - 1) : null,
    })),
    skipDuplicates: true,
  });
}
