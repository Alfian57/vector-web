import { defineConfig } from "@playwright/test";

export default defineConfig({
  testDir: ".",
  testMatch: /offline-harness\.spec\.ts/,
  timeout: 60_000,
  workers: 1,
  use: {
    baseURL: process.env.INTEGRATION_BASE_URL ?? "http://127.0.0.1:3101",
    trace: "retain-on-failure",
  },
});
