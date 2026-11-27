import { readdir } from "node:fs/promises";
import { homePath } from "../lib/routes";

const development = process.argv.includes("--dev");
const build = development ? "dev" : (await Bun.file(".next/BUILD_ID").text()).trim();
const staticAssets = development
  ? []
  : (await readdir(".next/static", { recursive: true }))
      .filter((path) => /\.(js|css|woff2|woff|ttf)$/.test(path))
      .map((path) => `/_next/static/${path}`);
const assets = [
  homePath,
  "/sawah-cikampek.webp",
  "/pratinjau-radar-karawang.webp",
  "/manifest.webmanifest",
  "/icon-192.png",
  "/icon-512.png",
  "/maps/karawang-districts.geojson",
  "/maplibre-worker.mjs",
  ...staticAssets,
];

const result = await Bun.build({
  entrypoints: ["lib/pwa/service-worker.ts"],
  target: "browser",
  format: "iife",
  minify: !development,
  define: { SW_BUILD: JSON.stringify(build), SW_ASSETS: JSON.stringify(assets) },
});
if (!result.success) throw new Error(result.logs.join("\n"));
await Bun.write(development ? "public/sw-dev.js" : "public/sw.js", result.outputs[0]);
