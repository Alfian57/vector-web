import { afterAll, beforeEach, describe, expect, test } from "bun:test";
import { db } from "../../lib/server/db";
import {
  clearRateLimits,
  createEmailUserInDb,
  getCapturedOtp,
  nextTestPhone,
  resetMutableState,
  setFonnteMode,
  testPassword,
  TestSession,
} from "./helpers/test-kit";

describe("P0.4 WhatsApp authentication, linking, recovery, and Fonnte failures", () => {
  beforeEach(async () => {
    await resetMutableState();
  });

  afterAll(async () => {
    await db().$disconnect();
  });

  test("rejects invalid phone formats and enforces OTP correctness, expiry, and single-use", async () => {
    const client = new TestSession();
    const phone = nextTestPhone();

    // Unnormalized 08... or invalid phone rejected at server boundary
    expect((await client.postJson("/api/auth/phone-number/send-otp", { phoneNumber: "081234567890" })).status).toBe(
      400,
    );
    expect((await client.postJson("/api/auth/phone-number/send-otp", { phoneNumber: "invalid" })).status).toBe(400);

    // Send valid OTP
    expect((await client.postJson("/api/auth/phone-number/send-otp", { phoneNumber: phone })).status).toBe(200);
    const otp = await getCapturedOtp(phone, "verifikasi akun");
    const wrongOtp = otp === "000000" ? "111111" : "000000";

    // Wrong OTP rejected
    const wrongAttempt = await client.postJson("/api/auth/whatsapp/register", {
      phoneNumber: phone,
      code: wrongOtp,
      name: "Petani OTP Salah",
      password: testPassword,
    });
    expect(wrongAttempt.status).toBe(400);

    // Correct OTP succeeds
    const okAttempt = await client.postJson("/api/auth/whatsapp/register", {
      phoneNumber: phone,
      code: otp,
      name: "Petani OTP Benar",
      password: testPassword,
    });
    expect(okAttempt.status).toBe(200);

    // Reused OTP rejected (even for a fresh unregistered number check or same number)
    const reusedAttempt = await client.postJson("/api/auth/whatsapp/register", {
      phoneNumber: phone,
      code: otp,
      name: "Petani Ulang",
      password: testPassword,
    });
    expect(reusedAttempt.status).toBe(400);

    // Expired OTP rejected (backdate verification.expiresAt in DB without waiting 5 minutes)
    const expiredPhone = nextTestPhone();
    await clearRateLimits();
    expect((await client.postJson("/api/auth/phone-number/send-otp", { phoneNumber: expiredPhone })).status).toBe(200);
    const expiredOtp = await getCapturedOtp(expiredPhone, "verifikasi akun");
    const expiredUpdated = await db().verification.updateMany({
      where: { identifier: `phone-number-otp-${expiredPhone}` },
      data: { expiresAt: new Date(Date.now() - 10_000) },
    });
    expect(expiredUpdated.count).toBe(1);
    const expiredAttempt = await client.postJson("/api/auth/whatsapp/register", {
      phoneNumber: expiredPhone,
      code: expiredOtp,
      name: "Petani Kedaluwarsa",
      password: testPassword,
    });
    expect(expiredAttempt.status).toBe(400);
  });

  test("rejects OTP used for a different purpose (verification vs password reset)", async () => {
    const client = new TestSession();
    const phone = nextTestPhone();

    // Register verified account first
    expect((await client.postJson("/api/auth/phone-number/send-otp", { phoneNumber: phone })).status).toBe(200);
    const regOtp = await getCapturedOtp(phone, "verifikasi akun");
    expect(
      (
        await client.postJson("/api/auth/whatsapp/register", {
          phoneNumber: phone,
          code: regOtp,
          name: "Petani Tujuan OTP",
          password: testPassword,
        })
      ).status,
    ).toBe(200);

    await clearRateLimits();

    // Request verification OTP (send-otp), then try using it on reset-password
    expect((await client.postJson("/api/auth/phone-number/send-otp", { phoneNumber: phone })).status).toBe(200);
    const verifyOnlyOtp = await getCapturedOtp(phone, "verifikasi akun");
    const resetWithVerifyOtp = await client.postJson("/api/auth/phone-number/reset-password", {
      phoneNumber: phone,
      otp: verifyOnlyOtp,
      newPassword: "new-strong-password-2026",
    });
    expect(resetWithVerifyOtp.status).toBe(400);

    await clearRateLimits();

    // Request password reset OTP, then try using it on whatsapp/link
    const emailClient = new TestSession();
    const emailUser = await createEmailUserInDb({
      email: "tujuan-otp@example.test",
      name: "Email Tujuan",
    });
    expect(
      (await emailClient.postJson("/api/auth/sign-in/email", { email: emailUser.email, password: testPassword }))
        .status,
    ).toBe(200);

    expect(
      (await client.postJson("/api/auth/phone-number/request-password-reset", { phoneNumber: phone })).status,
    ).toBe(200);
    const resetOnlyOtp = await getCapturedOtp(phone, "atur ulang kata sandi");

    const unusedPhone = nextTestPhone();
    await clearRateLimits();
    expect(
      (await client.postJson("/api/auth/phone-number/request-password-reset", { phoneNumber: unusedPhone })).status,
    ).toBe(200);
    // Use reset OTP on link endpoint
    const linkWithResetOtp = await emailClient.postJson("/api/auth/whatsapp/link", {
      phoneNumber: phone,
      code: resetOnlyOtp,
      password: testPassword,
    });
    expect(linkWithResetOtp.status).toBe(400);
  });

  test("verified email accounts (farmer and officer) can link WhatsApp without changing identity/role, and password reset revokes all old sessions", async () => {
    const farmerEmail = await createEmailUserInDb({
      email: "petani-lama@example.test",
      name: "Petani Email",
      role: "farmer",
    });
    const officerEmail = await createEmailUserInDb({
      email: "ppl-lama@example.test",
      name: "PPL Email",
      role: "officer",
    });
    const unverifiedEmail = await createEmailUserInDb({
      email: "belum-verif@example.test",
      name: "Belum Verif",
      emailVerified: false,
    });

    // Unverified email cannot sign in
    const unverifiedClient = new TestSession();
    expect(
      (
        await unverifiedClient.postJson("/api/auth/sign-in/email", {
          email: unverifiedEmail.email,
          password: testPassword,
        })
      ).status,
    ).toBe(403);

    // Officer links WhatsApp and preserves officer role and original ID
    const officerClient = new TestSession();
    expect(
      (await officerClient.postJson("/api/auth/sign-in/email", { email: officerEmail.email, password: testPassword }))
        .status,
    ).toBe(200);
    const officerPhone = nextTestPhone();
    expect(
      (await officerClient.postJson("/api/auth/phone-number/send-otp", { phoneNumber: officerPhone })).status,
    ).toBe(200);
    const officerOtp = await getCapturedOtp(officerPhone, "verifikasi akun");
    expect(
      (
        await officerClient.postJson("/api/auth/whatsapp/link", {
          phoneNumber: officerPhone,
          code: officerOtp,
          password: testPassword,
        })
      ).status,
    ).toBe(200);
    expect(await (await officerClient.get("/api/session")).json()).toMatchObject({
      id: officerEmail.id,
      role: "officer",
      whatsappLinked: true,
    });

    // Farmer opens two active sessions, links WhatsApp, and blocks update-user phoneNumber bypass
    await clearRateLimits();
    const session1 = new TestSession();
    const session2 = new TestSession();
    expect(
      (await session1.postJson("/api/auth/sign-in/email", { email: farmerEmail.email, password: testPassword })).status,
    ).toBe(200);
    expect(
      (await session2.postJson("/api/auth/sign-in/email", { email: farmerEmail.email, password: testPassword })).status,
    ).toBe(200);

    expect((await session1.postJson("/api/auth/update-user", { phoneNumber: nextTestPhone() })).status).toBe(400);

    const farmerPhone = nextTestPhone();
    await clearRateLimits();
    expect((await session1.postJson("/api/auth/phone-number/send-otp", { phoneNumber: farmerPhone })).status).toBe(200);
    const farmerOtp = await getCapturedOtp(farmerPhone, "verifikasi akun");

    // Wrong current password rejected
    expect(
      (
        await session1.postJson("/api/auth/whatsapp/link", {
          phoneNumber: farmerPhone,
          code: farmerOtp,
          password: "wrong-password",
        })
      ).status,
    ).toBe(400);

    // Valid link preserves ID and farmer role
    expect(
      (
        await session1.postJson("/api/auth/whatsapp/link", {
          phoneNumber: farmerPhone,
          code: farmerOtp,
          password: testPassword,
        })
      ).status,
    ).toBe(200);
    expect(await (await session1.get("/api/session")).json()).toMatchObject({
      id: farmerEmail.id,
      role: "farmer",
      whatsappLinked: true,
    });

    // Reset password via WhatsApp revokes BOTH session1 and session2
    await clearRateLimits();
    expect(
      (await session1.postJson("/api/auth/phone-number/request-password-reset", { phoneNumber: farmerPhone })).status,
    ).toBe(200);
    const resetOtp = await getCapturedOtp(farmerPhone, "atur ulang kata sandi");
    const newPassword = "updated-password-2026";
    expect(
      (
        await session1.postJson("/api/auth/phone-number/reset-password", {
          phoneNumber: farmerPhone,
          otp: resetOtp,
          newPassword,
        })
      ).status,
    ).toBe(200);

    expect(await (await session1.get("/api/session")).json()).toBeNull();
    expect(await (await session2.get("/api/session")).json()).toBeNull();
    expect((await session2.get("/api/radar")).status).toBe(401);

    // Old password fails; new password signs in with original account ID
    expect(
      (await session1.postJson("/api/auth/sign-in/phone-number", { phoneNumber: farmerPhone, password: testPassword }))
        .status,
    ).toBe(401);
    expect(
      (await session1.postJson("/api/auth/sign-in/phone-number", { phoneNumber: farmerPhone, password: newPassword }))
        .status,
    ).toBe(200);
    expect(await (await session1.get("/api/session")).json()).toMatchObject({ id: farmerEmail.id, role: "farmer" });
  });

  test("handles Fonnte delivery failures including HTTP 200 { status: false } cleanly", async () => {
    const client = new TestSession();

    for (const mode of ["status-false", "http-500", "invalid-json", "network-drop"] as const) {
      await clearRateLimits();
      await setFonnteMode(mode);
      const phone = nextTestPhone();
      const res = await client.postJson("/api/auth/phone-number/send-otp", { phoneNumber: phone });
      expect(res.status).toBe(503);
    }

    await setFonnteMode("ok");
  });
});
