"use client";

import { ClipboardCheck } from "lucide-react";
import { tw } from "@/lib/tw";

export function FieldGuide({ onReport }: { onReport: () => void }) {
  return (
    <section className={tw("panel")} aria-labelledby="field-guide-heading">
      <div className={tw("panel-heading")}>
        <div className={tw("section-title")}>
          <ClipboardCheck size={21} />
          <h2 id="field-guide-heading">Panduan pemeriksaan di lahan</h2>
        </div>
      </div>
      <ol className={tw("field-guide")}>
        <li>Periksa beberapa titik di petak. Catat lokasi dan waktu pengamatan serta bagian tanaman yang berubah.</li>
        <li>
          Ambil foto daun yang jelas dan catat jumlah rumpun yang terlihat bergejala. Masukkan dugaan jika Anda
          mengenalinya.
        </li>
        <li>
          Kirim laporan untuk diperiksa PPL. Gunakan catatan petugas untuk menentukan tindak lanjut di petak Anda.
        </li>
      </ol>
      <div className={tw("panel-note button-row action-row")}>
        <button className={tw("secondary")} onClick={onReport}>
          Catat temuan di lahan
        </button>
      </div>
    </section>
  );
}
