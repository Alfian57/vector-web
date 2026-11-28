import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  ...(process.env.VEKTOR_TEST_NEXT_DIST_DIR ? { distDir: process.env.VEKTOR_TEST_NEXT_DIST_DIR } : {}),
  experimental: {
    agentFeedback: true,
    // Cached Radar documents must hydrate offline without the development WebSocket.
    reactDebugChannel: false,
  },
  cacheComponents: true,
  partialPrefetching: true,
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
};

export default nextConfig;
