import { sendNotification, WebPushError } from "web-push";
import { z } from "zod";
import { mapCenter } from "@/lib/domain";
import { db, transaction } from "./db";
import { pushConfig } from "./push-config";

const weatherResponse = z.object({
  current: z.object({
    time: z.iso.datetime({ local: true }),
    wind_speed_10m: z.number().nonnegative(),
    wind_direction_10m: z.number().min(0).max(360),
    relative_humidity_2m: z.number().min(0).max(100),
  }),
});

export async function refreshWeather() {
  const [fresh] = await db().$queryRaw<{ only_row: boolean }[]>`
    SELECT only_row FROM local_weather WHERE only_row AND fetched_at > now() - INTERVAL '15 minutes'
  `;
  if (fresh) return;
  const [longitude, latitude] = mapCenter;
  const url = new URL("https://api.open-meteo.com/v1/forecast");
  if (process.env.OPEN_METEO_API_KEY) {
    url.hostname = "customer-api.open-meteo.com";
    url.searchParams.set("apikey", process.env.OPEN_METEO_API_KEY);
  }
  url.searchParams.set("latitude", String(latitude));
  url.searchParams.set("longitude", String(longitude));
  url.searchParams.set("current", "wind_speed_10m,wind_direction_10m,relative_humidity_2m");
  url.searchParams.set("timezone", "GMT");
  const response = await fetch(url, { signal: AbortSignal.timeout(8000) });
  if (!response.ok) throw new Error("Weather service unavailable");
  const { current } = weatherResponse.parse(await response.json());
  const observedAt = new Date(current.time.endsWith("Z") ? current.time : `${current.time}Z`);
  await db().$executeRaw`
    INSERT INTO local_weather (observed_at, fetched_at, wind_speed, wind_direction, humidity)
    VALUES (${observedAt.toISOString()}::timestamptz, now(),
      ${current.wind_speed_10m}, ${current.wind_direction_10m}, ${current.relative_humidity_2m})
    ON CONFLICT (only_row) DO UPDATE SET observed_at = EXCLUDED.observed_at, fetched_at = EXCLUDED.fetched_at,
      wind_speed = EXCLUDED.wind_speed, wind_direction = EXCLUDED.wind_direction, humidity = EXCLUDED.humidity
  `;
}

type PushJob = {
  alert_id: string;
  endpoint: string;
  keys: { auth: string; p256dh: string };
  attempts: number;
};

export async function deliverPush(send = sendNotification) {
  const vapidDetails = pushConfig();
  if (!vapidDetails) return;
  for (let index = 0; index < 25; index++) {
    const handled = await transaction(async (client) => {
      const [job] = await client.$queryRaw<PushJob[]>`
        SELECT j.alert_id, j.endpoint, s.keys, j.attempts
        FROM push_jobs j JOIN push_subscriptions s USING (endpoint, owner_id)
        WHERE j.done_at IS NULL AND j.next_attempt_at <= now()
        ORDER BY j.next_attempt_at, j.alert_id, j.endpoint
        LIMIT 1 FOR UPDATE OF j SKIP LOCKED
      `;
      if (!job) return false;

      try {
        await send({ endpoint: job.endpoint, keys: job.keys }, JSON.stringify({ id: job.alert_id }), {
          vapidDetails,
          TTL: 86400,
          timeout: 5000,
        });
        await client.$executeRaw`UPDATE push_jobs SET done_at = now() WHERE alert_id = ${job.alert_id}::uuid AND endpoint = ${job.endpoint}`;
      } catch (error) {
        const status = error instanceof WebPushError ? error.statusCode : 0;
        if (status === 404 || status === 410) {
          await client.$executeRaw`DELETE FROM push_subscriptions WHERE endpoint = ${job.endpoint}`;
        } else {
          const delay = 2 ** job.attempts * 60;
          await client.$executeRaw`
            UPDATE push_jobs SET attempts = attempts + 1, next_attempt_at = now() + ${delay}::double precision * INTERVAL '1 second',
              done_at = CASE WHEN attempts >= 5 THEN now() ELSE NULL END
            WHERE alert_id = ${job.alert_id}::uuid AND endpoint = ${job.endpoint}
          `;
        }
      }
      return true;
    });
    if (!handled) break;
  }
}
