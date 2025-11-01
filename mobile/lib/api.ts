const DEFAULT_API_BASE_URL = "http://localhost:3001";

export const API_BASE_URL = (process.env.EXPO_PUBLIC_API_BASE_URL ?? DEFAULT_API_BASE_URL)
  .trim()
  .replace(/\/$/, "");

export type ApiRequestOptions = {
  method?: string;
  body?: unknown;
  headers?: Record<string, string> | HeadersInit;
  token?: string | null;
  signal?: AbortSignal;
};

export class ApiError extends Error {
  status: number;
  data: unknown;

  constructor(message: string, status: number, data: unknown) {
    super(message);
    this.status = status;
    this.data = data;
  }
}

export async function apiRequest<T = unknown>(
  path: string,
  options: ApiRequestOptions = {}
): Promise<T> {
  const headers: Record<string, string> = { Accept: "application/json" };

  if (options.headers instanceof Headers) {
    options.headers.forEach((value, key) => {
      headers[key] = value;
    });
  } else if (Array.isArray(options.headers)) {
    for (const [key, value] of options.headers) {
      headers[key] = value as string;
    }
  } else if (options.headers) {
    Object.assign(headers, options.headers);
  }

  let body: BodyInit | undefined;

  if (options.body !== undefined) {
    headers["Content-Type"] = headers["Content-Type"] ?? "application/json";
    body = headers["Content-Type"].includes("application/json")
      ? JSON.stringify(options.body)
      : (options.body as BodyInit);
  }

  if (options.token) {
    headers.Authorization = `Bearer ${options.token}`;
  }

  const response = await fetch(`${API_BASE_URL}${path}`, {
    method: options.method ?? (body ? "POST" : "GET"),
    headers,
    body,
    signal: options.signal,
  });

  const contentType = response.headers.get("content-type") ?? "";
  const isJson = contentType.includes("application/json");

  let payload: unknown = null;

  if (isJson) {
    try {
      payload = await response.json();
    } catch (error) {
      // Ignore parse errors for empty responses
      payload = null;
    }
  }

  if (!response.ok) {
    const message =
      (payload && typeof payload === "object" && "error" in payload
        ? String((payload as { error?: unknown }).error ?? "Request failed")
        : undefined) ?? response.statusText ?? "Request failed";

    throw new ApiError(message, response.status, payload);
  }

  return payload as T;
}

