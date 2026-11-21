import { ConfigError, readEnvInteger } from '../config-env.js';
import { ProductiveHttpError, redactUrl, registerSecret, requestIdFrom } from '../errors.js';
import type { HttpMethod } from './registry-types.js';

export const DEFAULT_BASE_URL = 'https://api.productive.io/api/v2';

/**
 * JSON:API media type. Productive accepts it on requests and answers with it;
 * plain `application/json` is not the documented content type and is not used
 * here.
 */
const JSON_API = 'application/vnd.api+json';
/** Error responses are read up to this many bytes. */
const MAX_ERROR_BODY_BYTES = 64 * 1024;
const MAX_TIMEOUT_MS = 10 * 60 * 1000;
/** Time limit per request when neither the options nor (for the MCP server) PRODUCTIVE_TIMEOUT_MS give one. */
const DEFAULT_TIMEOUT_MS = 30_000;

/** Productive caps a page at 200 records and silently clamps anything larger. */
export const MAX_PAGE_SIZE = 200;

export type QueryScalar = string | number | boolean;

/**
 * A filter value: a bare value (implicit equality), several values (Productive
 * comma-joins them), or a map of operator to value — `{ gt: '2026-01-01' }`.
 * Nested groups (`$op`, numeric keys) recurse through the same shape.
 */
export type FilterValue =
  | QueryScalar
  | QueryScalar[]
  | { [operatorOrField: string]: FilterValue };

export interface ProductiveClientOptions {
  apiToken?: string;
  organizationId?: string;
  baseUrl?: string;
  fetchImpl?: typeof fetch;
  timeoutMs?: number;
  /**
   * Read missing values from the PRODUCTIVE_* environment and register the
   * token with the process-wide error redaction. Default true (the MCP
   * server). The embeddable gateway passes false: its instances use only what
   * the host gives them and redact with their own redactor.
   */
  fromEnvironment?: boolean;
}

export interface ProductiveRequestOptions {
  method?: HttpMethod;
  /** Path relative to the API base, e.g. `/tasks` or `/tasks/42/reposition`. */
  path: string;
  filters?: Record<string, FilterValue>;
  /** Sort keys; a leading `-` means descending. */
  sort?: string[];
  /** Report aggregation key. */
  group?: string;
  include?: string[];
  page?: { number?: number; size?: number };
  /** Extra query parameters that are not filter/sort/include/page. */
  query?: Record<string, QueryScalar | undefined>;
  body?: unknown;
}

export interface ProductiveResponse<T = unknown> {
  data?: T;
  included?: unknown[];
  meta?: {
    total_count?: number;
    total_pages?: number;
    current_page?: number;
    page_size?: number;
    max_page_size?: number;
  };
  links?: Record<string, string>;
  errors?: unknown[];
}

/**
 * Productive.io API v2 client.
 *
 * Authentication is two headers, `X-Auth-Token` and `X-Organization-Id`. Both
 * come from the server environment and never from a tool argument: the
 * organization id is the tenant boundary, so letting a caller name one would
 * make every scoping guarantee in this server decorative.
 */
export class ProductiveClient {
  private readonly apiToken?: string;
  private readonly organizationId?: string;
  private readonly baseUrl: string;
  private readonly fetchImpl: typeof fetch;
  private readonly timeoutMs: number;


  private readonly fromEnvironment: boolean;

