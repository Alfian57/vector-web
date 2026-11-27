import { afterAll, beforeEach, describe, expect, test } from "bun:test";
import type { EducationArticleSummary, Page } from "../../lib/domain";
import { db } from "../../lib/server/db";
import { createEmailUserInDb, makeJpeg, resetMutableState, TestSession } from "./helpers/test-kit";

const documentWithText = (text: string) => ({
  type: "doc",
  content: [{ type: "paragraph", content: [{ type: "text", text }] }],
});

describe("P1.8 admin access, education publishing, image privacy, and audit logs", () => {
  beforeEach(async () => { await resetMutableState(); });
  afterAll(async () => { await db().$disconnect(); });

  test("restricts admin APIs and manages accounts while revoking banned sessions", async () => {
    const admin = new TestSession();
    const farmer = new TestSession();
    const adminUser = await createEmailUserInDb({ email: "admin@test.invalid", name: "Admin Uji", role: "admin" });
    const farmerUser = await createEmailUserInDb({ email: "farmer@test.invalid", name: "Petani Uji" });
    expect((await admin.postJson("/api/auth/sign-in/email", { email: adminUser.email, password: adminUser.password })).status).toBe(200);
    expect((await farmer.postJson("/api/auth/sign-in/email", { email: farmerUser.email, password: farmerUser.password })).status).toBe(200);

    expect((await farmer.get("/api/admin/overview")).status).toBe(403);
    expect((await admin.postJson("/api/auth/admin/ban-user", { userId: farmerUser.id })).status).toBe(403);
    const accounts = await admin.get("/api/admin/accounts");
    expect(accounts.status).toBe(200);
    const listed = await accounts.json() as { accounts: Record<string, unknown>[] };
    expect(listed.accounts.some((row) => row.id === farmerUser.id)).toBe(true);
    expect(listed.accounts[0]).not.toHaveProperty("password");

    expect((await admin.patchJson(`/api/admin/accounts/${farmerUser.id}`, { action: "role", role: "officer" })).status).toBe(200);
    expect((await db().user.findUniqueOrThrow({ where: { id: farmerUser.id } })).role).toBe("officer");
    expect((await admin.patchJson(`/api/admin/accounts/${farmerUser.id}`, { action: "ban", reason: "Akun uji perlu ditinjau." })).status).toBe(200);
    expect(await farmer.get("/api/session").then((response) => response.json())).toBeNull();
    expect((await admin.patchJson(`/api/admin/accounts/${farmerUser.id}`, { action: "unban" })).status).toBe(200);
    expect((await admin.patchJson(`/api/admin/accounts/${adminUser.id}`, { action: "role", role: "officer" })).status).toBe(403);
  });

  test("keeps drafts private, publishes rich content, protects draft images, and records audit events", async () => {
    const admin = new TestSession();
    const visitor = new TestSession();
    const adminUser = await createEmailUserInDb({ email: "editor@test.invalid", name: "Editor Uji", role: "admin" });
    const farmerUser = await createEmailUserInDb({ email: "reader@test.invalid", name: "Pembaca Uji" });
    expect((await admin.postJson("/api/auth/sign-in/email", { email: adminUser.email, password: adminUser.password })).status).toBe(200);
    expect((await visitor.postJson("/api/auth/sign-in/email", { email: farmerUser.email, password: farmerUser.password })).status).toBe(200);

    const content = documentWithText("Lakukan pengamatan pada beberapa rumpun dan catat perubahan yang terlihat.");
    const created = await admin.postJson("/api/admin/education", {
      title: "Panduan pengamatan uji", category: "Pengamatan", summary: "Panduan pengamatan untuk menguji akses dan penyuntingan artikel.", content, status: "draft",
    });
    expect(created.status).toBe(201);
    const draft = await created.json() as { id: string; slug: string };
    expect((await visitor.get(`/api/education/${draft.slug}`)).status).toBe(404);

    const form = new FormData();
    form.set("image", new Blob([new Uint8Array(await makeJpeg())], { type: "image/jpeg" }), "pengamatan.jpg");
    const uploaded = await admin.request(`/api/admin/education/${draft.id}/images`, { method: "POST", body: form });
    expect(uploaded.status).toBe(201);
    const media = await uploaded.json() as { id: string; src: string };
    expect((await visitor.get(media.src)).status).toBe(404);
    expect((await admin.get(media.src)).status).toBe(200);

    const publishedContent = {
      type: "doc",
      content: [
        { type: "paragraph", content: [{ type: "text", text: "Periksa beberapa rumpun sebelum menentukan langkah." }] },
        { type: "image", attrs: { src: media.src, alt: "Contoh foto pengamatan" } },
      ],
    };
    const published = await admin.patchJson(`/api/admin/education/${draft.id}`, {
      title: "Panduan pengamatan uji", category: "Pengamatan", summary: "Panduan pengamatan untuk menguji akses dan penyuntingan artikel.", content: publishedContent, status: "published",
    });
    expect(published.status).toBe(200);
    expect((await visitor.get(`/api/education/${draft.slug}`)).status).toBe(200);
    expect((await visitor.get(media.src)).status).toBe(200);
    expect((await visitor.get(`/edukasi/${draft.slug}`)).status).toBe(200);

    const logs = await admin.get("/api/admin/logs?category=education");
    expect(logs.status).toBe(200);
    const entries = (await logs.json()) as Page<{ action: string; outcome: string }>;
    expect(entries.entries.some((entry) => entry.action === "education.article.created")).toBe(true);
    expect(entries.entries.some((entry) => entry.action === "education.article.published")).toBe(true);

    const articles = await admin.get("/api/admin/education");
    expect(articles.status).toBe(200);
    const collection = await articles.json() as Page<EducationArticleSummary>;
    const listed = collection.entries.find((article) => article.id === draft.id);
    expect(listed?.status).toBe("published");
    expect(listed).not.toHaveProperty("content");

    expect((await admin.deleteJson(`/api/admin/education/${draft.id}`)).status).toBe(200);
    expect((await visitor.get(`/api/education/${draft.slug}`)).status).toBe(404);
    expect((await admin.patchJson(`/api/admin/education/${draft.id}`, { action: "restore" })).status).toBe(200);
    expect((await visitor.get(`/api/education/${draft.slug}`)).status).toBe(404);
    const restored = await db().educationArticle.findUniqueOrThrow({ where: { id: draft.id } });
    expect(restored.status).toBe("draft");
    expect(restored.publishedAt).toBeNull();
  });

  test("serves only published articles to visitors and protects dashboard pages", async () => {
    const visitor = new TestSession();
    expect((await visitor.get("/edukasi")).status).toBe(200);
    expect((await visitor.get("/admin")).status).toBe(307);
    expect((await visitor.get("/admin/accounts")).status).toBe(307);
    expect((await visitor.get("/api/admin/accounts")).status).toBe(401);
  });
});
