import { api, jsonRequest } from "../client";

export async function disconnectDevicePush() {
  const signal = AbortSignal.timeout(2500);
  async function disconnect() {
    const registration = await navigator.serviceWorker?.getRegistration();
    const subscription = await registration?.pushManager?.getSubscription();
    if (!subscription || signal.aborted) return;
    await Promise.allSettled([
      api("push", { ...jsonRequest("DELETE", { endpoint: subscription.endpoint }), signal }),
      subscription.unsubscribe(),
    ]);
  }

  await Promise.race([
    disconnect().catch(() => {}),
    new Promise<void>((resolve) => signal.addEventListener("abort", () => resolve(), { once: true })),
  ]);
}