  constructor(options: ProductiveClientOptions = {}) {
    const env = options.fromEnvironment !== false;
    this.fromEnvironment = env;
    this.apiToken = options.apiToken ?? (env ? process.env.PRODUCTIVE_API_TOKEN : undefined);
    if (env) registerSecret(this.apiToken);
    this.organizationId = options.organizationId ?? (env ? process.env.PRODUCTIVE_ORGANIZATION_ID : undefined);
    this.baseUrl = trimTrailingSlash(
      options.baseUrl ?? (env ? process.env.PRODUCTIVE_BASE_URL : undefined) ?? DEFAULT_BASE_URL,
    );
    assertSafeBaseUrl(this.baseUrl);
    this.fetchImpl = options.fetchImpl ?? fetch;
    this.timeoutMs =
      options.timeoutMs ??
      (env ? readEnvInteger('PRODUCTIVE_TIMEOUT_MS', 30_000, { max: MAX_TIMEOUT_MS }) : DEFAULT_TIMEOUT_MS);
    if (!Number.isSafeInteger(this.timeoutMs) || this.timeoutMs < 1) {
      throw new ConfigError('timeoutMs must be a positive integer.');
    }
  }

  /** The organization this server is pinned to. */
  get organization(): string | undefined {
    return this.organizationId;
  }

  /**
   * A clone of this client that authenticates with somebody else's token.
   *
   * The organization pin, base URL, timeout and fetch implementation are
   * carried over unchanged — only the credential differs. That is what makes
   * per-user auth safe here: a caller supplies who they are, never which tenant
   * to act in, and the same token often reaches several organizations.
   */
  withToken(apiToken: string): ProductiveClient {
    return new ProductiveClient({
      apiToken,
      organizationId: this.organizationId,
      baseUrl: this.baseUrl,
      fetchImpl: this.fetchImpl,
      timeoutMs: this.timeoutMs,
      fromEnvironment: this.fromEnvironment,
    });
  }

  async request<T = unknown>(options: ProductiveRequestOptions): Promise<ProductiveResponse<T>> {
    if (!this.apiToken) {
      throw new Error(
        'Missing PRODUCTIVE_API_TOKEN. Create a token in Productive under Settings → API integrations (it inherits the permissions of the person who created it).',
      );
    }
    if (!this.organizationId) {
      throw new Error(
        'Missing PRODUCTIVE_ORGANIZATION_ID. It is the numeric id in your Productive URL, and Productive rejects every request without it.',
      );
    }

    const method = options.method ?? 'GET';
    const url = this.buildUrl(options);

    const response = await this.fetchImpl(url, {
      method,
      headers: {
        'X-Auth-Token': this.apiToken,
        'X-Organization-Id': this.organizationId,
        'Content-Type': JSON_API,
        Accept: JSON_API,
      },
      body: options.body === undefined ? undefined : JSON.stringify(options.body),
      // Never follow redirects: fetch would re-send the custom X-Auth-Token
      // header to wherever the Location points, including other origins.
      redirect: 'manual',
      signal: AbortSignal.timeout(this.timeoutMs),
    });

    if (response.type === 'opaqueredirect' || (response.status >= 300 && response.status < 400)) {
      void response.body?.cancel().catch(() => undefined);
      const redirect = new Error(
        `Productive API responded with a redirect (HTTP ${response.status}) for ${method} ${redactUrl(url)}; ` +
          'redirects are not followed. Check PRODUCTIVE_BASE_URL.',
      );
      redirect.name = 'ProductiveRedirectError';
      Object.defineProperty(redirect, 'status', { value: response.status, enumerable: false });
      throw redirect;
    }

    if (!response.ok) {
      const payload = await readErrorBody(response);
      throw new ProductiveHttpError({
        status: response.status,
        method,
        url,
        payload,
        requestId: response.headers.get('x-request-id') ?? undefined,
        failureRequestId: requestIdFrom(response.headers),
        retryAfter: response.headers.get('retry-after') ?? undefined,
      });
    }

    const payload = await readBody(response);

    // 204 on a successful action or delete; normalise it to an empty envelope
    // so callers do not have to special-case "no content" against "no data".
    return (payload ?? {}) as ProductiveResponse<T>;
  }

