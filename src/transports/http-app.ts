import type { IncomingMessage, RequestListener, ServerResponse } from 'node:http';
import { StreamableHTTPServerTransport } from '@modelcontextprotocol/sdk/server/streamableHttp.js';
import { createServer as createMcpServer } from '../server.js';
import type { ProductiveClient } from '../productive/client.js';
import type { CredentialStore } from '../productive/store.js';
import { verifyAndStore } from '../productive/enroll.js';
import { forwardedUser } from '../productive/identity.js';
import {
  assertAllowedOrigin,
  assertAuthorized,
  corsHeaders,
  getHttpConfig,
  HttpRequestError,
  readJsonBody,
  sendJson,
  type HttpConfig,
} from './http-helpers.js';

/**
 * The whole HTTP surface, with its dependencies injected.
 *
 * Built this way so it is testable: an earlier sibling connector did all of
 * this in import-time side effects, and the enrollment flow could then only be
 * exercised by starting a real server on a real port.
 */
export interface HttpAppOptions {
  config: HttpConfig;
  perUser: boolean;
  store?: CredentialStore;
  /**
   * Client used only to verify a submitted token, by cloning it with that
   * token. Carries the organization pin, so a token that cannot reach this
   * organization is refused at enrollment rather than on some later call.
   */
  enrollClient: ProductiveClient;
  publicBaseUrl?: string;
}

/** Bodies posted to the enrollment form; a token is a few hundred bytes. */
const MAX_FORM_BYTES = 64 * 1024;

export function createHttpApp(options: HttpAppOptions): RequestListener {
  const { config, perUser, store, enrollClient } = options;

  return async (req, res) => {
    try {
      const url = new URL(req.url ?? '/', 'http://localhost');

      // Unauthenticated liveness probe, so a container healthcheck does not
      // need to be given the bearer token.
      if (url.pathname === '/healthz') {
        sendJson(res, 200, { ok: true, perUserAuth: perUser }, req);
        return;
      }

      // The enrollment pages are reached by a person's BROWSER, which cannot
      // carry the gateway's bearer token — so they sit outside that check by
      // design. Their security is the single-use, identity-bound state token,
      // which is why the path must be routed straight to this container rather
      // than through the MCP gateway.
      if (url.pathname === '/productive/enroll') {
        if (!perUser || !store) {
          sendHtml(res, 404, page('Not available', '<p>Per-user authentication is not enabled on this server.</p>'));
          return;
        }
        if (req.method === 'GET') {
          handleEnrollForm(res, store, url);
          return;
        }
        if (req.method === 'POST') {
          await handleEnrollSubmit(req, res, store, enrollClient, url);
          return;
        }
        sendHtml(res, 405, page('Method not allowed', '<p>Use GET or POST.</p>'));
        return;
      }

      if (url.pathname !== '/mcp') {
        sendJson(res, 404, { error: 'Not found' }, req);
        return;
      }

      assertAllowedOrigin(req);

      if (req.method === 'OPTIONS') {
        res.writeHead(204, corsHeaders(req));
        res.end();
        return;
      }

      if (req.method !== 'POST') {
        sendJson(res, 405, { error: 'Method not allowed' }, req, { Allow: 'POST' });
        return;
      }

      assertAuthorized(req, config);
      const body = await readJsonBody(req, config.maxBodyBytes);

      // Who the gateway says is asking. Read only when
      // PRODUCTIVE_TRUST_FORWARDED_USER is on — forwardedUser() enforces that —
      // because any MCP client can set a header, and in per-user mode this
      // value decides whose token is used.
      const onBehalfOf = forwardedUser(headerValue(req.headers['x-mcp-user']));

      const mcpServer = createMcpServer({
        onBehalfOf,
        store,
        publicBaseUrl: options.publicBaseUrl,
      });
      const transport = new StreamableHTTPServerTransport({ sessionIdGenerator: undefined });

      await mcpServer.connect(transport);
      await transport.handleRequest(req, res, body);

      res.on('close', () => {
        void transport.close();
        void mcpServer.close();
      });
    } catch (error) {
      console.error(error);
      if (res.headersSent) return;
      if (error instanceof HttpRequestError) {
        sendJson(res, error.status, { error: error.message }, req);
        return;
      }
      sendJson(
        res,
        500,
        { jsonrpc: '2.0', error: { code: -32603, message: 'Internal server error' }, id: null },
        req,
      );
    }
  };
}

function handleEnrollForm(res: ServerResponse, store: CredentialStore, url: URL): void {
  const state = url.searchParams.get('state') ?? '';
  // Peek rather than consume: rendering the form must not spend the one use, or
  // a reload would break the flow.
  const user = store.peekState(state);
  if (!user) {
    sendHtml(
      res,
      400,
      page(
        'Link expired',
        '<p>This enrollment link is no longer valid. Links are single-use and expire after 10 minutes.</p>' +
          '<p>Ask for a new one with <code>productive_connect</code>.</p>',
      ),
    );
    return;
  }

  sendHtml(
    res,
    200,
    page(
      'Link your Productive account',
      `<p>Signed in as <strong>${escapeHtml(user)}</strong>.</p>
       <ol>
         <li>In Productive, open <strong>Settings → API integrations</strong> and create a token.</li>
         <li>Paste it below. It carries your own permissions, and Productive will record your name on what you do.</li>
       </ol>
       <form method="POST" action="/productive/enroll?state=${encodeURIComponent(state)}">
         <label for="token">Productive API token</label>
         <input id="token" name="token" type="password" autocomplete="off" autocapitalize="off"
                spellcheck="false" required placeholder="Paste the token here">
         <button type="submit">Connect</button>
       </form>
       <p class="muted">This form posts straight to the server holding your session. The token is
       encrypted at rest and is never written into your conversation.</p>`,
    ),
  );
}

