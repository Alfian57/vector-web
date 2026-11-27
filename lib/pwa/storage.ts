import Dexie, { type EntityTable } from "dexie";
import type { Account, MapPackage, RadarSnapshot, ReportInput, Weather } from "../domain";

export type QueuedReport = {
  id: string;
  ownerId: string;
  report: ReportInput;
  photo: Blob;
  error?: string;
  claimedUntil?: number;
};
export type OfflineMap = Omit<MapPackage, "mapTilerKey"> & { key: "karawang"; file: Blob };
export type PublicSnapshot = { key: "radar"; radar: RadarSnapshot; weather: Weather | null };
type DeviceAccount = { key: "account"; account: Account };
type SentReport = { id: string; ownerId: string; reportId: string; sentAt: string };
type OfflineDb = Dexie & {
  queue: EntityTable<QueuedReport, "id">;
  maps: EntityTable<OfflineMap, "key">;
  accounts: EntityTable<DeviceAccount, "key">;
  snapshots: EntityTable<PublicSnapshot, "key">;
  sent: EntityTable<SentReport, "id">;
};

let storage: OfflineDb | undefined;

export function offlineDb() {
  if (!storage) {
    storage = new Dexie("vektor") as OfflineDb;
    storage
      .version(1)
      .stores({ queue: "id, ownerId", maps: "key", accounts: "key", snapshots: "key", sent: "id, ownerId" });
  }
  return storage;
}