  buildUrl(options: ProductiveRequestOptions): string {
    const url = new URL(`${this.baseUrl}${normalizePath(options.path)}`);

    for (const [field, value] of Object.entries(options.filters ?? {})) {
      appendFilter(url.searchParams, `filter[${field}]`, value);
    }
    if (options.sort?.length) url.searchParams.set('sort', options.sort.join(','));
    if (options.group) url.searchParams.set('group', options.group);
    if (options.include?.length) url.searchParams.set('include', options.include.join(','));
    if (options.page?.number !== undefined) {
      url.searchParams.set('page[number]', String(options.page.number));
    }
    if (options.page?.size !== undefined) {
      url.searchParams.set('page[size]', String(Math.min(options.page.size, MAX_PAGE_SIZE)));
    }
    for (const [key, value] of Object.entries(options.query ?? {})) {
      if (value !== undefined) url.searchParams.set(key, String(value));
    }

    return url.toString();
  }
}

/**
 * Render one filter entry in the bracket form Productive expects.
 *
 * Arrays are comma-joined rather than repeated, and nested objects recurse into
 * deeper brackets — that covers both operators (`filter[due_date][gt]`) and the
 * advanced logical groups (`filter[$op]=and&filter[0][id][eq]=1`), which are the
 * same syntax one level down. Verified live against a real organization.
 */
function appendFilter(params: URLSearchParams, prefix: string, value: FilterValue): void {
  if (Array.isArray(value)) {
    params.set(prefix, value.map(String).join(','));
    return;
  }
  if (value !== null && typeof value === 'object') {
    for (const [key, nested] of Object.entries(value)) {
      appendFilter(params, `${prefix}[${key}]`, nested);
    }
    return;
  }
  params.set(prefix, String(value));
}

/** Read at most `limit` bytes of the body; cancels the rest and reports whether it was longer. */
async function readUpTo(response: Response, limit: number): Promise<{ bytes: Uint8Array; exceeded: boolean }> {
  if (!response.body) {
    return { bytes: new Uint8Array(0), exceeded: false };
  }
  const reader = response.body.getReader();
  const chunks: Uint8Array[] = [];
  let total = 0;
  let exceeded = false;
  for (;;) {
    const { done, value } = await reader.read();
    if (done) {
      break;
    }
    if (total + value.byteLength > limit) {
      chunks.push(value.subarray(0, limit - total));
      total = limit;
      exceeded = true;
      await reader.cancel().catch(() => undefined);
      break;
    }
    chunks.push(value);
    total += value.byteLength;
  }
  const bytes = new Uint8Array(total);
  let offset = 0;
  for (const chunk of chunks) {
    bytes.set(chunk, offset);
    offset += chunk.byteLength;
  }
  return { bytes, exceeded };
}

/** Error bodies are read up to a small limit; JSON is parsed only when complete. */
async function readErrorBody(response: Response): Promise<unknown> {
  const { bytes, exceeded } = await readUpTo(response, MAX_ERROR_BODY_BYTES);
  const text = new TextDecoder().decode(bytes);
  if (!text) return null;
  if (exceeded) return text;
  try {
    return JSON.parse(text) as unknown;
  } catch {
    return text;
  }
}

async function readBody(response: Response): Promise<unknown> {
  if (response.status === 204) return null;
  const text = await response.text();
  if (!text) return null;
  try {
    return JSON.parse(text) as unknown;
  } catch {
    return text;
  }
}

function normalizePath(path: string): string {
  return path.startsWith('/') ? path : `/${path}`;
}

function trimTrailingSlash(value: string): string {
  return value.replace(/\/+$/, '');
}

function assertSafeBaseUrl(baseUrl: string): void {
  let parsed: URL;
  try {
    parsed = new URL(baseUrl);
  } catch {
    throw new Error(`PRODUCTIVE_BASE_URL is not a valid URL: ${baseUrl}`);
  }
  if (parsed.protocol === 'https:') return;
  const local = ['localhost', '127.0.0.1', '::1'].includes(parsed.hostname);
  if (parsed.protocol === 'http:' && local) return;
  throw new Error(
    `Refusing to send a Productive API token over ${parsed.protocol}//. Use https:// (loopback http:// is allowed for local mocks).`,
  );
}
