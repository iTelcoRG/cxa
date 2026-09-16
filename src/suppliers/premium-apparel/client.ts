import "server-only";

import type { SupplierAdapter, SupplierRequest } from "../../types/supplier.ts";

import { PremiumApparelError } from "./errors.ts";
import type {
  PremiumApparelApiErrorCode,
  PremiumApparelApiErrorResponse,
  PremiumApparelItemResponse,
  PremiumApparelLegacyProductsErrorResponse,
  PremiumApparelPriceItem,
  PremiumApparelProductSample,
  PremiumApparelProductsSinceResponse,
  PremiumApparelQueryValue,
  PremiumApparelStockItem,
} from "./types.ts";

const DEFAULT_TIMEOUT_MS = 120_000;
const RETRY_DELAYS_MS = [1_000, 4_000] as const;
const MAX_CONTROLLED_PRODUCT_BYTES = 1_000_000;

interface PremiumApparelConfig {
  apiKey: string;
  apiUrl: URL;
}

interface PremiumApparelClientOptions {
  fetch?: typeof fetch;
  timeoutMs?: number;
}

function readConfig(): PremiumApparelConfig {
  const apiUrl = process.env.PREMIUM_APPAREL_API_URL;
  const apiKey = process.env.PREMIUM_APPAREL_API_KEY;

  if (!apiUrl || !apiKey) {
    throw new PremiumApparelError(
      "Premium Apparel API configuration is incomplete.",
      { code: "configuration_error" },
    );
  }

  try {
    return { apiKey, apiUrl: new URL(apiUrl) };
  } catch (cause) {
    throw new PremiumApparelError(
      "PREMIUM_APPAREL_API_URL must be a valid absolute URL.",
      { cause, code: "configuration_error" },
    );
  }
}

function appendQuery(
  url: URL,
  query: Readonly<Record<string, PremiumApparelQueryValue>>,
): void {
  for (const [name, value] of Object.entries(query)) {
    if (value === undefined) continue;

    for (const entry of Array.isArray(value) ? value : [value]) {
      url.searchParams.append(name, String(entry));
    }
  }
}

function createRequestUrl(apiUrl: URL, path: string): URL {
  const url = new URL(path.replace(/^\/+/, ""), `${apiUrl.href.replace(/\/$/, "")}/`);

  if (url.origin !== apiUrl.origin) {
    throw new PremiumApparelError(
      "Premium Apparel request paths must stay on the configured API origin.",
      { code: "validation_error" },
    );
  }

  return url;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function isApiErrorCode(value: unknown): value is PremiumApparelApiErrorCode {
  return [
    "invalid_token",
    "forbidden",
    "not_found",
    "duplicate_reference",
    "conflict",
    "validation_error",
    "upstream_unavailable",
    "upstream_error",
  ].includes(String(value));
}

function errorFromResponse(status: number, body: unknown): PremiumApparelError {
  if (
    isRecord(body) &&
    isApiErrorCode(body.error) &&
    typeof body.message === "string"
  ) {
    const response = body as unknown as PremiumApparelApiErrorResponse;
    return new PremiumApparelError(response.message, {
      code: response.error,
      details: response.details,
      status,
    });
  }

  if (
    isRecord(body) &&
    body.error === true &&
    typeof body.error_reason === "string"
  ) {
    const response = body as unknown as PremiumApparelLegacyProductsErrorResponse;
    return new PremiumApparelError(response.error_reason, {
      code: status === 401 ? "invalid_token" : "invalid_response",
      status,
    });
  }

  return new PremiumApparelError("Premium Apparel returned an error response.", {
    code: status === 503 ? "upstream_unavailable" : "invalid_response",
    status,
  });
}

async function readJson(response: Response): Promise<unknown> {
  const configured = Number(process.env.PREMIUM_APPAREL_MAX_RESPONSE_BYTES ?? 134_217_728);
  const maximum = Number.isSafeInteger(configured) && configured > 0 ? configured : 134_217_728;
  const declared = Number(response.headers.get("content-length") ?? 0);
  if (declared > maximum) throw new PremiumApparelError("Premium Apparel response exceeded its configured size limit.", { code: "invalid_response", status: response.status });
  if (!response.body) return null;
  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  let text = "";
  let bytes = 0;
  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      bytes += value.byteLength;
      if (bytes > maximum) {
        await reader.cancel();
        throw new PremiumApparelError("Premium Apparel response exceeded its configured size limit.", { code: "invalid_response", status: response.status });
      }
      text += decoder.decode(value, { stream: true });
    }
    text += decoder.decode();
  } finally { reader.releaseLock(); }
  if (!text) return null;

  try {
    return JSON.parse(text) as unknown;
  } catch (cause) {
    throw new PremiumApparelError(
      "Premium Apparel returned invalid JSON.",
      { cause, code: "invalid_response", status: response.status },
    );
  }
}

async function delay(milliseconds: number): Promise<void> {
  await new Promise((resolve) => setTimeout(resolve, milliseconds));
}

export class PremiumApparelClient implements SupplierAdapter {
  readonly id = "premium-apparel";
  readonly type = "api" as const;

  private readonly fetchImplementation: typeof fetch;
  private readonly timeoutMs: number;
  private lastRequestAt = 0;

  constructor(options: PremiumApparelClientOptions = {}) {
    this.fetchImplementation = options.fetch ?? fetch;
    this.timeoutMs = options.timeoutMs ?? Number(process.env.PREMIUM_APPAREL_REQUEST_TIMEOUT_MS ?? DEFAULT_TIMEOUT_MS);
  }

