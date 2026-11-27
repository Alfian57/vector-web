export const cacheRadarShellMessage = "vektor-cache-radar-shell";

export function prepareRadarShell(worker: ServiceWorker) {
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
    worker.postMessage(cacheRadarShellMessage, [channel.port2]);
  });
}
