import { offlineDb } from "../../../lib/pwa/storage";
import { syncReports, syncTag } from "../../../lib/pwa/sync";

declare global {
  interface Window {
    __vektorOffline: {
      offlineDb: typeof offlineDb;
      syncReports: typeof syncReports;
      syncTag: string;
    };
  }
}

window.__vektorOffline = { offlineDb, syncReports, syncTag };
