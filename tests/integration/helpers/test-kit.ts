import { randomUUID } from "node:crypto";
import { hashPassword } from "better-auth/crypto";
import sharp from "sharp";
import { db } from "../../../lib/server/db";
import type { FonnteMode } from "./fonnte-control";

export const testPassword = "test-password-2026";

export function baseUrl() {
  const value = process.env.INTEGRATION_BASE_URL ?? process.env.BETTER_AUTH_URL;
  if (!value) throw new Error("INTEGRATION_BASE_URL is required");
  return value;
}

export function fonnteControlUrl() {
  const value = process.env.FONNTE_CONTROL_URL;
  if (!value) throw new Error("FONNTE_CONTROL_URL is required");
  return value;
}

export function assertSafeTestDatabase(allowedDatabases = new Set(["vektor_test", "vektor_mig_fresh", "vektor_mig_legacy"])) {
  const raw = process.env.DATABASE_URL?.trim();
  if (!raw) throw new Error("DATABASE_URL is required for integration tests");
  const parsed = URL.parse(raw);
  if (!parsed || !["127.0.0.1", "localhost"].includes(parsed.hostname)) {
    throw new Error(`Refusing non-local DATABASE_URL host: ${parsed?.hostname ?? "invalid"}`);
  }
  if (parsed.port === "5433") {
    throw new Error("Refusing active development port 5433 in integration test helper");
  }
  const dbName = parsed.pathname.replace(/^\//, "");
  if (!allowedDatabases.has(dbName)) {
    throw new Error(`Refusing unexpected database '${dbName}'; expected one of ${[...allowedDatabases].join(", ")}`);
  }
  return { url: raw, dbName, port: parsed.port };
}

let phoneCounter = 1;
export function nextTestPhone() {
  const suffix = String(phoneCounter++).padStart(6, "0");
  return `+6280000${suffix}`;
}

export async function setFonnteMode(mode: FonnteMode) {
  const response = await fetch(`${fonnteControlUrl()}/__test/mode`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ mode }),
  });
  if (!response.ok) throw new Error(`Failed to set Fonnte mode: ${response.status}`);
}

export async function resetFonnteStub() {
  const response = await fetch(`${fonnteControlUrl()}/__test/reset`, { method: "POST" });
  if (!response.ok) throw new Error(`Failed to reset Fonnte stub: ${response.status}`);
}

export async function getCapturedOtp(phoneNumber: string, purpose: "verifikasi akun" | "atur ulang kata sandi" = "verifikasi akun") {
  const target = phoneNumber.startsWith("+") ? phoneNumber.slice(1) : phoneNumber;
  const url = new URL("/messages", fonnteControlUrl());
  url.searchParams.set("target", target);
  const deadline = Date.now() + 8000;
  while (Date.now() < deadline) {
    const response = await fetch(url);
    const data = (await response.json()) as { message: string | null };
    const code = data.message?.match(new RegExp(`${purpose}: (\\d{6})`))?.[1];
    if (code) return code;
    await Bun.sleep(40);
  }
  throw new Error(`Timed out waiting for OTP (${purpose}) for ${target}`);
}

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

export async function clearRateLimits() {
  assertSafeTestDatabase();
  await db().rateLimit.deleteMany();
}

export async function resetMutableState() {
  assertSafeTestDatabase();
  await resetFonnteStub();
  await db().$executeRawUnsafe(`
    TRUNCATE TABLE
      education_images,
      education_articles,
      activity_logs,
      worker_job_status,
      aid_corrections,
      aid_deliveries,
      aid_allocations,
      follow_up_entries,
      follow_ups,
      push_jobs,
      push_subscriptions,
      alert_recipients,
      alerts,
      report_review_history,
      report_photos,
      reports,
      plots,
      radar_counts,
      local_weather,
      session,
      account,
      verification,
      "rateLimit",
      "user"
    RESTART IDENTITY CASCADE
  `);
  await db().radarState.update({ where: { onlyRow: true }, data: { revision: 0 } });
}

