import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { ProductiveClient } from '../src/productive/client.js';
import {
  checkConnection,
  commitOperation,
  createRecord,
  deleteRecord,
  getRecord,
  listRecords,
  runAction,
  trackTime,
  updateRecord,
  type WriteOutcome,
} from '../src/productive/resources.js';
import { loadPolicy } from '../src/productive/policy.js';
import { resetIdentityCache } from '../src/productive/identity.js';
import type { FlatCollection } from '../src/productive/jsonapi.js';
import type { PreparedOperation } from '../src/productive/operations.js';

const originalEnv = { ...process.env };

interface Call {
  url: string;
  method: string;
  body?: unknown;
}

function harness(responses: Array<unknown> = [{ data: null }]) {
  const calls: Call[] = [];
  let index = 0;
  const fetchImpl = vi.fn(async (input: string | URL | Request, init?: RequestInit) => {
    calls.push({
      url: String(input),
      method: init?.method ?? 'GET',
      body: init?.body ? JSON.parse(String(init.body)) : undefined,
    });
    const payload = responses[Math.min(index, responses.length - 1)];
    index += 1;
    return new Response(JSON.stringify(payload), {
      status: 200,
      headers: { 'content-type': 'application/vnd.api+json' },
    });
  }) as unknown as typeof fetch;

  const client = new ProductiveClient({ apiToken: 't', organizationId: '12345', fetchImpl });
  return { client, calls };
}

/** Everything open, so tests exercise behaviour rather than the gates. */
function openPolicy() {
  process.env.PRODUCTIVE_ENABLE_WRITES = 'true';
  process.env.PRODUCTIVE_ENABLE_FINANCIALS = 'true';
  process.env.PRODUCTIVE_ENABLE_ADMIN = 'true';
  process.env.PRODUCTIVE_ENABLE_DELETES = 'true';
  return { policy: loadPolicy() };
}

beforeEach(() => {
  resetIdentityCache();
});

afterEach(() => {
  process.env = { ...originalEnv };
});

describe('reads', () => {
  it('flattens JSON:API out of the way and reports the page position', async () => {
    const { client } = harness([
      {
        data: [
          {
            id: '1',
            type: 'tasks',
            attributes: { title: 'Fix the thing', closed: false },
            relationships: {
              assignee: { data: { id: '9', type: 'people' } },
              project: { data: null },
            },
          },
        ],
        included: [
          { id: '9', type: 'people', attributes: { first_name: 'Mia', last_name: 'Jensen' } },
        ],
        meta: { total_count: 120, current_page: 1, total_pages: 4, page_size: 30 },
      },
    ]);

    const result = (await listRecords(client, { resource: 'tasks' })) as FlatCollection;
    const record = result.records[0];

    expect(record?.title).toBe('Fix the thing');
    // The included person is inlined into the relationship, not left as a stub
    // for the caller to correlate by hand.
    expect((record?.relationships as Record<string, Record<string, unknown>>).assignee).toMatchObject({
      id: '9',
      first_name: 'Mia',
    });
    // A null relationship is dropped rather than listed.
    expect((record?.relationships as Record<string, unknown>).project).toBeUndefined();
    // And the caller is told this is one page of four.
    expect(result.total).toBe(120);
    expect(result.nextPage).toBe(2);
  });

  it('returns the untouched envelope when asked for it', async () => {
    const envelope = { data: [], meta: { total_count: 0 }, links: { first: 'x' } };
    const { client } = harness([envelope]);
    await expect(listRecords(client, { resource: 'tasks', raw: true })).resolves.toEqual(envelope);
  });

  it('refuses a bad filter before spending a request', async () => {
    const { client, calls } = harness();
    await expect(listRecords(client, { resource: 'tasks', filters: { assignee: 1 } })).rejects.toThrow(
      /no filter "assignee"/,
    );
    expect(calls).toHaveLength(0);
  });

  it('points at productive_get when a resource has no collection', async () => {
    const { client } = harness();
    // /invitations has no index endpoint — a caller has to know the id.
    await expect(listRecords(client, { resource: 'invitations' })).rejects.toThrow(
      /no collection endpoint/,
    );
  });

  it('reports the token owner and the policy on a connection check', async () => {
    const { client } = harness([
      {
        data: [
          {
            id: '1',
            type: 'organization_memberships',
            attributes: {},
            relationships: { person: { data: { id: '900001', type: 'people' } } },
          },
        ],
        included: [
          { id: '900001', type: 'people', attributes: { first_name: 'Ada', last_name: 'Lovelace' } },
        ],
        meta: { total_count: 3 },
      },
    ]);

    const result = await checkConnection(client, openPolicy());
    expect(result.organizationId).toBe('12345');
    expect(result.tokenBelongsTo).toMatchObject({ personId: '900001', name: 'Ada Lovelace' });
    // Attribution is stated rather than left implicit: every change is credited
    // to this person whoever asked.
    expect(String(result.attribution)).toMatch(/against the token owner/i);
  });
});

