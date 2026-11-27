import { ZodError } from "zod";
import { dependencyFailure } from "./dependencies";

export class RequestError extends Error {
  constructor(
    readonly status: number,
    message: string,
  ) {
    super(message);
  }
}

export function json(value: unknown, status = 200) {
  return Response.json(value, { status, headers: { "Cache-Control": "private, no-store" } });
}

export function unavailable(error?: unknown) {
  console.error("VEKTOR request failed", dependencyFailure(error) ?? "service_unavailable");
  return json({ message: "Layanan sedang tidak tersedia. Coba lagi nanti." }, 503);
}

export async function handle(run: () => Promise<Response>) {
  try {
    return await run();
  } catch (error) {
    if (error instanceof RequestError) return json({ message: error.message }, error.status);
    if (error instanceof ZodError || error instanceof SyntaxError) {
      return json({ message: "Data tidak valid. Periksa kembali isian Anda." }, 422);
    }
    return unavailable(error);
  }
}

export function checkOrigin(request: Request) {
  const origin = request.headers.get("origin");
  const expected = new URL(process.env.BETTER_AUTH_URL ?? request.url).origin;
  if (origin !== expected) throw new RequestError(403, "Asal permintaan tidak diizinkan.");
}
