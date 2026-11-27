import * as maplibre from "maplibre-gl";
import { tw } from "@/lib/tw";
import type { DistrictState } from "./radar-style";

export type PopupState = { popup: maplibre.Popup; id: string; name: string };

const formatCount = new Intl.NumberFormat("id-ID");

export function updatePopup({ popup, id, name }: PopupState, districts: Map<string, DistrictState> | null) {
  const count = districts?.get(id)?.count ?? 0;
  const cluster = districts?.get(id)?.clustered ?? false;
  const content = document.createElement("div");
  content.className = tw("district-popup");
  const title = document.createElement("strong");
  title.textContent = name;
  content.append(title);
  if (districts) {
    const total = document.createElement("p");
    total.textContent = `${formatCount.format(count)} laporan terverifikasi`;
    const state = document.createElement("span");
    state.className = tw(cluster ? "tag tag-alert" : count > 0 ? "tag tag-pending" : "tag");
    state.textContent = cluster ? "Klaster aktif" : count > 0 ? "Temuan sporadis" : "Tanpa temuan";
    content.append(total, state);
  } else {
    const note = document.createElement("p");
    note.textContent = "Ringkasan temuan belum tersedia.";
    content.append(note);
  }
  popup.setDOMContent(content);
}
