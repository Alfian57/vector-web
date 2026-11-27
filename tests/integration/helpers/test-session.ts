import { baseUrl } from "./test-environment";

export class TestSession {
  private readonly cookies = new Map<string, string>();
  readonly origin: string;

  constructor(private readonly root = baseUrl()) {
    this.origin = new URL(root).origin;
  }

  private absorbCookies(headers: Headers) {
    const rawList = typeof headers.getSetCookie === "function" ? headers.getSetCookie() : [];
    for (const raw of rawList) {
      const [pair, ...attrs] = raw.split(";");
      const idx = pair.indexOf("=");
      if (idx <= 0) continue;
      const name = pair.slice(0, idx).trim();
      const value = pair.slice(idx + 1).trim();
      const expired = attrs.some((attr) => {
        const lower = attr.trim().toLowerCase();
        return lower === "max-age=0" || lower.startsWith("expires=thu, 01 jan 1970");
      });
      if (expired || value === "") this.cookies.delete(name);
      else this.cookies.set(name, value);
    }
  }

  cookieHeader() {
    return [...this.cookies.entries()].map(([k, v]) => `${k}=${v}`).join("; ");
  }

  async request(path: string, init: RequestInit & { omitOrigin?: boolean } = {}) {
    const method = (init.method ?? "GET").toUpperCase();
    const headers = new Headers(init.headers);
    const cookie = this.cookieHeader();
    if (cookie) headers.set("cookie", cookie);
    if (!init.omitOrigin && method !== "GET" && method !== "HEAD" && !headers.has("origin")) {
      headers.set("origin", this.origin);
    }
    const response = await fetch(new URL(path, this.root), {
      ...init,
      method,
      headers,
      redirect: init.redirect ?? "manual",
    });
    this.absorbCookies(response.headers);
    return response;
  }

  get(path: string, init: RequestInit = {}) {
    return this.request(path, { ...init, method: "GET" });
  }

  postJson(path: string, data?: unknown, init: RequestInit & { omitOrigin?: boolean } = {}) {
    const headers = new Headers(init.headers);
    if (data !== undefined && !headers.has("content-type")) headers.set("content-type", "application/json");
    return this.request(path, {
      ...init,
      method: "POST",
      headers,
      body: data === undefined ? undefined : JSON.stringify(data),
    });
  }

  patchJson(path: string, data?: unknown, init: RequestInit = {}) {
    const headers = new Headers(init.headers);
    if (data !== undefined && !headers.has("content-type")) headers.set("content-type", "application/json");
    return this.request(path, {
      ...init,
      method: "PATCH",
      headers,
      body: data === undefined ? undefined : JSON.stringify(data),
    });
  }

  putJson(path: string, data?: unknown, init: RequestInit = {}) {
    const headers = new Headers(init.headers);
    if (data !== undefined && !headers.has("content-type")) headers.set("content-type", "application/json");
    return this.request(path, {
      ...init,
      method: "PUT",
      headers,
      body: data === undefined ? undefined : JSON.stringify(data),
    });
  }

  deleteJson(path: string, data?: unknown, init: RequestInit = {}) {
    const headers = new Headers(init.headers);
    if (data !== undefined && !headers.has("content-type")) headers.set("content-type", "application/json");
    return this.request(path, {
      ...init,
      method: "DELETE",
      headers,
      body: data === undefined ? undefined : JSON.stringify(data),
    });
  }
}