  async get<TResponse>(
    path: string,
    query: Readonly<Record<string, PremiumApparelQueryValue>> = {},
  ): Promise<TResponse> {
    const response = await this.getResponse(path, query);
    return (await readJson(response)) as TResponse;
  }

  async findProductSince(
    style: string,
    since: string,
  ): Promise<PremiumApparelProductSample> {
    const response = await this.getResponse("/v1/products", { since });
    return findProductInIncrementalStream(response, style);
  }

  private async getResponse(
    path: string,
    query: Readonly<Record<string, PremiumApparelQueryValue>>,
  ): Promise<Response> {
    const { apiKey, apiUrl } = readConfig();
    const url = createRequestUrl(apiUrl, path);
    appendQuery(url, query);

    for (let attempt = 0; ; attempt += 1) {
      let response: Response;

      try {
        const spacing = Math.max(0, Number(process.env.PREMIUM_APPAREL_REQUEST_SPACING_MS ?? 150));
        const remaining = spacing - (Date.now() - this.lastRequestAt);
        if (remaining > 0) await delay(remaining);
        this.lastRequestAt = Date.now();
        response = await this.fetchImplementation(url, {
          headers: {
            Accept: "application/json",
            Authorization: `Bearer ${apiKey}`,
          },
          method: "GET",
          signal: AbortSignal.timeout(this.timeoutMs),
        });
      } catch (cause) {
        if (cause instanceof Error && cause.name === "TimeoutError") {
          if (attempt < RETRY_DELAYS_MS.length) { await delay(RETRY_DELAYS_MS[attempt]); continue; }
          throw new PremiumApparelError("Premium Apparel request timed out.", {
            cause,
            code: "timeout",
          });
        }

        if (attempt < RETRY_DELAYS_MS.length) { await delay(RETRY_DELAYS_MS[attempt]); continue; }
        throw new PremiumApparelError("Premium Apparel request failed.", {
          cause,
          code: "network_error",
        });
      }

      if (response.ok) return response;

      const body = await readJson(response);

      if (response.status === 503 && attempt < RETRY_DELAYS_MS.length) {
        await delay(RETRY_DELAYS_MS[attempt]);
        continue;
      }

      throw errorFromResponse(response.status, body);
    }
  }

  getStock(
    query: Readonly<Record<string, PremiumApparelQueryValue>>,
  ): Promise<PremiumApparelItemResponse<PremiumApparelStockItem>> {
    return this.get("/v1/stock", query);
  }

  getPrices(
    query: Readonly<Record<string, PremiumApparelQueryValue>>,
  ): Promise<PremiumApparelItemResponse<PremiumApparelPriceItem>> {
    return this.get("/v1/prices", query);
  }

  getProductsSince(since: string): Promise<PremiumApparelProductsSinceResponse> {
    return this.get("/v1/products", { since });
  }

  getProductsResponse(since: string): Promise<Response> {
    return this.getResponse("/v1/products", { since });
  }

  request(request: SupplierRequest): Promise<unknown> {
    if (request.method && request.method !== "GET") {
      throw new PremiumApparelError(
        "Only read-only GET requests are enabled for Premium Apparel.",
        { code: "validation_error" },
      );
    }

    return this.get(request.path);
  }
}

async function findProductInIncrementalStream(
  response: Response,
  style: string,
): Promise<PremiumApparelProductSample> {
  if (!response.body) {
    throw new PremiumApparelError("Premium Apparel returned an empty response.", {
      code: "invalid_response",
      status: response.status,
    });
  }

  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  let buffer = "";
  let scannedBytes = 0;
  let arrayStart = -1;
  let objectStart = -1;
  let depth = 0;
  let inString = false;
  let escaped = false;
  let scanIndex = 0;

  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      scannedBytes += value.byteLength;
      if (scannedBytes > MAX_CONTROLLED_PRODUCT_BYTES) {
        throw new PremiumApparelError(
          "Controlled product lookup exceeded its response limit.",
          { code: "invalid_response" },
        );
      }

      buffer += decoder.decode(value, { stream: true });

      if (arrayStart < 0) {
        const productsKey = buffer.indexOf('"products"');
        if (productsKey < 0) continue;
        arrayStart = buffer.indexOf("[", productsKey);
        if (arrayStart < 0) continue;
        scanIndex = arrayStart + 1;
      }

      for (; scanIndex < buffer.length; scanIndex += 1) {
        const character = buffer[scanIndex];

        if (inString) {
          if (escaped) escaped = false;
          else if (character === "\\") escaped = true;
          else if (character === '"') inString = false;
          continue;
        }

        if (character === '"') {
          inString = true;
        } else if (character === "{") {
          if (depth === 0) objectStart = scanIndex;
          depth += 1;
        } else if (character === "}") {
          depth -= 1;
          if (depth === 0 && objectStart >= 0) {
            const candidate = JSON.parse(
              buffer.slice(objectStart, scanIndex + 1),
            ) as PremiumApparelProductSample;
            if (candidate.style === style) {
              await reader.cancel();
              return candidate;
            }
            objectStart = -1;
          }
        }
      }
    }
  } finally {
    reader.releaseLock();
  }

  throw new PremiumApparelError(
    `Premium Apparel product style ${style} was not found in the bounded response.`,
    { code: "not_found", status: 404 },
  );
}

export const premiumApparelClient = new PremiumApparelClient();