async function handleEnrollSubmit(
  req: IncomingMessage,
  res: ServerResponse,
  store: CredentialStore,
  enrollClient: ProductiveClient,
  url: URL,
): Promise<void> {
  const state = url.searchParams.get('state') ?? '';
  const raw = await readRawBody(req, MAX_FORM_BYTES);
  const token = new URLSearchParams(raw).get('token') ?? '';

  // Consume only now, on an actual submission.
  const user = store.consumeState(state);
  if (!user) {
    sendHtml(
      res,
      400,
      page(
        'Link expired',
        '<p>This enrollment link had already been used or had expired. Ask for a new one with <code>productive_connect</code>.</p>',
      ),
    );
    return;
  }

  const result = await verifyAndStore(enrollClient, store, user, token);
  if (!result.ok) {
    sendHtml(
      res,
      400,
      page(
        'Not connected',
        `<p>${escapeHtml(result.message)}</p><p>Ask for a new link with <code>productive_connect</code> and try again.</p>`,
      ),
    );
    return;
  }

  const warning = result.emailMismatch
    ? `<p class="warn">This token belongs to <strong>${escapeHtml(
        result.emailMismatch.productiveEmail,
      )}</strong>, not <strong>${escapeHtml(
        result.emailMismatch.gatewayIdentity,
      )}</strong>. Everything you do will be recorded in Productive as that account.</p>`
    : '';

  sendHtml(
    res,
    200,
    page(
      'Connected',
      `<p>${escapeHtml(result.message)}</p>${warning}<p>You can close this tab and go back to your conversation.</p>`,
    ),
  );
}

/** Read a form body as text, refusing anything larger than a token could be. */
async function readRawBody(req: IncomingMessage, maxBytes: number): Promise<string> {
  const chunks: Buffer[] = [];
  let total = 0;
  for await (const chunk of req) {
    const buffer = Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk as string);
    total += buffer.byteLength;
    if (total > maxBytes) throw new HttpRequestError(413, 'Payload too large');
    chunks.push(buffer);
  }
  return Buffer.concat(chunks).toString('utf8');
}

function headerValue(value: string | string[] | undefined): string | undefined {
  return Array.isArray(value) ? value[0] : value;
}

function sendHtml(res: ServerResponse, status: number, html: string): void {
  res.writeHead(status, {
    'Content-Type': 'text/html; charset=utf-8',
    // Nothing here should be framed, cached, or sniffed.
    'Cache-Control': 'no-store',
    'X-Content-Type-Options': 'nosniff',
    'X-Frame-Options': 'DENY',
    'Referrer-Policy': 'no-referrer',
    'Content-Security-Policy': "default-src 'none'; style-src 'unsafe-inline'; form-action 'self'",
  });
  res.end(html);
}

/** Minimal, dependency-free page that respects the reader's colour scheme. */
function page(title: string, body: string): string {
  return `<!doctype html>
<html lang="en"><head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<meta name="robots" content="noindex, nofollow">
<title>${escapeHtml(title)} — Productive</title>
<style>
  :root { color-scheme: light dark; --fg: #14161a; --bg: #fff; --muted: #5b6472; --line: #d8dde5; --accent: #1e5fd8; --warn: #8a4b00; --warnbg: #fff6e5; }
  @media (prefers-color-scheme: dark) {
    :root { --fg: #e8ecf2; --bg: #14161a; --muted: #9aa4b2; --line: #2c313a; --accent: #7aa7ff; --warn: #ffcf8a; --warnbg: #2a2214; }
  }
  * { box-sizing: border-box; }
  body { margin: 0; padding: 2.5rem 1.25rem; background: var(--bg); color: var(--fg);
         font: 16px/1.6 ui-sans-serif, system-ui, -apple-system, "Segoe UI", Roboto, sans-serif; }
  main { max-width: 34rem; margin: 0 auto; }
  h1 { font-size: 1.4rem; margin: 0 0 1rem; }
  ol { padding-left: 1.25rem; }
  code { background: color-mix(in srgb, var(--fg) 8%, transparent); padding: .1em .35em; border-radius: 4px; font-size: .9em; }
  label { display: block; font-weight: 600; margin: 1.5rem 0 .4rem; }
  input { width: 100%; padding: .7rem .8rem; font: inherit; color: var(--fg); background: var(--bg);
          border: 1px solid var(--line); border-radius: 8px; }
  input:focus-visible { outline: 2px solid var(--accent); outline-offset: 1px; }
  button { margin-top: 1rem; padding: .7rem 1.4rem; font: inherit; font-weight: 600; color: #fff;
           background: var(--accent); border: 0; border-radius: 8px; cursor: pointer; }
  .muted { color: var(--muted); font-size: .9rem; }
  .warn { background: var(--warnbg); color: var(--warn); padding: .8rem 1rem; border-radius: 8px; }
</style>
</head><body><main><h1>${escapeHtml(title)}</h1>${body}</main></body></html>`;
}

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

export { getHttpConfig };
