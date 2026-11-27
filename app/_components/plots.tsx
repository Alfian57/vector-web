"use client";

import { MapPin, Plus, Trash2 } from "lucide-react";
import { useState, type FormEvent } from "react";
import type { MapPackage } from "@/lib/domain";
import type { OfflineMap } from "@/lib/pwa/storage";
import { FieldLabel } from "./field-label";
import { LocationFields, type Coordinates } from "./location-fields";
import { usePlots } from "./use-plots";
import { tw } from "@/lib/tw";

const blank: Coordinates = { longitude: "", latitude: "" };

export function Plots({ tiles, offlineMap }: { tiles?: MapPackage; offlineMap?: OfflineMap }) {
  const [coordinates, setCoordinates] = useState<Coordinates>(blank);
  const [selected, setSelected] = useState<{ id: string; name: string }>();
  const [adding, setAdding] = useState(false);
  const { plots, busy, issue, addPlot, removePlot } = usePlots();

  async function add(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const saved = await addPlot({
      name: String(form.get("name") ?? ""),
      longitude: Number(coordinates.longitude),
      latitude: Number(coordinates.latitude),
    });
    if (saved) {
      setAdding(false);
      setCoordinates(blank);
    }
  }

  return (
    <section className={tw("panel")}>
      <div className={tw("panel-heading")}>
        <div>
          <h2>Petak pantauan</h2>
          <p>Terima peringatan untuk kecamatan tempat petak terdaftar.</p>
        </div>
        <button className={tw("secondary")} onClick={() => setAdding(!adding)} aria-expanded={adding}>
          <Plus size={17} /> {adding ? "Tutup form" : "Tambah petak"}
        </button>
      </div>
      {issue && (
        <p className={tw("panel-note error-text")} role="alert">
          {issue}
        </p>
      )}
      {adding && (
        <form className={tw("field-form embedded")} onSubmit={add}>
          <label>
            <FieldLabel required>Nama petak</FieldLabel>
            <input name="name" required maxLength={80} placeholder="Contoh: Petak utara" />
          </label>
          <LocationFields value={coordinates} onChange={setCoordinates} tiles={tiles} offlineMap={offlineMap} />
          <button className={tw("primary")} disabled={busy}>
            {busy ? "Menyimpan…" : "Simpan petak"}
          </button>
        </form>
      )}
      {plots?.length ? (
        <ul className={tw("list")}>
          {plots.map((plot) => (
            <li key={plot.id}>
              <div>
                <strong>{plot.name}</strong>
                <p>
                  <MapPin size={14} /> {plot.districtName}
                </p>
              </div>
              <button className={tw("icon-button")} aria-label={`Hapus ${plot.name}`} onClick={() => setSelected(plot)}>
                <Trash2 size={17} />
              </button>
            </li>
          ))}
        </ul>
      ) : (
        <p className={tw("empty")}>
          {plots ? "Belum ada petak pantauan." : issue ? "Daftar petak belum tersedia." : "Memuat petak…"}
        </p>
      )}
      {selected && (
        <div className={tw("panel-note")} role="group" aria-label="Konfirmasi penghapusan">
          <p>Hapus {selected.name} dari pantauan? Peringatan baru tidak akan dikirim untuk petak ini.</p>
          <div className={tw("button-row action-row")}>
            <button className={tw("secondary")} onClick={() => setSelected(undefined)}>
              Batal
            </button>
            <button
              className={tw("danger")}
              onClick={() => void removePlot(selected.id, () => setSelected(undefined))}
              disabled={busy}
            >
              Hapus petak
            </button>
          </div>
        </div>
      )}
    </section>
  );
}
