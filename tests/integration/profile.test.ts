import { afterAll, beforeEach, describe, expect, test } from "bun:test";
import sharp from "sharp";
import { db } from "../../lib/server/db";
import { createEmailUserInDb, makeJpeg, resetMutableState, TestSession, testPassword } from "./helpers/test-kit";

async function signIn(session: TestSession, email: string, password: string) {
  const response = await session.postJson("/api/auth/sign-in/email", { email, password });
  expect(response.status).toBe(200);
}

describe("P1.9 account profile, private avatars, and password changes", () => {
  beforeEach(async () => {
    await resetMutableState();
  });
  afterAll(async () => {
    await db().$disconnect();
  });

  test("returns only the signed-in profile, validates name changes, and keeps contacts and role read-only", async () => {
    const owner = await createEmailUserInDb({
      email: "profile-owner@test.invalid",
      name: "Nama Awal",
      role: "officer",
    });
    const visitor = new TestSession();
    const session = new TestSession();
    await signIn(session, owner.email, owner.password);

    expect((await visitor.get("/api/profile")).status).toBe(401);
    expect((await visitor.patchJson("/api/profile", { name: "Tidak boleh" })).status).toBe(401);

    const profileResponse = await session.get("/api/profile");
    expect(profileResponse.status).toBe(200);
    expect(await profileResponse.json()).toEqual({
      name: "Nama Awal",
      role: "officer",
      email: owner.email,
      phoneNumber: null,
      image: null,
    });

    expect((await session.patchJson("/api/profile", { name: "Nama Baru" })).status).toBe(200);
    expect(await session.get("/api/profile").then((response) => response.json())).toMatchObject({
      name: "Nama Baru",
      role: "officer",
    });
    expect((await session.patchJson("/api/profile", { name: "Nama Penyerang", role: "admin" })).status).toBe(422);
    expect(
      (await session.patchJson("/api/profile", { name: "Nama Penyerang", email: "other@test.invalid" })).status,
    ).toBe(422);
    expect((await db().user.findUniqueOrThrow({ where: { id: owner.id } })).role).toBe("officer");
    expect((await db().user.findUniqueOrThrow({ where: { id: owner.id } })).email).toBe(owner.email);
  });

  test("normalizes an uploaded avatar, keeps it private to the current account, and removes it cleanly", async () => {
    const owner = await createEmailUserInDb({ email: "avatar-owner@test.invalid", name: "Pemilik Foto" });
    const other = await createEmailUserInDb({ email: "avatar-other@test.invalid", name: "Akun Lain" });
    const ownerSession = new TestSession();
    const otherSession = new TestSession();
    const visitor = new TestSession();
    await signIn(ownerSession, owner.email, owner.password);
    await signIn(otherSession, other.email, other.password);

    expect((await visitor.get("/api/profile/avatar")).status).toBe(401);
    expect((await visitor.request("/api/profile/avatar", { method: "POST", body: new FormData() })).status).toBe(401);

    const form = new FormData();
    form.set("image", new Blob([new Uint8Array(await makeJpeg())], { type: "image/jpeg" }), "avatar.jpg");
    const upload = await ownerSession.request("/api/profile/avatar", { method: "POST", body: form });
    expect(upload.status).toBe(201);
    const result = (await upload.json()) as { image: string };
    expect(result.image).toMatch(/^\/api\/profile\/avatar\?v=\d+$/);
    expect(await ownerSession.get("/api/profile").then((response) => response.json())).toMatchObject({
      image: result.image,
    });

    const avatar = await ownerSession.get(result.image);
    expect(avatar.status).toBe(200);
    expect(avatar.headers.get("content-type")).toBe("image/webp");
    expect(avatar.headers.get("cache-control")).toContain("private, no-store");
    expect(avatar.headers.get("x-content-type-options")).toBe("nosniff");
    const imageMetadata = await sharp(Buffer.from(await avatar.arrayBuffer())).metadata();
    expect(imageMetadata).toMatchObject({ width: 512, height: 512, format: "webp" });
    expect((await otherSession.get("/api/profile/avatar")).status).toBe(404);

    const corrupt = new FormData();
    corrupt.set("image", new Blob(["not an image"], { type: "image/jpeg" }), "corrupt.jpg");
    expect((await ownerSession.request("/api/profile/avatar", { method: "POST", body: corrupt })).status).toBe(422);

    const oversized = new FormData();
    oversized.set("image", new Blob([new Uint8Array(5_000_001)], { type: "image/jpeg" }), "large.jpg");
    expect((await ownerSession.request("/api/profile/avatar", { method: "POST", body: oversized })).status).toBe(413);

    expect((await ownerSession.deleteJson("/api/profile/avatar")).status).toBe(200);
    expect(await ownerSession.get("/api/profile").then((response) => response.json())).toMatchObject({ image: null });
    expect((await ownerSession.get("/api/profile/avatar")).status).toBe(404);
  });

  test("requires the current password, preserves the current session, and revokes other sessions", async () => {
    const owner = await createEmailUserInDb({ email: "password-owner@test.invalid", name: "Pemilik Akun" });
    const currentSession = new TestSession();
    const otherSession = new TestSession();
    await signIn(currentSession, owner.email, owner.password);
    await signIn(otherSession, owner.email, owner.password);

    const wrongPassword = await currentSession.postJson("/api/auth/change-password", {
      currentPassword: "kata-sandi-salah",
      newPassword: "password-baru-vektor",
      revokeOtherSessions: true,
    });
    expect(wrongPassword.status).not.toBe(200);
    expect(await currentSession.get("/api/session").then((response) => response.json())).not.toBeNull();

    const updated = await currentSession.postJson("/api/auth/change-password", {
      currentPassword: testPassword,
      newPassword: "password-baru-vektor",
      revokeOtherSessions: true,
    });
    expect(updated.status).toBe(200);
    expect(await currentSession.get("/api/session").then((response) => response.json())).not.toBeNull();
    expect(await otherSession.get("/api/session").then((response) => response.json())).toBeNull();

    const newLogin = new TestSession();
    expect(
      (await newLogin.postJson("/api/auth/sign-in/email", { email: owner.email, password: "password-baru-vektor" }))
        .status,
    ).toBe(200);
    const logs = await db().activityLog.findMany({
      where: { actorId: owner.id },
      select: { action: true, summary: true },
    });
    expect(logs.some(({ action }) => action === "account.profile.updated")).toBe(false);
    expect(logs.some(({ action }) => action === "auth.change-password.success")).toBe(true);
    expect(
      logs.every(({ summary }) => !summary.includes(owner.email) && !summary.includes("password-baru-vektor")),
    ).toBe(true);
  });
});
