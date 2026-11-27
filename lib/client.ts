export class ApiError extends Error {
  constructor(readonly status: number, message: string) {
    super(message);
  }
}

export async function api<T>(path: string, options?: RequestInit) {
  const response = await fetch(`/api/${path}`, { cache: "no-store", ...options });
  if (!response.ok) {
    const body: unknown = await response.json().catch(() => null);
    throw new ApiError(response.status,
      body && typeof body === "object" && "message" in body && typeof body.message === "string"
        ? body.message : "Terjadi gangguan. Coba lagi.");
  }
  return response.json() as Promise<T>;
}

export function jsonRequest(method: string, value?: unknown): RequestInit {
  return { method, headers: { "Content-Type": "application/json" }, body: value === undefined ? undefined : JSON.stringify(value) };
}

export function errorMessage(error: unknown) {
  return error instanceof ApiError ? error.message : "Koneksi atau penyimpanan tidak tersedia. Coba lagi.";
}
