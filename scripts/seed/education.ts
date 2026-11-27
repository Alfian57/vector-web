import { Prisma } from "../../generated/prisma/client";
import type { DatabaseTransaction } from "../../lib/server/db";
import { administrator, ago, demoId } from "./shared";

const sourceA =
  "https://pustaka.bppsdmp.pertanian.go.id/info-literasi/info-literasi-kendalikan-penyakit-padi-dengan-tepat-kunci-sukses-cegah-gagal-panen";
const sourceB =
  "https://pustaka.bppsdmp.pertanian.go.id/info-literasi/info-teknologi-pengendalian-hama-dan-penyakit-padi-untuk-semua-ekosistem";
const text = (value: string, href?: string) => ({
  type: "text",
  text: value,
  ...(href ? { marks: [{ type: "link", attrs: { href, target: "_blank", rel: "noopener noreferrer" } }] } : {}),
});
const paragraph = (...content: ReturnType<typeof text>[]) => ({ type: "paragraph", content });
const heading = (value: string, level = 2) => ({ type: "heading", attrs: { level }, content: [text(value)] });
const bulletList = (values: string[]) => ({
  type: "bulletList",
  content: values.map((value) => ({ type: "listItem", content: [paragraph(text(value))] })),
});

export const educationArticles = [
  {
    id: demoId(301),
    slug: "mulai-mengamati-gejala-padi",
    category: "Pengamatan lahan",
    title: "Mulai dari pengamatan yang konsisten",
    summary:
      "Catatan sederhana tentang bagian tanaman, pola sebaran, dan waktu pengamatan membantu penyuluh memahami kondisi lahan.",
    content: {
      type: "doc",
      content: [
        heading("Amati sebelum mengambil kesimpulan"),
        paragraph(
          text(
            "Perubahan warna daun atau pertumbuhan yang tidak merata dapat memiliki beberapa penyebab. Periksa beberapa rumpun di titik berbeda, lalu catat apa yang terlihat tanpa lebih dulu menyimpulkan jenis gangguannya.",
          ),
        ),
        heading("Catat hal yang bisa dibandingkan"),
        bulletList([
          "Bagian tanaman yang berubah dan bentuk gejalanya.",
          "Lokasi serta perkiraan luas bagian petak yang terdampak.",
          "Kapan gejala pertama kali terlihat dan apakah bertambah.",
          "Kondisi sekitar, termasuk air dan cuaca beberapa hari terakhir.",
        ]),
        paragraph(
          text(
            "Foto dari jarak dekat dan foto area sekitarnya dapat memberi konteks berbeda. Ambil gambar dengan pencahayaan cukup dan jangan mengeditnya agar ciri tanaman tetap terlihat.",
          ),
        ),
        heading("Diskusikan temuan dengan penyuluh"),
        paragraph(
          text(
            "Gunakan catatan sebagai bahan pemeriksaan bersama. Petugas dapat meminta pengamatan tambahan sebelum menyarankan tindak lanjut. Lihat juga panduan pengamatan dan pengendalian dari ",
          ),
          text("Kementerian Pertanian", sourceB),
          text("."),
        ),
      ],
    },
  },
  {
    id: demoId(302),
    slug: "mengenali-gangguan-pada-padi",
    category: "Hama dan penyakit",
    title: "Mengenali gangguan pada padi secara bertahap",
    summary:
      "Kenali pola perubahan tanaman dan sampaikan bukti lapangan agar penilaian tidak hanya bergantung pada satu gejala.",
    content: {
      type: "doc",
      content: [
        heading("Gejala adalah petunjuk awal"),
        paragraph(
          text(
            "Bercak, daun menguning, atau tanaman layu perlu dilihat bersama lokasi, umur tanaman, pola air, dan persebarannya. Gejala yang tampak mirip belum tentu memiliki penyebab yang sama.",
          ),
        ),
        heading("Langkah pengamatan"),
        bulletList([
          "Periksa tanaman di beberapa titik, termasuk area yang tampak sehat sebagai pembanding.",
          "Perhatikan apakah gejala muncul pada satu rumpun, berkelompok, atau menyebar mengikuti bagian petak.",
          "Simpan foto dan catatan waktu pengamatan tanpa menyebut diagnosis yang belum dipastikan.",
          "Minta PPL meninjau sampel atau kondisi lahan jika gejala berkembang.",
        ]),
        paragraph(
          text(
            "Kementerian Pertanian menekankan pengenalan gejala dan pemilihan pengendalian berdasarkan kondisi lapangan. Baca rujukan ",
          ),
          text("kendali penyakit padi", sourceA),
          text(" dan bahas penerapannya dengan penyuluh setempat."),
        ),
      ],
    },
  },
  {
    id: demoId(303),
    slug: "menyusun-laporan-pengamatan-yang-bermanfaat",
    category: "Pelaporan",
    title: "Susun laporan pengamatan yang mudah ditindaklanjuti",
    summary:
      "Lokasi yang jelas, waktu pengamatan, foto, dan uraian singkat membuat laporan lebih berguna bagi petani dan petugas.",
    content: {
      type: "doc",
      content: [
        heading("Laporan yang baik dimulai dari fakta"),
        paragraph(
          text(
            "Tulis apa yang terlihat, bukan dugaan penyebabnya. Tandai titik pengamatan sedekat mungkin dengan lokasi kejadian dan pastikan foto tidak memperlihatkan data pribadi yang tidak diperlukan.",
          ),
        ),
        heading("Sebelum mengirim laporan"),
        bulletList([
          "Pastikan penanda lokasi berada di petak yang benar.",
          "Pilih foto yang memperlihatkan ciri gejala dengan jelas.",
          "Tambahkan kapan perubahan pertama kali terlihat.",
          "Jika koneksi terputus, simpan laporan dan biarkan aplikasi menyinkronkannya saat perangkat kembali daring.",
        ]),
        paragraph(
          text(
            "Setelah dikirim, petugas penyuluh memeriksa laporan sebelum temuan masuk ke radar terverifikasi. Hasil peninjauan menjadi konteks bersama, bukan pengganti kunjungan lapangan.",
          ),
        ),
      ],
    },
  },
];

export async function seedEducation(client: DatabaseTransaction) {
  const seeded = [];
  for (const article of educationArticles) {
    const row = await client.educationArticle.upsert({
      where: { slug: article.slug },
      create: {
        ...article,
        content: article.content as Prisma.InputJsonValue,
        status: "published",
        authorId: administrator.id,
        publishedAt: ago(72),
        updatedAt: ago(72),
      },
      update: {},
      select: { id: true },
    });
    seeded.push(row);
  }
  await client.activityLog.createMany({
    data: seeded.map((article, index) => ({
      id: demoId(401 + index),
      kind: "audit",
      category: "education",
      action: "education.article.seeded",
      actorId: administrator.id,
      actorRole: "admin",
      targetType: "education_article",
      targetId: article.id,
      summary: "Artikel edukasi demo disiapkan untuk presentasi.",
      createdAt: ago(72 - index),
    })),
    skipDuplicates: true,
  });
  await client.activityLog.createMany({
    data: [
      {
        id: demoId(404),
        kind: "audit",
        category: "account",
        action: "account.demo.seeded",
        actorId: administrator.id,
        actorRole: "admin",
        targetType: "user",
        targetId: administrator.id,
        summary: "Akun demo Admin disiapkan untuk pengelolaan VEKTOR.",
        createdAt: ago(72),
      },
    ],
    skipDuplicates: true,
  });
}
