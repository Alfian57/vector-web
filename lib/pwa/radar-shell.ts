export const cacheRadarShellMessage = "vektor-cache-radar-shell";

export function isNextShellAsset(path: string) {
  return path.startsWith("/_next/static/") && /\.(?:js|css|woff2?|ttf)$/.test(path);
}

function loadedShellAssets() {
  const assets = new Set<string>();
  for (const entry of performance.getEntriesByType("resource")) {
    const url = new URL(entry.name, location.href);
    if (url.origin === location.origin && isNextShellAsset(url.pathname)) assets.add(url.pathname);
  }
  return [...assets];
}

export function prepareRadarShell(worker: ServiceWorker, prepareDevelopmentAssets = false) {
  return new Promise<void>((resolve, reject) => {
    const channel = new MessageChannel();
    const timeout = setTimeout(() => finish(false), 10_000);
    function finish(cached: boolean) {
      clearTimeout(timeout);
      channel.port1.close();
      if (cached) resolve();
      else reject(new Error("Radar dashboard is unavailable offline"));
    }
    channel.port1.onmessage = ({ data }) => finish(data === true);
    const message =
      process.env.NODE_ENV === "development" && prepareDevelopmentAssets
        ? { type: cacheRadarShellMessage, assets: loadedShellAssets() }
        : cacheRadarShellMessage;
    worker.postMessage(message, [channel.port2]);
  });
}
