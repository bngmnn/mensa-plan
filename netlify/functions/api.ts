import "dotenv/config";

import type { Handler } from "@netlify/functions";

import { buildApp } from "../../apps/api/src/app";

const NETLIFY_FUNCTION_PREFIX = "/.netlify/functions/api";

let appPromise: ReturnType<typeof buildApp> | null = null;

async function getApp() {
  if (!appPromise) {
    appPromise = buildApp();
  }

  const app = await appPromise;
  await app.ready();
  return app;
}

export const handler: Handler = async (event) => {
  const app = await getApp();
  const url = buildRequestUrl(event.path, event.queryStringParameters);
  const payload =
    event.body == null
      ? undefined
      : event.isBase64Encoded
        ? Buffer.from(event.body, "base64")
        : event.body;

  let request = applyMethod(app.inject(), event.httpMethod, url).headers(
    event.headers,
  );

  if (payload !== undefined) {
    request = request.payload(payload);
  }

  const response = await request.end();

  return {
    statusCode: response.statusCode,
    headers: normalizeHeaders(response.headers),
    body: response.body,
    isBase64Encoded: false,
  };
};

function buildRequestUrl(
  path: string,
  query: Record<string, string | undefined> | null,
): string {
  const pathname = path.startsWith(NETLIFY_FUNCTION_PREFIX)
    ? path.slice(NETLIFY_FUNCTION_PREFIX.length) || "/"
    : path || "/";
  const search = new URLSearchParams();

  for (const [key, value] of Object.entries(query ?? {})) {
    if (value !== undefined) {
      search.set(key, value);
    }
  }

  const queryString = search.toString();
  return queryString ? `${pathname}?${queryString}` : pathname;
}

function applyMethod(
  request: ReturnType<Awaited<ReturnType<typeof buildApp>>["inject"]>,
  method: string,
  url: string,
) {
  switch (method.toUpperCase()) {
    case "DELETE":
      return request.delete(url);
    case "GET":
      return request.get(url);
    case "HEAD":
      return request.head(url);
    case "OPTIONS":
      return request.options(url);
    case "PATCH":
      return request.patch(url);
    case "POST":
      return request.post(url);
    case "PUT":
      return request.put(url);
    default:
      return request.get(url);
  }
}

function normalizeHeaders(
  headers: Record<string, string | number | string[] | undefined>,
): Record<string, string> {
  const normalized: Record<string, string> = {};

  for (const [key, value] of Object.entries(headers)) {
    if (value === undefined) {
      continue;
    }

    normalized[key] = Array.isArray(value) ? value.join(", ") : String(value);
  }

  return normalized;
}
