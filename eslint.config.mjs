import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";

const eslintConfig = defineConfig([
  ...nextVitals,
  ...nextTs,
  // Override default ignores of eslint-config-next.
  globalIgnores([
    // Default ignores of eslint-config-next:
    ".next/**",
    "out/**",
    "build/**",
    "next-env.d.ts",
    "generated/prisma/**",
    "public/sw.js",
    "public/sw-dev.js",
    "public/maplibre-worker.mjs",
    "playwright-report/**",
    "test-results/**",
  ]),
]);

export default eslintConfig;
