import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { ProductiveClient } from '../src/productive/client.js';
import {
  forwardedUser,
  resetIdentityCache,
  resolveIdentity,
  trustForwardedUser,
} from '../src/productive/identity.js';

const originalEnv = { ...process.env };

beforeEach(() => {
  resetIdentityCache();
});
afterEach(() => {
  process.env = { ...originalEnv };
});

function client(people: Array<Record<string, unknown>>, status = 200) {
  const fetchImpl = vi.fn(
    async () =>
      new Response(
        JSON.stringify(
          status === 200
            ? { data: people, meta: { total_count: people.length } }
            : { errors: [{ code: 'invalid_auth_token' }] },
        ),
        { status, headers: { 'content-type': 'application/vnd.api+json' } },
      ),
  ) as unknown as typeof fetch;
  return {
    client: new ProductiveClient({ apiToken: 't', organizationId: '1', fetchImpl }),
    fetchImpl,
  };
}

const person = (id: string, first: string, last: string) => ({
  id,
  type: 'people',
  attributes: { first_name: first, last_name: last },
});

describe('trusting the forwarded header', () => {
  it('ignores the header unless the operator opted in', () => {
    // Any MCP client can set a header, and this value decides whose name goes
    // on a time entry. Off by default is the only safe default.
    delete process.env.PRODUCTIVE_TRUST_FORWARDED_USER;
    expect(trustForwardedUser()).toBe(false);
    expect(forwardedUser('someone@example.com')).toBeUndefined();
  });

  it('reads and normalises it when trust is enabled', () => {
    process.env.PRODUCTIVE_TRUST_FORWARDED_USER = 'true';
    expect(forwardedUser('  Someone@Example.COM ')).toBe('someone@example.com');
    expect(forwardedUser(undefined)).toBeUndefined();
    expect(forwardedUser('   ')).toBeUndefined();
  });
});

describe('resolving a caller to a person', () => {
  it('resolves a single match', async () => {
    const { client: api } = client([person('900001', 'Ada', 'Lovelace')]);
    const identity = await resolveIdentity(api, 'abo@example.com');
    expect(identity).toMatchObject({ personId: '900001', name: 'Ada Lovelace', resolved: true });
  });

  it('refuses to guess when the address matches nobody', async () => {
    const { client: api } = client([]);
    const identity = await resolveIdentity(api, 'nobody@example.com');
    expect(identity?.resolved).toBe(false);
    expect(identity?.personId).toBeUndefined();
    expect(identity?.note).toMatch(/No Productive person/);
  });

  it('refuses to guess when the address matches more than one person', async () => {
    // Productive allows the same address on an archived and a current record.
    // Picking one would book time against the wrong person.
    const { client: api } = client([
      person('1', 'Ada', 'Lovelace'),
      person('2', 'Ada', 'Lovelace (archived)'),
    ]);
    const identity = await resolveIdentity(api, 'abo@example.com');
    expect(identity?.resolved).toBe(false);
    expect(identity?.note).toMatch(/More than one/);
  });

  it('survives a failed lookup without breaking the call', async () => {
    // A read that needs no identity must still work when the lookup fails.
    const { client: api } = client([], 401);
    const identity = await resolveIdentity(api, 'abo@example.com');
    expect(identity?.resolved).toBe(false);
    expect(identity?.note).toMatch(/Could not look this caller up/);
  });

  it('caches the lookup instead of spending a request per tool call', async () => {
    const { client: api, fetchImpl } = client([person('900001', 'Ada', 'Lovelace')]);
    await resolveIdentity(api, 'abo@example.com');
    await resolveIdentity(api, 'abo@example.com');
    expect(fetchImpl).toHaveBeenCalledTimes(1);
  });

  it('does nothing at all without an address', async () => {
    const { client: api, fetchImpl } = client([]);
    await expect(resolveIdentity(api, undefined)).resolves.toBeUndefined();
    expect(fetchImpl).not.toHaveBeenCalled();
  });
});