describe('ordinary writes run in one call', () => {
  it('creates with the JSON:API envelope and the right type', async () => {
    const { client, calls } = harness([{ data: { id: '77', type: 'tasks', attributes: { title: 'x' } } }]);

    const result = (await createRecord(
      client,
      {
        resource: 'tasks',
        attributes: { title: 'x', project_id: '700001', task_list_id: '800001' },
      },
      openPolicy(),
    )) as Extract<WriteOutcome, { status: 'done' }>;

    expect(result.status).toBe('done');
    expect(calls[0]?.method).toBe('POST');
    expect(calls[0]?.body).toEqual({
      data: {
        type: 'tasks',
        attributes: { title: 'x', project_id: '700001', task_list_id: '800001' },
      },
    });
    expect(result.record?.id).toBe('77');
  });

  it('refuses a misspelled attribute rather than reporting a write that did nothing', async () => {
    // This is the load-bearing check: Productive answers 200 and applies
    // nothing for an unknown attribute, so without this the caller is told the
    // write succeeded.
    const { client, calls } = harness();
    await expect(
      updateRecord(client, { resource: 'tasks', id: '1', attributes: { titel: 'typo' } }, openPolicy()),
    ).rejects.toThrow(/no attribute "titel"/);
    expect(calls).toHaveLength(0);
  });
});

describe('consequential writes are staged', () => {
  it('stages a financial write instead of performing it', async () => {
    const { client, calls } = harness();

    const result = (await updateRecord(
      client,
      { resource: 'invoices', id: '5', attributes: { note: 'Paid late' } },
      openPolicy(),
    )) as Extract<WriteOutcome, { status: 'staged' }>;

    expect(result.status).toBe('staged');
    expect(result.operation.dryRun).toBe(true);
    expect(result.operation.method).toBe('PATCH');
    // Nothing has been sent.
    expect(calls).toHaveLength(0);
  });

  it('stages a delete and says restoration is not guaranteed', async () => {
    const { client, calls } = harness();
    const result = (await deleteRecord(
      client,
      { resource: 'tasks', id: '1' },
      openPolicy(),
    )) as Extract<WriteOutcome, { status: 'staged' }>;

    expect(result.status).toBe('staged');
    expect(result.operation.warnings.join(' ')).toMatch(/deleted_items/);
    expect(calls).toHaveLength(0);
  });

  it('warns loudly when an action leaves the organization', async () => {
    const { client } = harness();
    const result = (await runAction(
      client,
      { resource: 'invoices', action: 'send', id: '5' },
      openPolicy(),
    )) as Extract<WriteOutcome, { status: 'staged' }>;

    expect(result.operation.warnings.join(' ')).toMatch(/leaves the organization/);
  });

  it('will not run a bulk action without an explicit filter', async () => {
    // bulk_approve approves every entry the filter matches; running it with no
    // filter would approve the whole organization's timesheets.
    const { client } = harness();
    await expect(
      runAction(client, { resource: 'time_entries', action: 'bulk_approve' }, openPolicy()),
    ).rejects.toThrow(/will not run without an explicit `filters` argument/);
  });

  it('stages a bulk action, warning that it is not one record', async () => {
    const { client } = harness();
    const result = (await runAction(
      client,
      { resource: 'time_entries', action: 'bulk_approve', filters: { person_id: '900001' } },
      openPolicy(),
    )) as Extract<WriteOutcome, { status: 'staged' }>;

    expect(result.status).toBe('staged');
    expect(result.operation.warnings.join(' ')).toMatch(/EVERY record/);
  });

  it('needs an id for a single-record action', async () => {
    const { client } = harness();
    await expect(
      runAction(client, { resource: 'invoices', action: 'send' }, openPolicy()),
    ).rejects.toThrow(/needs an id/);
  });
});

describe('committing a staged operation', () => {
  async function stage(client: ProductiveClient): Promise<PreparedOperation> {
    const result = (await updateRecord(
      client,
      { resource: 'invoices', id: '5', attributes: { note: 'ok' } },
      openPolicy(),
    )) as Extract<WriteOutcome, { status: 'staged' }>;
    return result.operation;
  }

  it('executes exactly what was staged', async () => {
    const { client, calls } = harness([{ data: { id: '5', type: 'invoices', attributes: {} } }]);
    const staged = await stage(client);

    const result = await commitOperation(client, staged, openPolicy());
    expect(result.status).toBe('done');
    expect(calls).toHaveLength(1);
    expect(calls[0]?.method).toBe('PATCH');
    expect(calls[0]?.url).toContain('/invoices/5');
  });

  it('refuses an operation edited after staging', async () => {
    const { client, calls } = harness();
    const staged = await stage(client);
    const tampered = {
      ...staged,
      body: { data: { type: 'invoices', id: '5', attributes: { note: 'something else' } } },
    };

    await expect(commitOperation(client, tampered, openPolicy())).rejects.toThrow(
      /does not match its hash/,
    );
    expect(calls).toHaveLength(0);
  });

  it('re-checks policy at commit time rather than trusting the staged tier', async () => {
    const { client, calls } = harness();
    const staged = await stage(client);

    // The financial switch is withdrawn between staging and committing.
    delete process.env.PRODUCTIVE_ENABLE_FINANCIALS;
    await expect(commitOperation(client, staged, { policy: loadPolicy() })).rejects.toThrow(
      /PRODUCTIVE_ENABLE_FINANCIALS/,
    );
    expect(calls).toHaveLength(0);
  });

  it('derives the tier from the registry, not from the payload', async () => {
    const { client, calls } = harness();
    const staged = await stage(client);
    // Claiming a lower tier does not help, because the hash covers it...
    const downgraded = { ...staged, tier: 'write' as const };
    await expect(commitOperation(client, downgraded, openPolicy())).rejects.toThrow(
      /does not match its hash/,
    );
    expect(calls).toHaveLength(0);
  });
});

