import type { CSSProperties } from "react";
import { radarPalette } from "./radar-style";

const legend = [
  ["Klaster aktif", radarPalette.cluster],
  ["Temuan sporadis", radarPalette.observed],
  ["Tanpa temuan", radarPalette.empty],
] as const;

export function RadarLegend() {
  return (
    <div className="dashboard-map-legend" aria-label="Legenda peta">
      {legend.map(([label, color]) => (
        <span key={label}>
          <i aria-hidden="true" style={{ "--legend-color": color } as CSSProperties} />
          {label}
        </span>
      ))}
    </div>
  );
}
