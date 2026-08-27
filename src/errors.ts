import type { HttpMethod } from './productive/registry-types.js';

/** One entry from a JSON:API `errors` array, as Productive fills it in. */
export interface ProductiveApiError {
  status?: string;
  code?: string;
  title?: string;
  detail?: string;
  source?: { parameter?: string; pointer?: string };
}

export interface ProductiveHttpErrorInit {
  status: number;
  method: HttpMethod;
  url: string;
  payload?: unknown;
  /** Productive stamps every response with one; quote it in support tickets. */
  requestId?: string;
  retryAfter?: string;
}

/**
 * Error for a non-2xx response from Productive, with the JSON:API error array
 * unpacked into something a tool result can show.
 */
export class ProductiveHttpError extends Error {
  readonly status: number;
  readonly method: HttpMethod;
  readonly url: string;
  readonly payload: unknown;
  readonly errors: ProductiveApiError[];
  readonly requestId?: string;
  readonly retryAfter?: string;

  constructor(init: ProductiveHttpErrorInit) {
    const errors = extractErrors(init.payload);
    const url = redactUrl(init.url);
    super(buildMessage(init.status, init.method, url, errors, init.requestId));
    this.name = 'ProductiveHttpError';
    this.status = init.status;
    this.method = init.method;
    this.url = url;
    this.payload = init.payload;
    this.errors = errors;
    this.requestId = init.requestId;
    this.retryAfter = init.retryAfter;
  }

  /** Productive's own machine-readable code for the first error, if any. */
  get code(): string | undefined {
    return this.errors[0]?.code;
  }
}

function buildMessage(
  status: number,
  method: HttpMethod,
  url: string,
  errors: ProductiveApiError[],
  requestId?: string,
): string {
  const hint = explain(status, errors);
  const detail = errors
    .map(error => {
      const where = error.source?.parameter ?? error.source?.pointer;
      return [error.code, error.detail ?? error.title, where && `at ${where}`]
        .filter(Boolean)
        .join(' — ');
    })
    .filter(Boolean)
    .join('; ');

  return [
    `Productive API ${method} ${url} failed with HTTP ${status}`,
    detail || undefined,
    hint || undefined,
    requestId ? `(request id ${requestId})` : undefined,
  ]
    .filter(Boolean)
    .join(' | ');
}

/**
 * Turn Productive's less obvious refusals into the sentence a caller needs.
 *
 * The 403 is the one worth having: Productive answers *both* a missing
 * `X-Organization-Id` header *and* an organization the token cannot reach with
 * the same `no_organization_id` code and the same "has to be provided" text —
 * verified live, sending a valid token with somebody else's organization id.
 * Taken at face value that reads as a client bug, so it gets said plainly.
 */
function explain(status: number, errors: ProductiveApiError[]): string | undefined {
  const code = errors[0]?.code;

  if (status === 401 || code === 'invalid_auth_token') {
    return 'The API token was rejected. Check PRODUCTIVE_API_TOKEN — Productive tokens are per-user and are revoked when that person is deactivated.';
  }
  if (status === 403 && code === 'no_organization_id') {
    return 'Either the X-Organization-Id header is missing, or the token has no access to that organization — Productive reports both the same way. Check PRODUCTIVE_ORGANIZATION_ID against the id in your Productive URL.';
  }
  if (status === 404) {
    return 'Either the record does not exist, or this resource is not enabled for the organization: features absent from the plan answer 404 rather than 403 (verified for /boards).';
  }
  if (status === 429) {
    return 'Rate limited. Productive sends no rate-limit headers, so back off and retry rather than probing for the limit.';
  }
  if (code === 'unsupported_filter' || code === 'sort_param_unsupported' || code === 'unsupported_include') {
    return 'Call productive_describe_resource for this resource to see the filter, sort and include keys it really accepts.';
  }
  return undefined;
}

function extractErrors(payload: unknown): ProductiveApiError[] {
  if (typeof payload !== 'object' || payload === null) return [];
  const errors = (payload as { errors?: unknown }).errors;
  if (!Array.isArray(errors)) return [];
  return errors.filter(
    (error): error is ProductiveApiError => typeof error === 'object' && error !== null,
  );
}

/**
 * Strip the query string. Productive takes its token in a header, not a query
 * parameter, but filters routinely carry names and email addresses and there is
 * no reason to copy those into an error message or an audit line.
 */
export function redactUrl(value: string): string {
  try {
    const url = new URL(value);
    return `${url.origin}${url.pathname}`;
  } catch {
    return value.split('?')[0] ?? value;
  }
}

export function formatUnknownError(error: unknown): string {
  if (error instanceof Error) return error.message;
  return String(error);
}
