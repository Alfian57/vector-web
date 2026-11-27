import type { StyleSpecification } from "maplibre-gl";
import { districtPath, type DistrictSummary } from "@/lib/domain";

export const localSource = "vektor-base";
export const districtsSource = "vektor-districts";
export const pinSource = "vektor-pin";
export const districtFill = "vektor-district-fill";
export type MapMode = "map" | "satellite";
export type DistrictState = { count: number; clustered: boolean };

export function districtStates(summaries: readonly DistrictSummary[]) {
  const districts = new Map<string, DistrictState>();
  for (const row of summaries) {
    const previous = districts.get(row.id);
    districts.set(row.id, {
      count: (previous?.count ?? 0) + row.count,
      clustered: Boolean(previous?.clustered || row.clustered),
    });
  }
  return districts;
}

export function withRadarLayers(style: StyleSpecification, satellite = false): StyleSpecification {
  return {
    ...style,
    sources: {
      ...style.sources,
      [districtsSource]: { type: "geojson", data: districtPath, promoteId: "id" },
      [pinSource]: { type: "geojson", data: { type: "FeatureCollection", features: [] } },
    },
    layers: [
      ...style.layers,
      { id: districtFill, type: "fill", source: districtsSource, paint: {
        "fill-color": ["case", ["boolean", ["feature-state", "clustered"], false], "#d75a3c",
          [">", ["number", ["feature-state", "count"], 0], 0], "#e9ac43", "#a5bba0"],
        "fill-opacity": ["case", ["boolean", ["feature-state", "clustered"], false], satellite ? 0.57 : 0.45,
          [">", ["number", ["feature-state", "count"], 0], 0], satellite ? 0.5 : 0.38, satellite ? 0.06 : 0.12],
      } },
      { id: "vektor-district-line", type: "line", source: districtsSource, paint: {
        "line-color": satellite ? "#f3f7ea" : "#576c54", "line-opacity": satellite ? 0.75 : 0.65, "line-width": 1.2,
      } },
      { id: "vektor-district-label", type: "symbol", source: districtsSource, minzoom: 8, layout: {
        "text-field": ["get", "name"],
        "text-font": style.glyphs ? ["Noto Sans Bold"] : ["Arial", "sans-serif"],
        "text-size": ["interpolate", ["linear"], ["zoom"], 8, 10, 11, 12, 14, 14],
        "text-max-width": 9,
        "text-padding": 4,
      }, paint: {
        "text-color": satellite ? "#fffdf5" : "#203d37",
        "text-halo-color": satellite ? "#15271d" : "#fbfcf5",
        "text-halo-width": satellite ? 1.6 : 1.25,
      } },
      { id: "vektor-pin-circle", type: "circle", source: pinSource, paint: {
        "circle-color": "#143b2c", "circle-radius": 7, "circle-stroke-color": "#fff", "circle-stroke-width": 2,
      } },
    ],
  };
}

export function localRadarStyle(tileSource?: string): StyleSpecification {
  const sources: StyleSpecification["sources"] = {};
  if (tileSource) {
    sources[localSource] = {
      type: "vector",
      url: `pmtiles://${tileSource}`,
      attribution: '© <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noreferrer">OpenStreetMap contributors</a>',
    };
  }
  return withRadarLayers({
    version: 8,
    sources,
    layers: [
      { id: "earth", type: "background", paint: { "background-color": "#e2e8d4" } },
      ...(tileSource ? [
        { id: "landuse", type: "fill", source: localSource, "source-layer": "landuse", paint: { "fill-color": "#cedaba", "fill-opacity": 0.62 } },
        { id: "water", type: "fill", source: localSource, "source-layer": "water", paint: { "fill-color": "#a8cbc5" } },
        { id: "rivers", type: "line", source: localSource, "source-layer": "water", paint: { "line-color": "#9bc5bc", "line-width": 1.3 } },
        { id: "roads", type: "line", source: localSource, "source-layer": "roads", minzoom: 8,
          paint: { "line-color": "#fffdf1", "line-opacity": 0.86, "line-width": ["interpolate", ["linear"], ["zoom"], 8, 0.25, 14, 2] } },
      ] satisfies StyleSpecification["layers"] : []),
    ],
  });
}

export async function loadMapTilerStyle(key: string, mode: MapMode, signal: AbortSignal) {
  const name = mode === "satellite" ? "satellite-v4" : "dataviz-v4-light";
  const url = new URL(`https://api.maptiler.com/maps/${name}/style.json`);
  url.searchParams.set("key", key);
  const response = await fetch(url, { credentials: "omit", signal });
  if (!response.ok) throw new Error("MapTiler style unavailable");
  const style: unknown = await response.json();
  if (!style || typeof style !== "object" || !("version" in style) || style.version !== 8 ||
    !("sources" in style) || !style.sources || typeof style.sources !== "object" ||
    Array.isArray(style.sources) || !("layers" in style) || !Array.isArray(style.layers)) {
    throw new Error("Invalid MapTiler style");
  }
  // MapLibre validates the full style specification when it is applied.
  return withRadarLayers(style as StyleSpecification, mode === "satellite");
}
