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
  /** The vendor's request id for failure metadata (see requestIdFrom); kept only in the form such ids have. */
  failureRequestId?: string;
  retryAfter?: string;
}

/** Maximum length of any single piece of text taken from a response body. */
export const MAX_ERROR_TEXT = 500;
const MAX_ERRORS_SHOWN = 10;
/** Configured secrets shorter than this are not redacted by value (too likely to hit normal text). */
const MIN_SECRET_LENGTH = 8;

const registeredSecrets = new Set<string>();

/** Redact this exact value (and its URL-encoded form) wherever it appears in error text. */
export function registerSecret(value: string | undefined): void {
  if (!value || value.length < MIN_SECRET_LENGTH) return;
  registeredSecrets.add(value);
  const encoded = encodeURIComponent(value);
  if (encoded !== value) registeredSecrets.add(encoded);
}

/** Replace every registered token value in the text. */
export function redactSecrets(value: string): string {
  let result = value;
  for (const secret of registeredSecrets) {
    result = result.split(secret).join('[REDACTED]');
  }
  return result;
}

/** Truncate after redaction, so a secret cut in half is never left behind. */
export function truncate(value: string, max: number = MAX_ERROR_TEXT): string {
  return value.length > max ? `${value.slice(0, max)}… [truncated, ${value.length} chars]` : value;
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
  /** The vendor's own id for the request, when a response header gives one as a UUID or hex id. */
  readonly failureRequestId?: string;
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
    this.failureRequestId = vendorRequestId(init.failureRequestId);
    this.retryAfter = init.retryAfter;
  }

  /** Productive's own machine-readable code for the first error, if any. */
  get code(): string | undefined {
    return this.errors[0]?.code;
  }
}

/**
 * Response headers that carry the vendor's own id for a request, most specific first. Productive stamps every
 * response with `x-request-id`.
 */
export const REQUEST_ID_HEADERS: readonly string[] = [
  'x-request-id',
  'request-id',
  'x-correlation-id',
  'correlation-id',
  'x-ms-request-id',
  'x-amzn-requestid',
];

/**
 * A hex id: one run of hex digits, or groups of at least four hex digits joined by single hyphens (a UUID is one),
 * 8 to 64 characters in all. A name, a sentence or an e-mail address never fits.
 */
const REQUEST_ID_FORM = /^[0-9A-Fa-f]{4,}(?:-[0-9A-Fa-f]{4,})*$/;
/** Six digits and four more: the shape of a Danish personal number. An id that holds it is dropped. */
const PERSONAL_NUMBER_SHAPE = /\d{6}-?\d{4}/;

/**
 * The vendor's request id, only in the form such ids have (a UUID or a hex id of 8 to 64 characters), or
 * undefined. Anything else, and an id that holds the shape of a personal number, is dropped: the value comes from
 * the vendor and is kept only when it cannot be text.
 */
export function vendorRequestId(value: string | null | undefined): string | undefined {
  if (typeof value !== 'string') return undefined;
  const id = value.trim();
  return id.length >= 8 && id.length <= 64 && REQUEST_ID_FORM.test(id) && !PERSONAL_NUMBER_SHAPE.test(id) ? id : undefined;
}

/** The vendor's request id from the first of REQUEST_ID_HEADERS a response has in the right form, or undefined. */
export function requestIdFrom(headers: Headers, names: readonly string[] = REQUEST_ID_HEADERS): string | undefined {
  for (const name of names) {
    const id = vendorRequestId(headers.get(name));
    if (id !== undefined) return id;
  }
  return undefined;
}

/**
 * Metadata about a failed call, for a host that counts failures: the HTTP status Productive answered with and its
 * request id. Never the response body, Productive's error code or message, or the input.
 */
export interface FailureMetadata {
  /** The HTTP status of Productive's answer (100-599). */
  httpStatus: number;
  /** Productive's own id for the request, as a UUID or hex id only. */
  requestId?: string;
}

/**
 * The failure metadata of an error: an HTTP error from Productive (a refused redirect included) gives its status and
 * request id.
 */
export function failureMetadata(error: unknown): FailureMetadata | undefined {
  const isRedirect = error instanceof Error && error.name === 'ProductiveRedirectError';
  if (!(error instanceof ProductiveHttpError) && !isRedirect) return undefined;
  const { status, failureRequestId } = error as { status?: unknown; failureRequestId?: unknown };
  if (typeof status !== 'number' || !Number.isInteger(status) || status < 100 || status > 599) return undefined;
  const requestId = typeof failureRequestId === 'string' ? vendorRequestId(failureRequestId) : undefined;
  return requestId === undefined ? { httpStatus: status } : { httpStatus: status, requestId };
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
    .slice(0, MAX_ERRORS_SHOWN)
    .map(error => {
      const where = error.source?.parameter ?? error.source?.pointer;
      return truncate(
        redactSecrets(
          [error.code, error.detail ?? error.title, where && `at ${where}`]
            .filter(value => typeof value === 'string' && value)
            .join(' — '),
        ),
      );
    })
    .filter(Boolean)
    .join('; ');

  return [
    `Productive API ${method} ${url} failed with HTTP ${status}`,
    detail || undefined,
    hint || undefined,
    requestId ? `(request id ${truncate(requestId, 128)})` : undefined,
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
  if (error instanceof Error) return redactSecrets(error.message);
  return redactSecrets(String(error));
}
