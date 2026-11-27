import { copyFile } from "node:fs/promises";

// MapLibre's module worker needs its own same-origin URL when bundled by Next.js.
await copyFile("node_modules/maplibre-gl/dist/maplibre-gl-worker.mjs", "public/maplibre-worker.mjs");
