import { afterEach, describe, expect, test } from "bun:test";

type Listener = (event: unknown) => void;

type MockCache = {
  addAll: (requests: Request[]) => Promise<void>;
  match: (key: string) => Promise<Response | undefined>;
  put: (key: string, response: Response) => Promise<void>;
};

function createSwHarness() {
  const listeners = new Map<string, Listener[]>();
  const cacheStores = new Map<string, Map<string, Response>>();
  const postedMessages: string[] = [];
  const openedWindows: string[] = [];
  const notifications: Array<{ title: string; options: NotificationOptions & { tag?: string } }> = [];

  const getStore = (name: string) => {
    let store = cacheStores.get(name);
    if (!store) {
      store = new Map();
      cacheStores.set(name, store);
    }
    return store;
  };

  const mockCaches = {
    async open(name: string): Promise<MockCache> {
      const store = getStore(name);
      return {
        async addAll(requests) {
          for (const req of requests) {
            store.set(new URL(req.url, "http://127.0.0.1:3101").pathname, new Response("ok", { status: 200 }));
          }
        },
        async match(key) {
          return store.get(key);
        },
        async put(key, response) {
          store.set(key, response);
        },
      };
    },
    async keys() {
      return [...cacheStores.keys()];
    },
    async delete(name: string) {
      return cacheStores.delete(name);
    },
  };

  const globals = globalThis as Record<string, unknown>;
  const OrigRequest = globalThis.Request;
  const saved = {
    SW_BUILD: globals.SW_BUILD,
    SW_ASSETS: globals.SW_ASSETS,
    caches: globals.caches,
    location: globals.location,
    clients: globals.clients,
    registration: globals.registration,
    skipWaiting: globals.skipWaiting,
    addEventListener: globals.addEventListener,
    Request: globals.Request,
  };

  globals.Request = class extends OrigRequest {
    constructor(input: RequestInfo | URL, init?: RequestInit) {
      const resolved = typeof input === "string" && input.startsWith("/") ? `http://127.0.0.1:3101${input}` : input;
      super(resolved, init);
    }
  };

  globals.SW_BUILD = "test-build-2";
  globals.SW_ASSETS = ["/", "/icon-192.png"];
  globals.caches = mockCaches;
  globals.location = { origin: "http://127.0.0.1:3101" };
  globals.clients = {
    claim: async () => {},
    matchAll: async () => [{ postMessage: (value: string) => postedMessages.push(value) }],
    openWindow: async (url: string) => {
      openedWindows.push(url);
      return null;
    },
  };
  globals.registration = {
    showNotification: async (title: string, options: NotificationOptions & { tag?: string }) => {
      notifications.push({ title, options });
    },
  };
  globals.skipWaiting = async () => {};
  globals.addEventListener = (type: string, listener: Listener) => {
    const list = listeners.get(type) ?? [];
    list.push(listener);
    listeners.set(type, list);
  };

  return {
    listeners,
    cacheStores,
    postedMessages,
    openedWindows,
    notifications,
    restore() {
      for (const [key, value] of Object.entries(saved)) {
        if (value === undefined) delete globals[key];
        else globals[key] = value;
      }
    },
  };
}

let restoreFn: (() => void) | undefined;

afterEach(() => {
  restoreFn?.();
  restoreFn = undefined;
});

describe("service worker event handlers", () => {
  test("handles install, activate cleanup, push notification, and notification click", async () => {
    const harness = createSwHarness();
    restoreFn = harness.restore;
    harness.cacheStores.set("vektor-shell-old", new Map());

    const result = await Bun.build({
      entrypoints: ["lib/pwa/service-worker.ts"],
      target: "browser",
      format: "cjs",
      define: {
        SW_BUILD: JSON.stringify("test-build-2"),
        SW_ASSETS: JSON.stringify(["/", "/icon-192.png"]),
      },
    });
    expect(result.success).toBe(true);
    const code = await result.outputs[0].text();
    const runner = new Function("module", "exports", "require", code);
    const mod = { exports: {} };
    runner(mod, mod.exports, () => ({}));

    const waitUntilPromises: Promise<unknown>[] = [];
    const makeWaitEvent = (extra: Record<string, unknown> = {}) => ({
      ...extra,
      waitUntil: (promise: Promise<unknown>) => waitUntilPromises.push(promise),
    });

    for (const listener of harness.listeners.get("install") ?? []) listener(makeWaitEvent());
    await Promise.all(waitUntilPromises.splice(0));
    expect(harness.cacheStores.get("vektor-shell-test-build-2")?.has("/icon-192.png")).toBe(true);

    for (const listener of harness.listeners.get("activate") ?? []) listener(makeWaitEvent());
    await Promise.all(waitUntilPromises.splice(0));
    expect(harness.cacheStores.has("vektor-shell-old")).toBe(false);

    for (const listener of harness.listeners.get("push") ?? []) {
      listener(makeWaitEvent({ data: { json: () => ({ id: "alert-123" }) } }));
    }
    await Promise.all(waitUntilPromises.splice(0));
    expect(harness.notifications).toHaveLength(1);
    expect(harness.notifications[0].options.tag).toBe("alert-123");

    let closed = false;
    for (const listener of harness.listeners.get("notificationclick") ?? []) {
      listener(
        makeWaitEvent({
          notification: {
            close: () => {
              closed = true;
            },
          },
        }),
      );
    }
    await Promise.all(waitUntilPromises.splice(0));
    expect(closed).toBe(true);
    expect(harness.openedWindows).toEqual(["/radar"]);
  });
});
