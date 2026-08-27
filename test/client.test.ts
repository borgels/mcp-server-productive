import { describe, expect, it, vi } from 'vitest';
import { MAX_PAGE_SIZE, ProductiveClient } from '../src/productive/client.js';
import { ProductiveHttpError } from '../src/errors.js';

interface Call {
  url: string;
  method?: string;
  headers: Record<string, string>;
  body?: string;
}

function makeClient(
  respond: (call: Call) => Response = () =>
    new Response(JSON.stringify({ data: [] }), {
      status: 200,
      headers: { 'content-type': 'application/vnd.api+json' },
    }),
) {
  const calls: Call[] = [];
  const fetchImpl = vi.fn(async (input: string | URL | Request, init?: RequestInit) => {
    const call: Call = {
      url: String(input),
      method: init?.method,
      headers: Object.fromEntries(new Headers(init?.headers).entries()),
      body: init?.body ? String(init.body) : undefined,
    };
    calls.push(call);
    return respond(call);
  }) as unknown as typeof fetch;

  const client = new ProductiveClient({
    apiToken: 'token-abc',
    organizationId: '12345',
    fetchImpl,
  });
  return { client, calls };
}

describe('authentication', () => {
  it('sends both headers Productive requires, and the JSON:API content type', async () => {
    const { client, calls } = makeClient();
    await client.request({ path: '/projects' });

    expect(calls[0]?.headers['x-auth-token']).toBe('token-abc');
    expect(calls[0]?.headers['x-organization-id']).toBe('12345');
    expect(calls[0]?.headers['content-type']).toBe('application/vnd.api+json');
  });

  it('refuses to run without a token or an organization', async () => {
    const noToken = new ProductiveClient({ organizationId: '1', apiToken: '' });
    await expect(noToken.request({ path: '/projects' })).rejects.toThrow(/PRODUCTIVE_API_TOKEN/);

    const noOrg = new ProductiveClient({ apiToken: 't', organizationId: '' });
    await expect(noOrg.request({ path: '/projects' })).rejects.toThrow(
      /PRODUCTIVE_ORGANIZATION_ID/,
    );
  });

  it('will not send a token over plain http to a remote host', () => {
    expect(
      () => new ProductiveClient({ apiToken: 't', organizationId: '1', baseUrl: 'http://api.example.com' }),
    ).toThrow(/Refusing to send a Productive API token/);
    // Loopback is allowed, so a local mock still works.
    expect(
      () => new ProductiveClient({ apiToken: 't', organizationId: '1', baseUrl: 'http://127.0.0.1:9' }),
    ).not.toThrow();
  });
});

describe('query building', () => {
  it('renders filters in the bracket forms Productive accepts', async () => {
    const { client, calls } = makeClient();
    await client.request({
      path: '/tasks',
      filters: {
        assignee_id: 5,
        id: ['1', '2'],
        created_at: { gt: '2026-01-01' },
      },
    });

    const url = new URL(calls[0]?.url ?? '');
    expect(url.searchParams.get('filter[assignee_id]')).toBe('5');
    // Arrays are comma-joined, not repeated — verified against the live API.
    expect(url.searchParams.get('filter[id]')).toBe('1,2');
    expect(url.searchParams.get('filter[created_at][gt]')).toBe('2026-01-01');
  });

  it('renders a nested logical group', async () => {
    const { client, calls } = makeClient();
    await client.request({
      path: '/tasks',
      filters: { $op: 'and', 0: { assignee_id: { eq: '5' } } },
    });

    const url = new URL(calls[0]?.url ?? '');
    expect(url.searchParams.get('filter[$op]')).toBe('and');
    expect(url.searchParams.get('filter[0][assignee_id][eq]')).toBe('5');
  });

  it('joins sort and include, and pages with the bracket parameters', async () => {
    const { client, calls } = makeClient();
    await client.request({
      path: '/tasks',
      sort: ['-created_at', 'title'],
      include: ['assignee', 'project'],
      page: { number: 3, size: 25 },
      group: 'person',
    });

    const url = new URL(calls[0]?.url ?? '');
    expect(url.searchParams.get('sort')).toBe('-created_at,title');
    expect(url.searchParams.get('include')).toBe('assignee,project');
    expect(url.searchParams.get('page[number]')).toBe('3');
    expect(url.searchParams.get('page[size]')).toBe('25');
    expect(url.searchParams.get('group')).toBe('person');
  });

  it('caps page size at the limit Productive silently clamps to', async () => {
    // Asking for 500 returns 200 records with no error, so a caller would
    // otherwise believe it got 500 and stop paging.
    const { client, calls } = makeClient();
    await client.request({ path: '/tasks', page: { size: 500 } });
    expect(new URL(calls[0]?.url ?? '').searchParams.get('page[size]')).toBe(String(MAX_PAGE_SIZE));
  });
});

