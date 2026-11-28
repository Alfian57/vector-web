const actionLabels: Record<string, string> = {
  "page.view": "Membuka halaman",
  "admin.access.denied": "Akses admin ditolak",
  "account.role.changed": "Mengubah peran akun",
  "account.banned": "Menonaktifkan akun",
  "account.unbanned": "Mengaktifkan akun",
  "account.profile.updated": "Memperbarui profil akun",
  "account.avatar.updated": "Mengganti foto profil",
  "account.avatar.deleted": "Menghapus foto profil",
  "education.article.created": "Membuat artikel edukasi",
  "education.article.updated": "Memperbarui artikel edukasi",
  "education.article.published": "Menerbitkan artikel edukasi",
  "education.article.draft": "Menyimpan artikel sebagai draf",
  "education.article.archived": "Mengarsipkan artikel edukasi",
  "education.article.restored": "Memulihkan artikel edukasi",
  "education.image.uploaded": "Mengunggah gambar artikel",
  auth_handler_failed: "Gangguan layanan masuk",
  "log-prune.job_failed": "Pembersihan catatan aktivitas gagal",
  "log-prune.recovered": "Pembersihan catatan aktivitas berjalan kembali",
};

const authActionLabels: Record<string, string> = {
  "sign-in.email": "Masuk dengan email",
  "sign-in.phone-number": "Masuk dengan nomor telepon",
  "sign-out": "Keluar dari akun",
  "whatsapp.register": "Mendaftarkan WhatsApp",
  "whatsapp.link": "Menghubungkan WhatsApp",
  "phone-number.send-otp": "Mengirim kode verifikasi",
  "phone-number.request-password-reset": "Meminta pengaturan ulang kata sandi",
  "phone-number.reset-password": "Mengatur ulang kata sandi",
  "change-password": "Mengubah kata sandi",
};

const apiActionLabels: Record<string, string> = {
  "post.reports": "Mengirim laporan",
  "patch.reports": "Memeriksa laporan",
  "post.plots": "Menambahkan petak",
  "delete.plots": "Menghapus petak",
  "patch.alerts": "Menandai peringatan telah dibaca",
  "patch.admin.accounts": "Mengelola akses akun",
  "post.admin.education": "Menyimpan artikel edukasi",
  "patch.admin.education": "Memperbarui artikel edukasi",
  "delete.admin.education": "Mengarsipkan artikel edukasi",
  "patch.profile": "Memperbarui profil akun",
  "post.profile.avatar": "Mengunggah foto profil",
  "delete.profile.avatar": "Menghapus foto profil",
  "post.ppl.aid-allocations": "Mencatat penyaluran bantuan",
  "patch.ppl.aid-allocations": "Memperbarui penyaluran bantuan",
  "put.ppl.follow-ups": "Menyimpan tindak lanjut PPL",
  "post.ppl.broadcasts": "Mengirim pengumuman PPL",
  "post.push": "Mengaktifkan notifikasi perangkat",
  "delete.push": "Menonaktifkan notifikasi perangkat",
};

const categoryFallbacks: Record<string, string> = {
  account: "Memperbarui data akun",
  admin: "Melakukan pengelolaan admin",
  api: "Memperbarui data aplikasi",
  auth: "Mengelola akses akun",
  education: "Memperbarui materi edukasi",
  page: "Membuka halaman",
  worker: "Memperbarui layanan aplikasi",
  seed: "Menyiapkan data aplikasi",
};

function apiLabel(action: string) {
  const match = action.match(/^api\.(post|patch|put|delete)\.(.+)$/);
  if (!match) return null;

  const [, method, rawRoute] = match;
  const routeSegments = rawRoute.split(".");
  const lastSegment = routeSegments[routeSegments.length - 1];
  const route = routeSegments.length > 1 && /^[0-9a-f-]{20,}$/i.test(lastSegment ?? "")
    ? routeSegments.slice(0, -1).join(".")
    : rawRoute;
  return apiActionLabels[`${method}.${route}`] ?? null;
}

export function activityActionLabel(action: string, category: string) {
  const knownLabel = actionLabels[action];
  if (knownLabel) return knownLabel;

  const authMatch = action.match(/^auth\.(.+)\.(success|failure)$/);
  if (authMatch) return authActionLabels[authMatch[1]] ?? "Mengelola akses akun";

  const requestLabel = apiLabel(action);
  if (requestLabel) return requestLabel;

  if (action.endsWith(".recovered")) return "Layanan kembali berjalan";
  if (action.endsWith(".job_failed")) return "Layanan mengalami gangguan";

  return categoryFallbacks[category] ?? "Melakukan aktivitas aplikasi";
}