export async function createWhatsAppAccount(
  session: TestSession,
  { name, role = "farmer", phone = nextTestPhone(), password = testPassword }: {
    name: string;
    role?: "farmer" | "officer" | "admin";
    phone?: string;
    password?: string;
  },
) {
  await clearRateLimits();
  const sent = await session.postJson("/api/auth/phone-number/send-otp", { phoneNumber: phone });
  if (!sent.ok) throw new Error(`send-otp failed (${sent.status}): ${await sent.text()}`);

  const code = await getCapturedOtp(phone, "verifikasi akun");
  const registered = await session.postJson("/api/auth/whatsapp/register", {
    phoneNumber: phone,
    code,
    name,
    password,
  });
  if (!registered.ok) throw new Error(`whatsapp/register failed (${registered.status}): ${await registered.text()}`);

  if (role !== "farmer") {
    await db().user.update({ where: { phoneNumber: phone }, data: { role } });
  }

  const signedIn = await session.postJson("/api/auth/sign-in/phone-number", { phoneNumber: phone, password });
  if (!signedIn.ok) throw new Error(`sign-in failed (${signedIn.status}): ${await signedIn.text()}`);

  const meRes = await session.get("/api/session");
  const me = (await meRes.json()) as { id: string; name: string; role: "farmer" | "officer" | "admin"; whatsappLinked?: boolean };
  return { ...me, phoneNumber: phone, password };
}

export async function createEmailUserInDb({
  email,
  name,
  role = "farmer",
  emailVerified = true,
  password = testPassword,
}: {
  email: string;
  name: string;
  role?: "farmer" | "officer" | "admin";
  emailVerified?: boolean;
  password?: string;
}) {
  assertSafeTestDatabase();
  const id = randomUUID();
  await db().user.create({
    data: {
      id,
      email,
      emailVerified,
      name,
      role,
      accounts: {
        create: {
          id: randomUUID(),
          accountId: id,
          providerId: "credential",
          password: await hashPassword(password),
        },
      },
    },
  });
  return { id, email, name, role, password };
}

export async function makeJpeg(r = 32, g = 96, b = 42) {
  return sharp({ create: { width: 32, height: 32, channels: 3, background: { r, g, b } } }).jpeg().toBuffer();
}

export async function districtOffsetPoint(districtId: string, eastMeters = 0, northMeters = 0) {
  const [point] = await db().$queryRaw<{ id: string; name: string; longitude: number; latitude: number; inside: boolean }[]>`
    WITH base AS (
      SELECT id, name, geom, ST_Transform(ST_PointOnSurface(geom), 32748) AS utm
      FROM districts
      WHERE id = ${districtId}
    ),
    shifted AS (
      SELECT id, name, geom, ST_Transform(ST_Translate(utm, ${eastMeters}, ${northMeters}), 4326) AS pt
      FROM base
    )
    SELECT id, name, ST_X(pt) AS longitude, ST_Y(pt) AS latitude, ST_Covers(geom, pt) AS inside
    FROM shifted
  `;
  if (!point) throw new Error(`District ${districtId} not found`);
  return point;
}

export async function submitReport(
  session: TestSession,
  ownerId: string,
  {
    id = randomUUID(),
    longitude,
    latitude,
    observedAt = new Date(Date.now() - 5000).toISOString(),
    finding = "blast",
    notes = "Gejala daun",
    photo,
    mimeType = "image/jpeg",
    omitOwnerHeader = false,
  }: {
    id?: string;
    longitude: number;
    latitude: number;
    observedAt?: string;
    finding?: string;
    notes?: string;
    photo?: Buffer;
    mimeType?: string;
    omitOwnerHeader?: boolean;
  },
) {
  const bytes = photo ?? (await makeJpeg());
  const form = new FormData();
  form.set("report", JSON.stringify({ id, longitude, latitude, observedAt, finding, notes }));
  form.set("photo", new Blob([new Uint8Array(bytes)], { type: mimeType }), "daun.jpg");
  const headers: Record<string, string> = {};
  if (!omitOwnerHeader) headers["x-vektor-account"] = ownerId;
  return session.request("/api/reports", {
    method: "POST",
    headers,
    body: form,
  });
}
