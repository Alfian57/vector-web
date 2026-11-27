import { syncReports, syncTag } from "./sync";
import { offlineDb } from "./storage";
import { cacheRadarShellMessage } from "./radar-shell";
import { homePath, radarAlertsPath, radarPath } from "../routes";

declare const SW_BUILD: string;
declare const SW_ASSETS: string[];

interface WorkerEvent extends Event {
  waitUntil(promise: Promise<unknown>): void;
}
interface WorkerFetchEvent extends WorkerEvent {
  request: Request;
  respondWith(response: Promise<Response>): void;
}
interface WorkerPushEvent extends WorkerEvent {
  data?: { json(): unknown };
}
interface WorkerMessageEvent extends WorkerEvent {
  data: unknown;
  ports: readonly MessagePort[];
}
interface WorkerNotificationClick extends WorkerEvent {
  notification: { close(): void };
}

const worker = globalThis as typeof globalThis & {
  clients: {
    claim(): Promise<void>;
    matchAll(): Promise<Array<{ postMessage(value: string): void }>>;
    openWindow(url: string): Promise<unknown>;
  };
  registration: { showNotification(title: string, options: NotificationOptions & { tag?: string }): Promise<void> };
  skipWaiting(): Promise<void>;
  addEventListener(type: string, listener: (event: never) => void): void;
};
const cacheName = `vektor-shell-${SW_BUILD}`;

async function cacheRadarPage(response: Response) {
  if (!response.ok || response.redirected || !response.headers.get("Content-Type")?.includes("text/html")) return false;
  const copy = response.clone();
  await (await caches.open(cacheName)).put(radarPath, copy);
  return true;
}

worker.addEventListener("install", (event: WorkerEvent) => {
  event.waitUntil((async () => {
    const cache = await caches.open(cacheName);
    await cache.addAll(SW_ASSETS.map((path) => new Request(path, { credentials: "omit", cache: "reload" })));
    await worker.skipWaiting();
  })());
});
worker.addEventListener("activate", (event: WorkerEvent) => {
  event.waitUntil((async () => {
    await Promise.all((await caches.keys()).filter((name) => name.startsWith("vektor-shell-") && name !== cacheName)
      .map((name) => caches.delete(name)));
    await worker.clients.claim();
  })());
});
worker.addEventListener("message", (event: WorkerMessageEvent) => {
  const port = event.ports[0];
  if (event.data !== cacheRadarShellMessage || !port) return;
  event.waitUntil((async () => {
    const response = await fetch(radarPath, { credentials: "same-origin", cache: "no-store", redirect: "error" });
    return cacheRadarPage(response);
  })().then((cached) => port.postMessage(cached), () => port.postMessage(false)));
});
worker.addEventListener("fetch", (event: WorkerFetchEvent) => {
  const { request } = event;
  const url = new URL(request.url);
  if (url.origin !== location.origin || request.method !== "GET" || request.headers.has("range")) return;
  const isShell = url.pathname === homePath || url.pathname === radarPath;
  if (request.mode === "navigate" && isShell) {
    const navigation = fetch(request);
    if (url.pathname === radarPath) {
      event.waitUntil(navigation.then(cacheRadarPage).catch(() => {}));
    }
    event.respondWith(navigation.catch(async () => {
      if (url.pathname === homePath && url.searchParams.get("view") === "alerts") {
        return Response.redirect(new URL(radarAlertsPath, url.origin), 307);
      }
      if (url.pathname === radarPath) {
        const owner = await offlineDb().accounts.get("account").catch(() => undefined);
        if (!owner) return Response.redirect(new URL(homePath, url.origin), 307);
      }
      return (await (await caches.open(cacheName)).match(url.pathname)) ?? Response.error();
    }));
  } else if (SW_ASSETS.includes(url.pathname) && !isShell) {
    event.respondWith(caches.open(cacheName).then(async (cache) => (await cache.match(url.pathname)) ?? fetch(request)));
  }
});
worker.addEventListener("sync", (event: WorkerEvent & { tag: string }) => {
  if (event.tag === syncTag) {
    event.waitUntil(syncReports().finally(async () => {
      for (const client of await worker.clients.matchAll()) client.postMessage("vektor-queue-changed");
    }));
  }
});
worker.addEventListener("push", (event: WorkerPushEvent) => {
  let data: unknown;
  try { data = event.data?.json(); } catch { data = null; }
  const id = data && typeof data === "object" && "id" in data && typeof data.id === "string" ? data.id : "vektor";
  event.waitUntil(worker.registration.showNotification("Peringatan baru dari VEKTOR", {
    body: "Buka kotak masuk untuk melihat peringatan wilayah Anda.",
    icon: "/icon-192.png",
    tag: id,
  }));
});
worker.addEventListener("notificationclick", (event: WorkerNotificationClick) => {
  event.notification.close();
  event.waitUntil(worker.clients.openWindow(radarAlertsPath));
});
