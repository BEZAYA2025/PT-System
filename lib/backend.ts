import "server-only";

const VPS = process.env.PT_BACKEND_URL ?? "http://145.79.11.110:3000";

export type BackendError = { ok: false; status: number; message: string };
export type BackendOk<T> = { ok: true; data: T };
export type BackendResult<T> = BackendOk<T> | BackendError;

export async function backendFetch<T = unknown>(
  path: string,
  init: Omit<RequestInit, "headers"> & {
    token?: string | null;
    headers?: Record<string, string>;
  } = {},
): Promise<BackendResult<T>> {
  const { token, headers, ...rest } = init;
  let res: Response;
  try {
    res = await fetch(`${VPS}${path}`, {
      ...rest,
      cache: "no-store",
      headers: {
        "Content-Type": "application/json",
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
        ...(headers ?? {}),
      },
    });
  } catch (err) {
    return {
      ok: false,
      status: 0,
      message: err instanceof Error ? err.message : "Network error",
    };
  }

  let body: unknown = null;
  try {
    body = await res.json();
  } catch {
    // Non-JSON response — keep body null.
  }

  if (!res.ok) {
    let message = `Backend ${res.status}`;
    if (
      body &&
      typeof body === "object" &&
      "message" in body &&
      typeof (body as Record<string, unknown>).message === "string"
    ) {
      message = (body as { message: string }).message;
    }
    return { ok: false, status: res.status, message };
  }

  return { ok: true, data: body as T };
}
