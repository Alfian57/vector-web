import { afterAll, afterEach, beforeAll, describe, expect, test } from "bun:test";
import { APIError } from "better-auth/api";
import { sendWhatsAppCode } from "../../lib/server/fonnte";

type StubMode = "ok" | "status-false" | "http-500" | "invalid-json" | "redirect";

let mode: StubMode = "ok";
const captured: Array<{ auth: string | null; target: FormDataEntryValue | null; countryCode: FormDataEntryValue | null; message: FormDataEntryValue | null }> = [];
let server: ReturnType<typeof Bun.serve>;
let previousAuthUrl: string | undefined;
let previousFonnteUrl: string | undefined;
let previousFonnteToken: string | undefined;

describe("Fonnte WhatsApp gateway", () => {
  beforeAll(() => {
    previousAuthUrl = process.env.BETTER_AUTH_URL;
    previousFonnteUrl = process.env.FONNTE_TEST_URL;
    previousFonnteToken = process.env.FONNTE_TOKEN;

    server = Bun.serve({
      hostname: "127.0.0.1",
      port: 0,
      async fetch(request) {
        if (mode === "redirect") {
          return Response.redirect("http://127.0.0.1:9/elsewhere", 302);
        }
        const form = await request.formData();
        captured.push({
          auth: request.headers.get("Authorization"),
          target: form.get("target"),
          countryCode: form.get("countryCode"),
          message: form.get("message"),
        });
        if (mode === "http-500") return Response.json({ status: true }, { status: 500 });
        if (mode === "invalid-json") return new Response("not-json", { status: 200 });
        if (mode === "status-false") return Response.json({ status: false, reason: "device disconnected" }, { status: 200 });
        return Response.json({ status: true, detail: "sent" }, { status: 200 });
      },
    });
  });

  afterEach(() => {
    mode = "ok";
    captured.length = 0;
    process.env.BETTER_AUTH_URL = previousAuthUrl;
    process.env.FONNTE_TEST_URL = previousFonnteUrl;
    process.env.FONNTE_TOKEN = previousFonnteToken;
  });

  afterAll(() => {
    server.stop(true);
  });

  test("sends verification and reset messages through loopback stub without + prefix", async () => {
    process.env.BETTER_AUTH_URL = "http://127.0.0.1:3000";
    process.env.FONNTE_TEST_URL = `http://127.0.0.1:${server.port}/send`;

    await sendWhatsAppCode({ phoneNumber: "+6281200000001", code: "654321" }, "verification");
    await sendWhatsAppCode({ phoneNumber: "+6281200000002", code: "123456" }, "reset");

    expect(captured).toHaveLength(2);
    expect(captured[0]).toMatchObject({
      auth: "vektor-e2e",
      target: "6281200000001",
      countryCode: "0",
    });
    expect(String(captured[0].message)).toContain("verifikasi akun: 654321");
    expect(String(captured[1].message)).toContain("atur ulang kata sandi: 123456");
  });

  test("treats HTTP 200 { status: false }, 500, invalid JSON, and redirects as 503 without leaking secrets", async () => {
    process.env.BETTER_AUTH_URL = "http://127.0.0.1:3000";
    process.env.FONNTE_TEST_URL = `http://127.0.0.1:${server.port}/send`;

    for (const failingMode of ["status-false", "http-500", "invalid-json", "redirect"] as const) {
      mode = failingMode;
      let caught: unknown;
      try {
        await sendWhatsAppCode({ phoneNumber: "+6281200000003", code: "998877" }, "verification");
      } catch (error) {
        caught = error;
      }
      expect(caught).toBeInstanceOf(APIError);
      const apiError = caught as APIError;
      expect(apiError.statusCode).toBe(503);
      expect(apiError.message).not.toContain("998877");
      expect(apiError.message).not.toContain("6281200000003");
    }
  });

  test("rejects non-loopback FONNTE_TEST_URL and invalid phone numbers", async () => {
    process.env.BETTER_AUTH_URL = "http://127.0.0.1:3000";
    process.env.FONNTE_TEST_URL = "https://example.test/send";

    await expect(
      sendWhatsAppCode({ phoneNumber: "+6281200000004", code: "111222" }, "verification"),
    ).rejects.toMatchObject({ statusCode: 503 });

    process.env.FONNTE_TEST_URL = `http://127.0.0.1:${server.port}/send`;
    await expect(
      sendWhatsAppCode({ phoneNumber: "081200000004", code: "111222" }, "verification"),
    ).rejects.toMatchObject({ statusCode: 503 });
  });
});
