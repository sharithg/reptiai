import Constants, { ExecutionEnvironment } from "expo-constants";
import { Platform } from "react-native";

const LOCAL_DEFAULT_BASE_URL = "http://localhost:3001";
const DEVICE_DEFAULT_BASE_URL = "https://reptiai-backend-production.up.railway.app";

// Prefer build-time config via EXPO_PUBLIC_... (set per EAS profile or .env)
const configuredBaseUrl = process.env.EXPO_PUBLIC_API_BASE_URL?.trim();

// Expo Go / Dev Client (StoreClient) can’t reach localhost on your computer
const isStoreClient =
  Constants.executionEnvironment === ExecutionEnvironment.StoreClient;

// Standalone EAS build (typical “production” binary)
const isStandalone =
  Constants.executionEnvironment === ExecutionEnvironment.Standalone;

const isWeb = Platform.OS === "web";

export const API_BASE_URL = (
  configuredBaseUrl && configuredBaseUrl.length > 0
    ? configuredBaseUrl
    : isStoreClient || isStandalone
      ? DEVICE_DEFAULT_BASE_URL
      : isWeb
        ? LOCAL_DEFAULT_BASE_URL
        : DEVICE_DEFAULT_BASE_URL
).replace(/\/$/, "");

if (__DEV__) {
  console.log('[api] base url', API_BASE_URL, {
    configuredBaseUrl,
    isDevice: Constants.isDevice,
    appOwnership: Constants.appOwnership,
    executionEnvironment: Constants.executionEnvironment,
    platform: Platform.OS,
  });
}

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
  cause?: unknown;

  constructor(message: string, status: number, data: unknown, cause?: unknown) {
    super(message);
    this.status = status;
    this.data = data;
    this.cause = cause;
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

  let response: Response;
  try {
    response = await fetch(`${API_BASE_URL}${path}`, {
      method: options.method ?? (body ? "POST" : "GET"),
      headers,
      body,
      signal: options.signal,
    });
  } catch (error) {
    console.error('[apiRequest] Network error', { path, error, API_BASE_URL });
    if (error instanceof Error) {
      throw new ApiError(error.message, 0, null, error);
    }
    throw new ApiError('Network request failed', 0, null, error);
  }

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

