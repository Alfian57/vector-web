import type { NextConfig } from "next";
import { homePath, radarPath } from "./lib/routes";

const nextConfig: NextConfig = {
  experimental: { agentFeedback: true },
  cacheComponents: true,
  partialPrefetching: true,
  async redirects() {
    return [{
      source: homePath,
      destination: radarPath,
      has: [{ type: "query", key: "view", value: "alerts" }],
      permanent: false,
    }];
  },
  async headers() {
    return ["/sw.js", "/sw-dev.js"].map((source) => ({
      source,
      headers: [
        { key: "Cache-Control", value: "no-cache, no-store, must-revalidate" },
        { key: "Content-Type", value: "application/javascript; charset=utf-8" },
        { key: "X-Content-Type-Options", value: "nosniff" },
      ],
    }));
  },
  turbopack: {
    rules: { "app/globals.css": { loaders: ["@tailwindcss/turbopack"], as: "*.css" } },
  },
};

export default nextConfig;
