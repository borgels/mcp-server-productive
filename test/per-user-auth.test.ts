import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { InMemoryTransport } from '@modelcontextprotocol/sdk/inMemory.js';
import { createServer } from '../src/server.js';
import { ProductiveClient } from '../src/productive/client.js';
import { CredentialStore } from '../src/productive/store.js';
import { connectInstructions, disconnect, statusFor, verifyAndStore } from '../src/productive/enroll.js';
import { toolCapabilityIds } from '../src/productive/capabilities.js';
import { resetIdentityCache } from '../src/productive/identity.js';

const originalEnv = { ...process.env };
let dir: string;

beforeEach(() => {
  dir = mkdtempSync(join(tmpdir(), 'productive-store-'));
  process.env.PRODUCTIVE_ENCRYPTION_KEY = 'a-test-key-long-enough';
  process.env.PRODUCTIVE_STORE_PATH = join(dir, 'store.json');
  resetIdentityCache();
});

afterEach(() => {
  process.env = { ...originalEnv };
  rmSync(dir, { recursive: true, force: true });
});

const USER = 'ada@example.com';

function makeStore(): CredentialStore {
  return new CredentialStore();
}

/** A client whose fetch answers /users as the given account. */
function clientFor(
  account: { id: string; email: string } | null,
  status = 200,
): { client: ProductiveClient; tokensSeen: string[] } {
  const tokensSeen: string[] = [];
  const fetchImpl = vi.fn(async (_input: string | URL | Request, init?: RequestInit) => {
    const token = new Headers(init?.headers).get('x-auth-token') ?? '';
    tokensSeen.push(token);
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

  return {
    client: new ProductiveClient({ organizationId: '12345', apiToken: 'template', fetchImpl }),
    tokensSeen,
  };
}

describe('the credential store', () => {
  it('refuses to run without a real encryption key', () => {
    delete process.env.PRODUCTIVE_ENCRYPTION_KEY;
    expect(() => makeStore()).toThrow(/PRODUCTIVE_ENCRYPTION_KEY/);
    process.env.PRODUCTIVE_ENCRYPTION_KEY = 'short';
    expect(() => makeStore()).toThrow(/minimum 16 characters/);
  });

  it('keeps tokens out of the file in plaintext', () => {
    const store = makeStore();
    store.set(USER, { apiToken: 'super-secret-token', connectedAt: Date.now() });
    const raw = require('node:fs').readFileSync(process.env.PRODUCTIVE_STORE_PATH as string, 'utf8');
    expect(raw).not.toContain('super-secret-token');
    // ...and the same store round-trips it.
    expect(makeStore().get(USER)?.apiToken).toBe('super-secret-token');
  });

  it('gives each identity its own row, keyed case-insensitively', () => {
    const store = makeStore();
    store.set('Ada@Example.com', { apiToken: 'a', connectedAt: 1 });
    store.set('bob@example.com', { apiToken: 'b', connectedAt: 1 });
    expect(store.get('ada@EXAMPLE.COM')?.apiToken).toBe('a');
    expect(store.get('bob@example.com')?.apiToken).toBe('b');
    expect(store.delete('ada@example.com')).toBe(true);
    expect(store.get('Ada@Example.com')).toBeUndefined();
    expect(store.get('bob@example.com')?.apiToken).toBe('b');
  });

  it('binds an enrollment link to one identity and spends it once', () => {
    const store = makeStore();
    const state = store.createState(USER);
    // Peek does not spend it, so reloading the form still works.
    expect(store.peekState(state)).toBe(USER);
    expect(store.peekState(state)).toBe(USER);
    expect(store.consumeState(state)).toBe(USER);
    expect(store.consumeState(state)).toBeUndefined();
    expect(store.peekState('not-a-state')).toBeUndefined();
  });
});

describe('enrollment', () => {
  it('verifies the token against this organization before storing it', async () => {
    const store = makeStore();
    const { client, tokensSeen } = clientFor({ id: '400001', email: USER });

    const result = await verifyAndStore(client, store, USER, '  pasted-token  ');
    expect(result.ok).toBe(true);
    // Verified with the CANDIDATE token, not the server's own.
    expect(tokensSeen).toEqual(['pasted-token']);
    expect(store.get(USER)).toMatchObject({
      apiToken: 'pasted-token',
      productiveUserId: '400001',
      productiveEmail: USER,
    });
  });

  it('stores nothing when Productive rejects the token', async () => {
    const store = makeStore();
    const { client } = clientFor(null, 401);
    const result = await verifyAndStore(client, store, USER, 'bad-token');
    expect(result.ok).toBe(false);
    expect(result.message).toMatch(/rejected that token/);
    expect(store.get(USER)).toBeUndefined();
  });

  it('stores nothing for an empty submission', async () => {
    const store = makeStore();
    const { client } = clientFor({ id: '1', email: USER });
    expect((await verifyAndStore(client, store, USER, '   ')).ok).toBe(false);
    expect(store.get(USER)).toBeUndefined();
  });

  it('reports a token belonging to somebody else, and stores it by default', async () => {
    // Pasting another person's token means everything is recorded as them, so
    // it is said out loud. It is not refused by default: whoever pastes it
    // already holds that credential, so refusing buys little and a legitimately
    // different email is plausible.
    const store = makeStore();
    const { client } = clientFor({ id: '999', email: 'someone.else@example.com' });
    const result = await verifyAndStore(client, store, USER, 'token');
    expect(result.ok).toBe(true);
    expect(result.emailMismatch).toEqual({
      gatewayIdentity: USER,
      productiveEmail: 'someone.else@example.com',
    });
    expect(result.message).toMatch(/recorded in Productive as someone.else@example.com/);
  });

  it('refuses the mismatch when the operator asks it to', async () => {
    process.env.PRODUCTIVE_REQUIRE_EMAIL_MATCH = 'true';
    const store = makeStore();
    const { client } = clientFor({ id: '999', email: 'someone.else@example.com' });
    const result = await verifyAndStore(client, store, USER, 'token');
    expect(result.ok).toBe(false);
    expect(store.get(USER)).toBeUndefined();
  });

  it('hands out a single-use link, and reports an existing connection instead', () => {
    const store = makeStore();
    const first = connectInstructions(store, USER, 'https://productive.example.com');
    expect(first.status).toBe('enrollment_required');
    expect(first.enrollUrl).toMatch(
      /^https:\/\/productive\.example\.com\/productive\/enroll\?state=/,
    );
    expect(first.expiresInMinutes).toBe(10);
    // The instructions must say not to paste the token into the chat.
    expect(first.instructions.join(' ')).toMatch(/not paste the token into this conversation/i);

    store.set(USER, { apiToken: 't', connectedAt: Date.now(), productiveEmail: USER });
    expect(connectInstructions(store, USER, 'https://x').status).toBe('already_connected');
    expect(connectInstructions(store, USER, 'https://x', { force: true }).status).toBe(
      'enrollment_required',
    );
  });

  it('reports status and disconnects', () => {
    const store = makeStore();
    expect(statusFor(store, USER)).toMatchObject({ connected: false });
    store.set(USER, { apiToken: 't', connectedAt: 0, productiveEmail: USER });
    expect(statusFor(store, USER)).toMatchObject({ connected: true, productiveEmail: USER });
    expect(disconnect(store, USER)).toMatchObject({ disconnected: true });
    // And says plainly that the token still works in Productive.
    expect(String(disconnect(store, USER).note)).toMatch(/Nothing was stored/);
  });
});

describe('the tool surface in per-user mode', () => {
  async function tools(store?: CredentialStore, onBehalfOf?: string) {
    const { client } = clientFor({ id: '1', email: USER });
    const server = createServer({ client, store, onBehalfOf });
    const [clientTransport, serverTransport] = InMemoryTransport.createLinkedPair();
    const mcp = new Client({ name: 't', version: '0' });
    await Promise.all([server.connect(serverTransport), mcp.connect(clientTransport)]);
    return mcp;
  }

  it('adds exactly the three auth tools, and only in this mode', async () => {
    delete process.env.PRODUCTIVE_PER_USER_AUTH;
    const shared = (await (await tools()).listTools()).tools.map(t => t.name);
    for (const name of ['productive_connect', 'productive_status', 'productive_disconnect']) {
      expect(shared).not.toContain(name);
    }

    process.env.PRODUCTIVE_PER_USER_AUTH = 'true';
    const perUser = (await (await tools(makeStore(), USER)).listTools()).tools.map(t => t.name);
    for (const name of ['productive_connect', 'productive_status', 'productive_disconnect']) {
      expect(perUser).toContain(name);
    }
    // Nothing else changes shape between the two modes.
    expect(
      perUser.filter(
        n => !['productive_connect', 'productive_status', 'productive_disconnect'].includes(n),
      ).sort(),
    ).toEqual(shared.sort());
  });

  it('keeps discovery and the registered surface in agreement in both modes', async () => {
    delete process.env.PRODUCTIVE_PER_USER_AUTH;
    expect((await (await tools()).listTools()).tools.map(t => t.name).sort()).toEqual(
      toolCapabilityIds().sort(),
    );

    process.env.PRODUCTIVE_PER_USER_AUTH = 'true';
    expect(
      (await (await tools(makeStore(), USER)).listTools()).tools.map(t => t.name).sort(),
    ).toEqual(toolCapabilityIds().sort());
  });

  it('refuses a data call from a caller who has not enrolled', async () => {
    process.env.PRODUCTIVE_PER_USER_AUTH = 'true';
    const mcp = await tools(makeStore(), USER);
    const result = await mcp.callTool({
      name: 'productive_list',
      arguments: { resource: 'projects' },
    });
    expect(result.isError).toBe(true);
    expect(JSON.stringify(result.content)).toMatch(/NOT_CONNECTED/);
  });

  it('never falls back to the shared token for an un-enrolled caller', async () => {
    // The whole point of this mode: a fallback would hand them borrowed rights.
    process.env.PRODUCTIVE_PER_USER_AUTH = 'true';
    process.env.PRODUCTIVE_API_TOKEN = 'a-shared-token-that-must-not-be-used';
    const { client, tokensSeen } = clientFor({ id: '1', email: USER });
    const server = createServer({ client, store: makeStore(), onBehalfOf: USER });
    const [ct, st] = InMemoryTransport.createLinkedPair();
    const mcp = new Client({ name: 't', version: '0' });
    await Promise.all([server.connect(st), mcp.connect(ct)]);

    const result = await mcp.callTool({
      name: 'productive_list',
      arguments: { resource: 'projects' },
    });
    expect(result.isError).toBe(true);
    expect(tokensSeen).toEqual([]);
  });

  it('uses the caller own stored token once they have enrolled', async () => {
    process.env.PRODUCTIVE_PER_USER_AUTH = 'true';
    const store = makeStore();
    store.set(USER, { apiToken: 'adas-own-token', connectedAt: Date.now() });

    const { client, tokensSeen } = clientFor({ id: '1', email: USER });
    const server = createServer({ client, store, onBehalfOf: USER });
    const [ct, st] = InMemoryTransport.createLinkedPair();
    const mcp = new Client({ name: 't', version: '0' });
    await Promise.all([server.connect(st), mcp.connect(ct)]);

    await mcp.callTool({ name: 'productive_list', arguments: { resource: 'projects' } });
    expect(tokensSeen).toContain('adas-own-token');
    expect(tokensSeen).not.toContain('template');
  });

  it('refuses to start in per-user mode without a store', () => {
    process.env.PRODUCTIVE_PER_USER_AUTH = 'true';
    const { client } = clientFor({ id: '1', email: USER });
    expect(() => createServer({ client })).toThrow(/no credential store/);
  });

  it('refuses a call with no forwarded caller at all', async () => {
    process.env.PRODUCTIVE_PER_USER_AUTH = 'true';
    const mcp = await tools(makeStore(), undefined);
    const result = await mcp.callTool({ name: 'productive_status', arguments: {} });
    expect(result.isError).toBe(true);
    expect(JSON.stringify(result.content)).toMatch(/No caller identity/);
  });
});
