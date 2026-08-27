import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { createServer, type Server } from 'node:http';
import type { AddressInfo } from 'node:net';
import { createHttpApp } from '../src/transports/http-app.js';
import { getHttpConfig } from '../src/transports/http-helpers.js';
import { ProductiveClient } from '../src/productive/client.js';
import { CredentialStore } from '../src/productive/store.js';

const originalEnv = { ...process.env };
let dir: string;
let server: Server | undefined;
let base: string;

const USER = 'ada@example.com';

/** A client whose /users answers as the account the token belongs to. */
function enrollClient(account: { id: string; email: string } | null, status = 200) {
  const fetchImpl = vi.fn(async () => {
    if (!account || status !== 200) {
      return new Response(JSON.stringify({ errors: [{ code: 'invalid_auth_token' }] }), {
        status,
        headers: { 'content-type': 'application/vnd.api+json' },
      });
    }
    return new Response(
      JSON.stringify({
        data: [
          {
            id: account.id,
            type: 'users',
            attributes: { email: account.email, first_name: 'Ada', last_name: 'Lovelace' },
          },
        ],
        meta: { total_count: 1 },
      }),
      { status: 200, headers: { 'content-type': 'application/vnd.api+json' } },
    );
  }) as unknown as typeof fetch;
  return new ProductiveClient({ organizationId: '12345', apiToken: 'template', fetchImpl });
}

async function listen(options: {
  perUser?: boolean;
  store?: CredentialStore;
  account?: { id: string; email: string } | null;
  status?: number;
}): Promise<void> {
  const app = createHttpApp({
    config: getHttpConfig(),
    perUser: options.perUser ?? true,
    store: options.store,
    enrollClient: enrollClient(options.account ?? { id: '400001', email: USER }, options.status),
  });
  server = createServer(app);
  await new Promise<void>(resolve => server?.listen(0, '127.0.0.1', resolve));
  base = `http://127.0.0.1:${(server?.address() as AddressInfo).port}`;
}

beforeEach(() => {
  dir = mkdtempSync(join(tmpdir(), 'productive-http-'));
  process.env.PRODUCTIVE_ENCRYPTION_KEY = 'a-test-key-long-enough';
  process.env.PRODUCTIVE_STORE_PATH = join(dir, 'store.json');
});

afterEach(async () => {
  if (server) await new Promise<void>(resolve => server?.close(() => resolve()));
  server = undefined;
  process.env = { ...originalEnv };
  rmSync(dir, { recursive: true, force: true });
});

describe('/healthz', () => {
  it('answers without the bearer token, so a healthcheck needs no secret', async () => {
    process.env.MCP_HTTP_TOKEN = 'gateway-token';
    await listen({ store: new CredentialStore() });
    const response = await fetch(`${base}/healthz`);
    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toMatchObject({ ok: true, perUserAuth: true });
  });
});

describe('/mcp', () => {
  it('still requires the bearer token', async () => {
    process.env.MCP_HTTP_TOKEN = 'gateway-token';
    await listen({ store: new CredentialStore() });
    const response = await fetch(`${base}/mcp`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: '{}',
    });
    expect(response.status).toBe(401);
  });
});

describe('the enrollment page', () => {
  it('is reachable WITHOUT the gateway bearer token', async () => {
    // A person's browser cannot carry the gateway's token, so this path is
    // outside that check by design; its security is the single-use state.
    process.env.MCP_HTTP_TOKEN = 'gateway-token';
    const store = new CredentialStore();
    const state = store.createState(USER);
    await listen({ store });

    const response = await fetch(`${base}/productive/enroll?state=${state}`);
    expect(response.status).toBe(200);
    const html = await response.text();
    expect(html).toContain(USER);
    expect(html).toContain('Settings → API integrations');
  });

  it('does not spend the link just by being rendered', async () => {
    const store = new CredentialStore();
    const state = store.createState(USER);
    await listen({ store });

    await fetch(`${base}/productive/enroll?state=${state}`);
    await fetch(`${base}/productive/enroll?state=${state}`);
    // A reload must still work, so the state survives a GET.
    expect(store.peekState(state)).toBe(USER);
  });

  it('refuses an unknown or expired state', async () => {
    await listen({ store: new CredentialStore() });
    const response = await fetch(`${base}/productive/enroll?state=nonsense`);
    expect(response.status).toBe(400);
    expect(await response.text()).toContain('Link expired');
  });

  it('is absent when per-user auth is off', async () => {
    await listen({ perUser: false });
    const response = await fetch(`${base}/productive/enroll?state=x`);
    expect(response.status).toBe(404);
  });

  it('escapes the identity it echoes back', async () => {
    const store = new CredentialStore();
    const state = store.createState('<script>alert(1)</script>@example.com');
    await listen({ store });
    const html = await fetch(`${base}/productive/enroll?state=${state}`).then(r => r.text());
    expect(html).not.toContain('<script>alert(1)</script>');
    expect(html).toContain('&lt;script&gt;');
  });
});

describe('submitting a token', () => {
  async function submit(state: string, token: string): Promise<Response> {
    return fetch(`${base}/productive/enroll?state=${encodeURIComponent(state)}`, {
      method: 'POST',
      headers: { 'content-type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({ token }).toString(),
    });
  }

  it('verifies, stores, and confirms which account it was', async () => {
    const store = new CredentialStore();
    const state = store.createState(USER);
    await listen({ store });

    const response = await submit(state, 'adas-token');
    expect(response.status).toBe(200);
    const html = await response.text();
    expect(html).toContain('Connected');
    expect(html).toContain('Ada Lovelace');
    expect(store.get(USER)?.apiToken).toBe('adas-token');
  });

  it('spends the link, so a replay cannot enroll a second token', async () => {
    const store = new CredentialStore();
    const state = store.createState(USER);
    await listen({ store });

    await submit(state, 'first-token');
    const replay = await submit(state, 'second-token');
    expect(replay.status).toBe(400);
    expect(store.get(USER)?.apiToken).toBe('first-token');
  });

  it('stores nothing when Productive rejects the token', async () => {
    const store = new CredentialStore();
    const state = store.createState(USER);
    await listen({ store, account: null, status: 401 });

    const response = await submit(state, 'bad-token');
    expect(response.status).toBe(400);
    expect(await response.text()).toContain('Not connected');
    expect(store.get(USER)).toBeUndefined();
  });

  it('warns on the page when the token belongs to somebody else', async () => {
    const store = new CredentialStore();
    const state = store.createState(USER);
    await listen({ store, account: { id: '999', email: 'someone.else@example.com' } });

    const html = await submit(state, 'token').then(r => r.text());
    expect(html).toContain('someone.else@example.com');
    expect(html).toContain('recorded in Productive as');
  });

  it('refuses a body far larger than a token could be', async () => {
    const store = new CredentialStore();
    const state = store.createState(USER);
    await listen({ store });

    const response = await fetch(`${base}/productive/enroll?state=${state}`, {
      method: 'POST',
      headers: { 'content-type': 'application/x-www-form-urlencoded' },
      body: `token=${'x'.repeat(200_000)}`,
    });
    expect(response.status).toBe(413);
    expect(store.get(USER)).toBeUndefined();
  });

  it('sends headers that keep the form out of frames and caches', async () => {
    const store = new CredentialStore();
    const state = store.createState(USER);
    await listen({ store });
    const response = await fetch(`${base}/productive/enroll?state=${state}`);
    expect(response.headers.get('cache-control')).toBe('no-store');
    expect(response.headers.get('x-frame-options')).toBe('DENY');
    expect(response.headers.get('content-security-policy')).toContain("form-action 'self'");
  });
});
