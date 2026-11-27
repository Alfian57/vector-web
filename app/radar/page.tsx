import type { Metadata } from "next";
import { headers } from "next/headers";
import { getAccount } from "@/lib/server/auth";
import { recordPageView } from "@/lib/server/activity-log";
import { FarmerApp } from "../_components/farmer-app";

export const metadata: Metadata = { title: "Radar Karawang · VEKTOR" };

export default async function RadarPage() {
  const account = await getAccount(await headers()).catch(() => null);
  await recordPageView(account, "/radar");
  return <FarmerApp />;
}
