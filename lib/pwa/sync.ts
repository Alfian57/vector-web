import { offlineDb } from "./storage";

export const syncTag = "vektor-report-sync";

export async function syncReports() {
  const database = offlineDb();
  const owner = (await database.accounts.get("account"))?.account.id;
  if (!owner) return;
  const queue = await database.queue.where("ownerId").equals(owner).toArray();
  let retry = false;
  for (const item of queue) {
    const claim = Date.now() + 45_000;
    const claimed = await database.transaction("rw", database.queue, database.accounts, async () => {
      const latest = await database.queue.get(item.id);
      const active = await database.accounts.get("account");
      if (active?.account.id !== owner || !latest || latest.error || (latest.claimedUntil ?? 0) > Date.now())
        return false;
      await database.queue.update(item.id, { claimedUntil: claim });
      return true;
    });
    if (!claimed) continue;
    const form = new FormData();
    form.set("report", JSON.stringify(item.report));
    form.set("photo", item.photo, "daun.jpg");
    try {
      const response = await fetch("/api/reports", {
        method: "POST",
        headers: { "x-vektor-account": owner },
        body: form,
        signal: AbortSignal.timeout(20_000),
      });
      if (response.ok) {
        const result: unknown = await response.json();
        if (!result || typeof result !== "object" || !("id" in result) || typeof result.id !== "string") {
          throw new Error("Invalid report acknowledgement");
        }
        const reportId = result.id;
        await database.transaction("rw", database.queue, database.sent, async () => {
          await database.sent.put({ id: item.id, ownerId: owner, reportId, sentAt: new Date().toISOString() });
          await database.queue.delete(item.id);
        });
      } else if (response.status === 401 || response.status === 403) {
        await database.queue.update(item.id, { claimedUntil: undefined });
        break;
      } else if ([409, 413, 422].includes(response.status)) {
        const value: unknown = await response.json().catch(() => null);
        const error =
          value && typeof value === "object" && "message" in value && typeof value.message === "string"
            ? value.message
            : "Periksa kembali data laporan.";
        await database.queue.update(item.id, { error, claimedUntil: undefined });
      } else {
        throw new Error("Retryable report submission");
      }
    } catch {
      await database.queue.update(item.id, { claimedUntil: undefined });
      retry = true;
    }
  }
  if (retry) throw new Error("Laporan menunggu percobaan berikutnya.");
}

type SyncRegistration = ServiceWorkerRegistration & { sync?: { register: (tag: string) => Promise<void> } };

export async function scheduleReports() {
  const registration: SyncRegistration | undefined = await navigator.serviceWorker?.getRegistration();
  await registration?.sync?.register(syncTag).catch(() => {});
}
