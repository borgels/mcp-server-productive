import { createHash, timingSafeEqual } from 'node:crypto';
import type { IncomingMessage, ServerResponse } from 'node:http';

export class HttpRequestError extends Error {
  readonly status: number;

  constructor(status: number, message: string) {
    super(message);
    this.name = 'HttpRequestError';
    this.status = status;
  }
}

export interface HttpConfig {
  host: string;
  port: number;
  maxBodyBytes: number;
  httpToken?: string;
}

export function getHttpConfig(): HttpConfig {
  return {
    host: process.env.MCP_HTTP_HOST ?? process.env.HOST ?? '127.0.0.1',
    port: Number(process.env.PORT ?? 3000),
    maxBodyBytes: Number(process.env.MCP_MAX_BODY_BYTES ?? 10_485_760),
    httpToken: process.env.MCP_HTTP_TOKEN || undefined,
  };
}

export function assertAuthorized(req: IncomingMessage, config = getHttpConfig()): void {
  if (!config.httpToken) {
    return;
  }

  if (!tokenMatches(req.headers.authorization, `Bearer ${config.httpToken}`)) {
    throw new HttpRequestError(401, 'Unauthorized');
  }
}

/** Constant-time comparison: both sides are hashed so lengths never leak. */
export function tokenMatches(given: string | undefined, expected: string): boolean {
  const a = createHash('sha256').update(given ?? '', 'utf8').digest();
  const b = createHash('sha256').update(expected, 'utf8').digest();
  return timingSafeEqual(a, b) && typeof given === 'string';
}

/** Env switches that make this server trust a forwarded caller identity header. */
export const TRUST_FORWARDED_USER_VARS = ['PRODUCTIVE_TRUST_FORWARDED_USER'] as const;

/**
 * Refuse to serve HTTP when a forwarded identity header is trusted but nothing
 * authenticates the request: any client could then name any user.
 */
export function assertSafeHttpStartup(
  config: HttpConfig = getHttpConfig(),
  env: NodeJS.ProcessEnv = process.env,
): void {
  const trusting = TRUST_FORWARDED_USER_VARS.filter(name => env[name] === 'true');
  if (trusting.length && !config.httpToken) {
    throw new Error(
      `${trusting.join(', ')}=true requires MCP_HTTP_TOKEN to be set. Without it any client that ` +
        'can reach this server could set the forwarded user header and act as anyone. Set ' +
        'MCP_HTTP_TOKEN (shared with the authenticating gateway) or turn the trust setting off.',
    );
  }
}

export function assertAllowedOrigin(req: IncomingMessage): void {
  if (!isOriginAllowed(req.headers.origin)) {
    throw new HttpRequestError(403, 'Origin not allowed');
  }
}

export async function readJsonBody(
  req: IncomingMessage,
  maxBodyBytes = getHttpConfig().maxBodyBytes,
): Promise<unknown> {
  const chunks: Buffer[] = [];
  let totalBytes = 0;

  for await (const chunk of req) {
    const buffer = Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk);
    totalBytes += buffer.byteLength;
    if (totalBytes > maxBodyBytes) {
      throw new HttpRequestError(413, 'Payload too large');
    }
    chunks.push(buffer);
  }

  const text = Buffer.concat(chunks).toString('utf8');
  return text ? (JSON.parse(text) as unknown) : undefined;
}

export function sendJson(
  res: ServerResponse,
  status: number,
  payload: unknown,
  req?: IncomingMessage,
  extraHeaders: Record<string, string> = {},
): void {
  res.writeHead(status, {
    ...corsHeaders(req),
    'Content-Type': 'application/json',
    ...extraHeaders,
  });
  res.end(JSON.stringify(payload));
}

export function corsHeaders(req?: IncomingMessage): Record<string, string> {
  const origin = req?.headers.origin;
  const headers: Record<string, string> = {
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization, mcp-session-id',
  };

  if (process.env.MCP_ALLOW_ANY_ORIGIN === 'true') {
    headers['Access-Control-Allow-Origin'] = '*';
    return headers;
  }

  if (origin && isOriginAllowed(origin)) {
    headers['Access-Control-Allow-Origin'] = origin;
    headers.Vary = 'Origin';
  }

  return headers;
}

export function isOriginAllowed(origin: string | undefined): boolean {
  if (!origin || process.env.MCP_ALLOW_ANY_ORIGIN === 'true') {
    return true;
  }

  const configuredOrigins = (process.env.MCP_ALLOWED_ORIGINS ?? '')
    .split(',')
    .map(item => item.trim())
    .filter(Boolean);
  if (configuredOrigins.length) {
    return configuredOrigins.includes(origin);
  }

  try {
    const url = new URL(origin);
    return ['localhost', '127.0.0.1', '::1'].includes(url.hostname);
  } catch {
    return false;
  }
}
