import Link from "next/link";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { connection } from "next/server";
import { ArrowLeft } from "lucide-react";
import { Brand } from "@/app/_components/brand";
import { getAccountProfile } from "@/lib/server/profile";
import { getAccount } from "@/lib/server/auth";
import { recordPageView } from "@/lib/server/activity-log";
import { unavailable } from "@/lib/server/http";
import { accountUnavailablePath, dashboardForRole, profilePath, signInFor } from "@/lib/routes";
import { ProfileForm } from "./profile-form";
import { profileStyles as styles } from "./profile-classes";
import { tw } from "@/lib/tw";

export async function ProtectedProfile() {
  await connection();
  const account = await getAccount(await headers()).catch((error: unknown) => {
    unavailable(error);
    return undefined;
  });
  if (account === undefined) redirect(accountUnavailablePath);
  if (!account) redirect(signInFor(profilePath));

  const [profile] = await Promise.all([getAccountProfile(account), recordPageView(account, profilePath)]);
  return (
    <main className={tw(styles.page)}>
      <header className={tw(styles.header)}>
        <Brand />
        <Link className={tw(styles.back)} href={dashboardForRole(account.role)}>
          <ArrowLeft size={16} aria-hidden="true" />
          Kembali ke dashboard
        </Link>
      </header>
      <div className={tw(styles.main)}>
        <div className={tw(styles.heading)}>
          <h1 className={tw(styles.headingTitle)}>Profil akun</h1>
          <p className={tw(styles.headingDescription)}>
            Kelola nama dan foto yang digunakan di VEKTOR, serta perbarui kata sandi akun Anda.
          </p>
        </div>
        <ProfileForm initial={profile} />
      </div>
    </main>
  );
}
