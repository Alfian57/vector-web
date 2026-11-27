import type { Metadata } from "next";
import { Suspense } from "react";
import { ProtectedProfile } from "./protected-profile";
import { profileStyles } from "./profile-classes";
import { tw } from "@/lib/tw";

export const metadata: Metadata = { title: "Profil akun · VEKTOR" };

export default function ProfilePage() {
  return (
    <Suspense
      fallback={
        <main className={tw(profileStyles.page)}>
          <p role="status">Memeriksa sesi akun…</p>
        </main>
      }
    >
      <ProtectedProfile />
    </Suspense>
  );
}
