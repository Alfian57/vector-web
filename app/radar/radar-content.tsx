import { headers } from "next/headers";
import { getAccount } from "@/lib/server/auth";
import { recordPageView } from "@/lib/server/activity-log";
import { FarmerApp } from "../_components/farmer-app";

export async function RadarContent() {
  const account = await getAccount(await headers()).catch(() => null);
  await recordPageView(account, "/radar");
  return <FarmerApp />;
}