describe('error mapping', () => {
  const jsonApiError = (status: number, body: unknown, requestId = 'req-1') =>
    new Response(JSON.stringify(body), {
      status,
      headers: { 'content-type': 'application/vnd.api+json', 'x-request-id': requestId },
    });

  it('unpacks the JSON:API error array into the message', async () => {
    const { client } = makeClient(() =>
      jsonApiError(400, {
        errors: [
          {
            status: 'unprocessable_content',
            code: 'unsupported_filter',
            title: 'Unsupported filter',
            detail: "Filter 'nope' is not supported on this endpoint",
            source: { parameter: 'filter[nope]' },
          },
        ],
      }),
    );

    await expect(client.request({ path: '/projects' })).rejects.toThrow(/unsupported_filter/);
    await expect(client.request({ path: '/projects' })).rejects.toThrow(/filter\[nope\]/);
    await expect(client.request({ path: '/projects' })).rejects.toThrow(/request id req-1/);
  });

  it('explains the 403 that means "not your organization"', async () => {
    // Productive answers a missing header and a foreign organization with the
    // same code and the same "has to be provided" text, so the message has to
    // say both are possible or it reads as a client bug.
    const { client } = makeClient(() =>
      jsonApiError(403, {
        errors: [
          {
            status: '403',
            code: 'no_organization_id',
            detail: 'The organizationId has to be provided in the X-Organization-Id header',
          },
        ],
      }),
    );

    await expect(client.request({ path: '/projects' })).rejects.toThrow(
      /token has no access to that organization/,
    );
  });

  it('explains a 404 that is really a feature the plan lacks', async () => {
    const { client } = makeClient(() => jsonApiError(404, {}));
    await expect(client.request({ path: '/boards' })).rejects.toThrow(/not enabled for the organization/);
  });

  it('keeps the status and code available for programmatic use', async () => {
    const { client } = makeClient(() =>
      jsonApiError(401, { errors: [{ code: 'invalid_auth_token' }] }),
    );

    const error = await client.request({ path: '/projects' }).catch((caught: unknown) => caught);
    expect(error).toBeInstanceOf(ProductiveHttpError);
    expect((error as ProductiveHttpError).status).toBe(401);
    expect((error as ProductiveHttpError).code).toBe('invalid_auth_token');
  });

  it('strips the query string from the reported url', async () => {
    // Filters routinely carry names and email addresses; there is no reason to
    // copy those into an error message.
    const { client } = makeClient(() => jsonApiError(500, {}));
    const error = await client
      .request({ path: '/people', filters: { email: 'someone@example.com' } })
      .catch((caught: unknown) => caught);
    expect((error as ProductiveHttpError).url).not.toContain('example.com');
    expect((error as ProductiveHttpError).message).not.toContain('example.com');
  });
});

describe('response handling', () => {
  it('normalises a 204 to an empty envelope', async () => {
    // Actions and deletes answer 204; callers should not have to tell "no
    // content" apart from "no data".
    const { client } = makeClient(() => new Response(null, { status: 204 }));
    await expect(client.request({ path: '/tasks/1', method: 'DELETE' })).resolves.toEqual({});
  });
});
