import type { GeoJSONSource, Map } from "maplibre-gl";

export function whenStyleReady(map: Map, sourceId: string, apply: (source: GeoJSONSource) => void) {
  let appliedTo: GeoJSONSource | undefined;
  const update = () => {
    if (!map.isStyleLoaded()) return;
    const source = map.getSource<GeoJSONSource>(sourceId);
    if (!source || appliedTo === source) return;
    appliedTo = source;
    apply(source);
  };
  map.on("styledata", update);
  map.on("idle", update);
  update();
  return () => {
    map.off("styledata", update);
    map.off("idle", update);
  };
}
