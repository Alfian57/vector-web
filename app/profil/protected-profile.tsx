import Link from "next/link";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { connection } from "next/server";
import { ArrowLeft } from "lucide-react";
import { ProfileWorkspace } from "./profile-workspace";
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
    <ProfileWorkspace account={account}>
      <header className="dashboard-profile-heading">
        <div>
          <h1 className={tw(styles.headingTitle)}>Profil akun</h1>
          <p className={tw(styles.headingDescription)}>Identitas, kontak, dan keamanan akun Anda.</p>
        </div>
        <Link className={tw(styles.back)} href={dashboardForRole(account.role)}>
          <ArrowLeft size={16} aria-hidden="true" />
          Kembali ke dashboard
        </Link>
      </header>
      <ProfileForm initial={profile} />
    </ProfileWorkspace>
  );
}
