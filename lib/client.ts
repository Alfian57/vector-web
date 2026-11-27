import type { z } from "zod";

export class ApiError extends Error {
  constructor(
    readonly status: number,
    message: string,
  ) {
    super(message);
  }
}

export async function api(path: string, options?: RequestInit): Promise<unknown> {
  const response = await fetch(`/api/${path}`, { cache: "no-store", ...options });
  if (!response.ok) {
    const body: unknown = await response.json().catch(() => null);
    throw new ApiError(
      response.status,
      body && typeof body === "object" && "message" in body && typeof body.message === "string"
        ? body.message
        : "Terjadi gangguan. Coba lagi.",
    );
  }
  const payload: unknown = await response.json();
  return payload;
}

export async function apiData<T>(path: string, schema: z.ZodType<T>, options?: RequestInit): Promise<T> {
  const payload = await api(path, options);
  const result = schema.safeParse(payload);
  if (!result.success) throw new ApiError(502, "Respons layanan belum dapat dibaca. Coba lagi nanti.");
  return result.data;
}

export function jsonRequest(method: string, value?: unknown): RequestInit {
  return {
    method,
    headers: { "Content-Type": "application/json" },
    body: value === undefined ? undefined : JSON.stringify(value),
  };
}

export function errorMessage(error: unknown) {
  return error instanceof ApiError ? error.message : "Koneksi atau penyimpanan tidak tersedia. Coba lagi.";
}