describe('time tracking', () => {
  const identity = {
    email: 'abo@example.com',
    personId: '900001',
    resolved: true,
  };

  it('converts hours to the minutes Productive stores', async () => {
    const { client, calls } = harness([{ data: { id: '1', type: 'time_entries', attributes: {} } }]);
    await trackTime(
      client,
      { date: '2026-08-27', hours: 2, serviceId: '42' },
      { ...openPolicy(), identity },
    );

    const body = calls[0]?.body as { data: { attributes: Record<string, unknown> } };
    expect(body.data.attributes.time).toBe(120);
    expect(body.data.attributes.person_id).toBe('900001');
  });

  it('books against the caller rather than the token owner', async () => {
    const { client, calls } = harness([{ data: { id: '1', type: 'time_entries', attributes: {} } }]);
    await trackTime(
      client,
      { date: '2026-08-27', minutes: 30, serviceId: '42' },
      { ...openPolicy(), identity },
    );
    const body = calls[0]?.body as { data: { attributes: Record<string, unknown> } };
    expect(body.data.attributes.person_id).toBe('900001');
  });

  it('resolves the service from the task, since time bills to a budget line', async () => {
    const { client, calls } = harness([
      {
        data: {
          id: '19803490',
          type: 'tasks',
          attributes: { title: 'x' },
          relationships: { service: { data: { id: '555', type: 'services' } } },
        },
      },
      { data: { id: '1', type: 'time_entries', attributes: {} } },
    ]);

    await trackTime(
      client,
      { date: '2026-08-27', minutes: 45, taskId: '19803490' },
      { ...openPolicy(), identity },
    );

    expect(calls[0]?.url).toContain('/tasks/19803490');
    const body = calls[1]?.body as { data: { attributes: Record<string, unknown> } };
    expect(body.data.attributes.service_id).toBe('555');
    expect(body.data.attributes.task_id).toBe('19803490');
  });

  it('says so plainly when the task has no service to bill to', async () => {
    const { client } = harness([
      { data: { id: '1', type: 'tasks', attributes: {}, relationships: {} } },
    ]);
    await expect(
      trackTime(client, { date: '2026-08-27', minutes: 45, taskId: '1' }, { ...openPolicy(), identity }),
    ).rejects.toThrow(/no service attached/);
  });

  it('will not guess a person when the caller is unknown', async () => {
    const { client, calls } = harness();
    await expect(
      trackTime(client, { date: '2026-08-27', minutes: 45, serviceId: '42' }, openPolicy()),
    ).rejects.toThrow(/No person to log against/);
    expect(calls).toHaveLength(0);
  });

  it('rejects an ambiguous amount instead of picking one', async () => {
    const { client } = harness();
    await expect(
      trackTime(
        client,
        { date: '2026-08-27', minutes: 30, hours: 2, serviceId: '42' },
        { ...openPolicy(), identity },
      ),
    ).rejects.toThrow(/either minutes or hours/);
  });
});

describe('gates', () => {
  it('blocks a financial read on a scoped instance', async () => {
    process.env.PRODUCTIVE_ALLOWED_RESOURCES = 'tasks,time_entries';
    const { client, calls } = harness();
    await expect(
      listRecords(client, { resource: 'salaries' }, { policy: loadPolicy() }),
    ).rejects.toThrow(/not in PRODUCTIVE_ALLOWED_RESOURCES/);
    expect(calls).toHaveLength(0);
  });

  it('names the switch that would allow a refused write', async () => {
    const { client } = harness();
    await expect(
      createRecord(client, { resource: 'tasks', attributes: {} }, { policy: loadPolicy() }),
    ).rejects.toThrow(/PRODUCTIVE_ENABLE_WRITES/);
  });

  it('reads without any switch at all', async () => {
    const { client } = harness([{ data: [], meta: { total_count: 0 } }]);
    await expect(
      getRecord(client, { resource: 'tasks', id: '1' }, { policy: loadPolicy() }),
    ).resolves.not.toThrow();
  });
});
