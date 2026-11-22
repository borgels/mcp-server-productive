import { existsSync, mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import {
  callerPseudonym,
  createProductiveGateway,
  GatewayConfigError,
  PRODUCTIVE_DEFAULT_BASE_URL,
  productiveGatewayTools,
  productiveToolCatalog,
  type GatewayJsonObject,
  type ProductiveGatewayOptions,
} from '../src/gateway.js';
import { GATEWAY_TOOLS } from '../src/gateway-tools.js';
import { admitsKey } from '../src/key-admission.js';
import { findResource } from '../src/productive/registry.js';
import {
  BASE,
  defaultAnswer,
  fakeProductive,
  jsonApi,
  ORG_A,
  ORG_B,
  pieces,
  sink,
  TOKEN_A,
  TOKEN_B,
  type RecordedRequest,
} from './gateway-helpers.js';

let dir: string;

beforeEach(() => {
  dir = mkdtempSync(join(tmpdir(), 'productive-gateway-'));
  // The MCP server's variables, set as a shared process would have them: an embedded instance must ignore them all.
  process.env.PRODUCTIVE_API_TOKEN = 'env-token-must-not-be-used-000000';
  process.env.PRODUCTIVE_ORGANIZATION_ID = '11111';
  process.env.PRODUCTIVE_BASE_URL = 'https://env-base.example.test/api/v2';
  // Not a number: an instance that read it would throw.
  process.env.PRODUCTIVE_TIMEOUT_MS = 'not-a-number';
  process.env.PRODUCTIVE_ENABLE_WRITES = 'true';
  process.env.PRODUCTIVE_ENABLE_FINANCIALS = 'true';
  process.env.PRODUCTIVE_ENABLE_ADMIN = 'true';
  process.env.PRODUCTIVE_ENABLE_DELETES = 'true';
  process.env.PRODUCTIVE_AUDIT_LOG = join(dir, 'audit.log');
  process.env.PRODUCTIVE_POLICY_PATH = join(dir, 'missing-policy.json');
  process.env.PRODUCTIVE_PER_USER_AUTH = 'true';
});

const ENV_NAMES = [
  'PRODUCTIVE_API_TOKEN',
  'PRODUCTIVE_ORGANIZATION_ID',
  'PRODUCTIVE_BASE_URL',
  'PRODUCTIVE_TIMEOUT_MS',
  'PRODUCTIVE_ENABLE_WRITES',
  'PRODUCTIVE_ENABLE_FINANCIALS',
  'PRODUCTIVE_ENABLE_ADMIN',
  'PRODUCTIVE_ENABLE_DELETES',
  'PRODUCTIVE_AUDIT_LOG',
  'PRODUCTIVE_POLICY_PATH',
  'PRODUCTIVE_PER_USER_AUTH',
];

afterEach(() => {
  for (const name of ENV_NAMES) delete process.env[name];
  rmSync(dir, { recursive: true, force: true });
});

function gateway(fake = fakeProductive(), options: Partial<ProductiveGatewayOptions> = {}) {
  return createProductiveGateway({ apiToken: TOKEN_A, organizationId: ORG_A, baseUrl: BASE, fetchImpl: fake.fetchImpl, ...options });
}

/** One valid input per tool, enough to run it against the fake. */
const SAMPLE_INPUT: Record<string, GatewayJsonObject> = {
  search_capabilities: { query: 'task' },
  check_connection: {},
  list_projects: { query: 'lager', companyId: '31' },
  get_project: { projectId: '701' },
  list_tasks: { projectId: '701', open: true },
  get_task: { taskId: '9001' },
  list_people: { query: 'bo' },
  list_companies: {},
  list_budgets: { projectId: '701', open: true },
  get_budget: { budgetId: '801' },
  list_services: { budgetId: '801' },
  list_time_entries: { after: '2026-11-01', before: '2026-11-30', personId: '11' },
  time_report: { after: '2026-01-01', before: '2026-12-31', groupBy: 'person' },
  create_task: { projectId: '701', title: 'Ny opgave' },
  update_task: { taskId: '9001', title: 'Nyt navn', dueDate: '2026-12-24' },
  add_comment: { taskId: '9001', body: 'Klar' },
  track_time: { personId: '11', date: '2026-11-19', hours: 1.5, taskId: '9001', note: 'Montage' },
};

function templateMatches(template: string, path: string): boolean {
  const pattern = template.replace(/[.*+?^$()|[\]\\]/g, '\\$&').replace(/\\?\{[^}]+\\?\}|\{[^}]+\}/g, '[^/]+');
  return new RegExp(`^${pattern}$`).test(path);
}

describe('tool catalog', () => {
  it('is deeply frozen and matches the definitions and the handlers', () => {
    expect(Object.isFrozen(productiveToolCatalog)).toBe(true);
    for (const entry of productiveToolCatalog) {
      expect(Object.isFrozen(entry)).toBe(true);
      expect(Object.isFrozen(entry.inputSchema)).toBe(true);
      expect(Object.isFrozen(entry.upstream)).toBe(true);
      for (const operation of entry.upstream) expect(Object.isFrozen(operation)).toBe(true);
    }
    expect(() => {
      (productiveToolCatalog[0] as { name: string }).name = 'x';
    }).toThrow();
    expect(productiveToolCatalog.map(({ upstream: _u, broad: _b, ...definition }) => definition)).toEqual(
      productiveGatewayTools,
    );
    expect(productiveToolCatalog.map(entry => entry.name)).toEqual(GATEWAY_TOOLS.map(tool => tool.name));
    expect(Object.keys(SAMPLE_INPUT).sort()).toEqual(productiveToolCatalog.map(entry => entry.name).sort());
  });

  it('has exactly the narrow tools: reads on by default, four writes off by default, nothing broad', () => {
    const names = productiveToolCatalog.map(entry => entry.name);
    expect(names.every(name => !name.startsWith('productive_'))).toBe(true);
    expect(productiveToolCatalog.filter(entry => entry.riskLevel === 'write').map(entry => entry.name).sort()).toEqual([
      'add_comment',
      'create_task',
      'track_time',
      'update_task',
    ]);
    for (const entry of productiveToolCatalog) {
      expect(entry.riskLevel).not.toBe('destructive');
      expect(entry.enabledByDefault).toBe(entry.riskLevel === 'read');
      expect(entry.broad).toBe(false);
      expect(entry.inputSchema.type).toBe('object');
      expect(entry.inputSchema.additionalProperties).toBe(false);
      for (const operation of entry.upstream) {
        expect(['GET', 'POST', 'PATCH']).toContain(operation.method);
        if (entry.riskLevel === 'read') expect(operation.method).toBe('GET');
      }
    }
    for (const forbidden of ['list', 'get', 'create', 'update', 'delete', 'run_action', 'commit_operation', 'connect']) {
      expect(names).not.toContain(forbidden);
    }
    expect(names.some(name => name.includes('delete'))).toBe(false);
  });

  it('writes only standard-tier resources, and reads admin resources only as fixed projections', () => {
    for (const tool of GATEWAY_TOOLS) {
      for (const key of tool.resources) {
        const resource = findResource(key);
        expect(resource, key).toBeDefined();
        if (resource?.tier === 'financial') throw new Error(`${tool.name} touches financial resource ${key}`);
        if (resource?.tier === 'admin') {
          expect(tool.riskLevel, `${tool.name} ${key}`).toBe('read');
          expect(['users', 'organizations', 'people']).toContain(key);
        }
      }
      if (tool.riskLevel === 'write') {
        for (const operation of tool.upstream.filter(operation => operation.method !== 'GET')) {
          const key = operation.path.split('/')[1] ?? '';
          expect(findResource(key)?.tier, `${tool.name} ${operation.path}`).toBe('write');
        }
      }
    }
  });

  it('calls only the declared upstream paths, with the instance credentials, for every tool', async () => {
    const fake = fakeProductive();
    const instance = gateway(fake, { policy: { enableWrites: true } });
    for (const entry of productiveToolCatalog) {
      fake.requests.length = 0;
      const result = await instance.callTool(entry.name, SAMPLE_INPUT[entry.name] ?? {});
      expect(result.isError, `${entry.name}: ${result.content[0]?.text}`).toBeUndefined();
      for (const request of fake.requests) {
        expect(
          entry.upstream.some(operation => operation.method === request.method && templateMatches(operation.path, request.path)),
          `${entry.name}: ${request.method} ${request.path}`,
        ).toBe(true);
        expect(request.headers['x-auth-token']).toBe(TOKEN_A);
        expect(request.headers['x-organization-id']).toBe(ORG_A);
      }
      if (entry.upstream.length === 0) expect(fake.requests).toHaveLength(0);
    }
    expect(fake.fetchImpl).toHaveBeenCalled();
  });

  it('refuses unknown fields and invalid values before anything is sent', async () => {
    const fake = fakeProductive();
    const instance = gateway(fake);
    for (const [name, input] of [
      ['list_projects', { status: 2 }],
      ['get_project', { projectId: '../users' }],
      ['get_task', { taskId: 9001 }],
      ['list_time_entries', { after: '2026-02-30', before: '2026-03-01' }],
      ['time_report', { after: '2026-01-01', before: '2026-01-31', groupBy: 'organization' }],
    ] as const) {
      const result = await instance.callTool(name, input as GatewayJsonObject);
      expect(result.isError).toBe(true);
      expect(result.content[0]?.text).toMatch(new RegExp(`^Invalid input for ${name}:`));
    }
    const long = await instance.callTool('list_time_entries', { after: '2025-01-01', before: '2026-06-01' });
    expect(long.content[0]?.text).toBe('The period may span at most one year.');
    const reversed = await instance.callTool('time_report', { after: '2026-02-01', before: '2026-01-01', groupBy: 'project' });
    expect(reversed.content[0]?.text).toBe('before must not be earlier than after.');
    expect(fake.requests).toHaveLength(0);
  });
});

describe('credentials and options', () => {
  it('reads no PRODUCTIVE_* variable: credentials, address, timeout, policy and audit come from the host', async () => {
    const fake = fakeProductive();
    const instance = gateway(fake);
    expect((await instance.callTool('get_project', { projectId: '701' })).isError).toBeUndefined();
    // PRODUCTIVE_ENABLE_WRITES=true in the environment does not enable writes.
    const write = await instance.callTool('create_task', { projectId: '701', title: 'x' });
    expect(write.content[0]?.text).toBe('The tool create_task changes data, and writes are disabled on this instance.');
    const enabled = gateway(fake, { policy: { enableWrites: true } });
    expect((await enabled.callTool('create_task', { projectId: '701', title: 'x' })).isError).toBeUndefined();
    expect(fake.requests.every(request => request.headers['x-auth-token'] === TOKEN_A)).toBe(true);
    expect(fake.requests.every(request => request.headers['x-organization-id'] === ORG_A)).toBe(true);
    expect(fake.fetchImpl.mock.calls.every(([url]) => String(url).startsWith(BASE))).toBe(true);
    expect(existsSync(join(dir, 'audit.log'))).toBe(false);
  });

  it("defaults to Productive's address and 30 seconds", async () => {
    expect(PRODUCTIVE_DEFAULT_BASE_URL).toBe('https://api.productive.io/api/v2');
    const fake = fakeProductive(request => defaultAnswer(request), PRODUCTIVE_DEFAULT_BASE_URL);
    const instance = createProductiveGateway({ apiToken: TOKEN_A, organizationId: ORG_A, fetchImpl: fake.fetchImpl });
    await instance.callTool('check_connection', {});
    expect(String(fake.fetchImpl.mock.calls[0]?.[0])).toBe(`${PRODUCTIVE_DEFAULT_BASE_URL}/users`);
    expect(fake.fetchImpl.mock.calls[0]?.[1]?.signal).toBeInstanceOf(AbortSignal);
  });

  it('refuses missing, short and malformed credentials and options with GatewayConfigError', () => {
    expect(admitsKey(TOKEN_A)).toBe(true);
    expect(admitsKey(TOKEN_B)).toBe(true);
    const cases: Array<[Partial<ProductiveGatewayOptions>, RegExp]> = [
      [{ apiToken: '', organizationId: ORG_A }, /requires options\.apiToken and options\.organizationId/],
      [{ apiToken: TOKEN_A }, /requires options\.apiToken and options\.organizationId/],
      [{ apiToken: 'short-token', organizationId: ORG_A }, /^options\.apiToken: The key was refused/],
      [{ apiToken: TOKEN_A, organizationId: 'acme' }, /organizationId must be the numeric Productive organization id/],
      [{ apiToken: TOKEN_A, organizationId: ORG_A, baseUrl: 'http://api.productive.io/api/v2' }, /baseUrl must be an https:\/\//],
      [{ apiToken: TOKEN_A, organizationId: ORG_A, baseUrl: `https://user:pw@example.test` }, /baseUrl must be/],
      [{ apiToken: TOKEN_A, organizationId: ORG_A, timeoutMs: 0 }, /timeoutMs must be an integer/],
      [{ apiToken: TOKEN_A, organizationId: ORG_A, policy: { enableWrites: 'yes' as never } }, /enableWrites must be a boolean/],
      [{ apiToken: TOKEN_A, organizationId: ORG_A, policy: { disabledTools: ['list'] } }, /disabledTools\[0\] is not a known gateway tool/],
    ];
    for (const [options, message] of cases) {
      let thrown: unknown;
      try {
        createProductiveGateway(options as ProductiveGatewayOptions);
      } catch (error) {
        thrown = error;
      }
      expect(thrown, String(message)).toBeInstanceOf(GatewayConfigError);
      expect((thrown as Error).message).toMatch(message);
      expect((thrown as Error).cause).toBeUndefined();
      expect((thrown as Error).stack).toBe(`GatewayConfigError: ${(thrown as Error).message}`);
    }
  });

  it('never repeats a piece of a refused token in the refusal', () => {
    for (const token of ['short-token', 'Withheld: the answer held', `${TOKEN_A}‹`, 'Productive API request failed']) {
      try {
        createProductiveGateway({ apiToken: token, organizationId: ORG_A });
        throw new Error('not refused');
      } catch (error) {
        const { message, stack } = error as Error;
        for (const piece of pieces(token)) {
          expect(message).not.toContain(piece);
          expect(stack).not.toContain(piece);
        }
      }
    }
  });
});

describe('instance policy', () => {
  it('leaves disabled tools out of the list and refuses them', async () => {
    const fake = fakeProductive();
    const instance = gateway(fake, { policy: { disabledTools: ['list_people', 'productive_time_report'] } });
    expect(instance.tools.map(tool => tool.name)).not.toContain('list_people');
    expect(instance.tools.map(tool => tool.name)).not.toContain('time_report');
    expect(instance.tools).toHaveLength(productiveGatewayTools.length - 2);
    const refused = await instance.callTool('list_people', {});
    expect(refused).toEqual({ isError: true, content: [{ type: 'text', text: 'The tool list_people is disabled on this instance.' }] });
    const search = await instance.callTool('search_capabilities', { query: 'people report time' });
    const found = (search.structuredContent as { tools: Array<{ name: string }> }).tools.map(tool => tool.name);
    expect(found).not.toContain('list_people');
    expect(found).not.toContain('time_report');
    expect(found).toContain('list_time_entries');
    expect(fake.requests).toHaveLength(0);
  });

  it('accepts names with or without the prefix and refuses unknown tools without repeating the name', async () => {
    const instance = gateway();
    expect((await instance.callTool('productive_get_project', { projectId: '701' })).isError).toBeUndefined();
    const unknown = await instance.callTool('productive_delete', { resource: 'tasks', id: '1' });
    expect(unknown).toEqual({ isError: true, content: [{ type: 'text', text: 'Unsupported Productive gateway tool.' }] });
  });

  it('runs writes only when the host enables them, and sends exactly the narrow body', async () => {
    const fake = fakeProductive();
    const instance = gateway(fake, { policy: { enableWrites: true } });
    const created = await instance.callTool('create_task', { projectId: '701', title: 'Ny opgave', assigneeId: '11' });
    expect(created.isError).toBeUndefined();
    const post = fake.requests.find(request => request.method === 'POST');
    expect(post?.path).toBe('/tasks');
    expect(post?.body).toEqual({
      data: { type: 'tasks', attributes: { project_id: '701', task_list_id: '120', title: 'Ny opgave', assignee_id: '11' } },
    });
    expect(fake.requests[0]?.query.get('filter[project_id]')).toBe('701');

    fake.requests.length = 0;
    const logged = await instance.callTool('track_time', SAMPLE_INPUT.track_time!);
    expect(logged.isError).toBeUndefined();
    expect(fake.requests.map(request => `${request.method} ${request.path}`)).toEqual(['GET /tasks/9001', 'POST /time_entries']);
    expect((fake.requests[1]?.body as { data: { attributes: unknown } }).data.attributes).toEqual({
      date: '2026-11-19',
      time: 90,
      person_id: '11',
      service_id: '555',
      note: 'Montage',
      task_id: '9001',
    });

    const noPerson = await instance.callTool('track_time', { date: '2026-11-19', minutes: 30, serviceId: '555' });
    expect(noPerson.content[0]?.text).toBe('Give personId: the person the time is logged for.');
    const both = await instance.callTool('track_time', { personId: '11', date: '2026-11-19', minutes: 30, hours: 1, serviceId: '555' });
    expect(both.content[0]?.text).toBe('Give either minutes or hours.');
    const nothing = await instance.callTool('update_task', { taskId: '9001' });
    expect(nothing.content[0]?.text).toBe('Give at least one field to change.');
  });

  it('writes audit records to the host sink only, with the caller as a pseudonym, start before the request', async () => {
    const audit = sink();
    const order: string[] = [];
    const fake = fakeProductive(request => {
      order.push(`request ${request.method} ${request.path}`);
      return defaultAnswer(request);
    });
    const instance = gateway(fake, {
      policy: {
        enableWrites: true,
        audit: record => {
          order.push(`audit ${String(record.action)}`);
          audit.audit(record);
        },
      },
    });
    await instance.callTool('add_comment', { taskId: '9001', body: 'Klar' }, { caller: 'bo@example.test', requestId: 'host-1' });
    expect(order).toEqual(['audit start', 'request POST /comments', 'audit finish']);
    const [start, finish] = audit.records;
    expect(start).toMatchObject({ tool: 'productive_add_comment', action: 'start', caller: callerPseudonym('bo@example.test') });
    expect(String(start?.caller)).toMatch(/^hmac:[0-9a-f]{16}$/);
    expect(start?.requestId).toBe(finish?.requestId);
    expect(start?.requestId).not.toBe('host-1');
    expect(JSON.stringify(audit.records)).not.toContain('bo@example.test');
    expect(JSON.stringify(audit.records)).not.toContain('Klar');
    expect(existsSync(join(dir, 'audit.log'))).toBe(false);
  });

  it('refuses the call when the sink refuses the start record', async () => {
    const fake = fakeProductive();
    const instance = gateway(fake, {
      policy: {
        enableWrites: true,
        audit: () => {
          throw new Error(`sink down ${TOKEN_A}`);
        },
      },
    });
    const result = await instance.callTool('create_task', { projectId: '701', title: 'x' });
    expect(result).toEqual({
      isError: true,
      content: [{ type: 'text', text: 'The audit record could not be written, so the call was not run.' }],
    });
    expect(fake.requests).toHaveLength(0);
  });
});

describe('tenants', () => {
  it('keeps two instances in one process apart, in parallel', async () => {
    const auditA = sink();
    const auditB = sink();
    const fakeA = fakeProductive(async request => {
      await new Promise(resolve => setTimeout(resolve, 5));
      return defaultAnswer(request, ORG_A);
    });
    const fakeB = fakeProductive(request => defaultAnswer(request, ORG_B));
    const a = gateway(fakeA, { policy: { audit: auditA.audit } });
    const b = createProductiveGateway({
      apiToken: TOKEN_B,
      organizationId: ORG_B,
      baseUrl: BASE,
      fetchImpl: fakeB.fetchImpl,
      policy: { audit: auditB.audit, disabledTools: ['list_people'] },
    });
    const results = await Promise.all([
      a.callTool('check_connection', {}, { caller: 'a' }),
      b.callTool('check_connection', {}, { caller: 'b' }),
      a.callTool('list_people', {}),
      b.callTool('list_people', {}),
    ]);
    expect(results[0]?.structuredContent).toEqual({ connected: true, tokenOwner: 'Anna Holm', organization: 'Testfirma' });
    expect(results[2]?.isError).toBeUndefined();
    expect(results[3]?.content[0]?.text).toBe('The tool list_people is disabled on this instance.');
    expect(fakeA.requests.every(request => request.headers['x-auth-token'] === TOKEN_A && request.headers['x-organization-id'] === ORG_A)).toBe(true);
    expect(fakeB.requests.every(request => request.headers['x-auth-token'] === TOKEN_B && request.headers['x-organization-id'] === ORG_B)).toBe(true);
    expect(auditA.records.every(record => record.caller !== callerPseudonym('b'))).toBe(true);
    expect(auditB.records.every(record => record.caller !== callerPseudonym('a'))).toBe(true);
    expect(auditB.records.some(record => record.action === 'policy_denied')).toBe(true);
  });
});

describe('results', () => {
  it('returns a short summary and the compact JSON of structuredContent, projected', async () => {
    const instance = gateway();
    const result = await instance.callTool('get_task', { taskId: '9001' });
    const [block] = result.content;
    expect(block?.text).toBe(`Productive task.\n\n${JSON.stringify(result.structuredContent)}`);
    expect(result.structuredContent).toMatchObject({
      task: {
        id: '9001',
        title: 'Bestil reoler',
        project: { id: '701', name: null },
        assignee: { id: '11', name: 'Bo Berg' },
        service: { id: '555', name: 'Montage' },
        workedMinutes: 90,
      },
      commentsTotal: 1,
      comments: [{ id: '61', body: 'Bestilt', author: { id: '11', name: 'Bo Berg' } }],
    });
    const people = await instance.callTool('list_people', {});
    expect(people.structuredContent).toEqual({
      total: 1,
      page: 1,
      nextPage: null,
      people: [{ id: '11', name: 'Bo Berg', title: 'Konsulent', email: 'bo@example.test', active: true }],
    });
    // Salary-derived figures never leave: cost, profit, revenue.
    for (const [name, input] of [
      ['list_people', {}],
      ['get_budget', { budgetId: '801' }],
      ['list_time_entries', SAMPLE_INPUT.list_time_entries],
      ['time_report', SAMPLE_INPUT.time_report],
      ['list_services', {}],
    ] as const) {
      const text = (await instance.callTool(name, input as GatewayJsonObject)).content[0]?.text ?? '';
      expect(text, name).not.toMatch(/cost|profit|revenue|price/i);
    }
    const report = await instance.callTool('time_report', SAMPLE_INPUT.time_report!);
    expect(report.structuredContent).toMatchObject({
      groupBy: 'person',
      rows: [{ person: { id: '11', name: 'Bo Berg' }, count: 3, workedMinutes: 300, billableMinutes: 240 }],
    });
    const notBudget = await instance.callTool('get_budget', { budgetId: '802' });
    expect(notBudget.content[0]?.text).toBe('No budget with this id.');
  });

  it("asks Productive only for the instance's organization in check_connection and names no other", async () => {
    const result = await gateway().callTool('check_connection', {});
    expect(JSON.stringify(result)).not.toContain('Andet firma');
    expect(JSON.stringify(result)).not.toContain('anna@example.test');
  });

  it('redacts the token and the organization id that Productive echoes', async () => {
    const fake = fakeProductive(request =>
      request.path === '/projects/701'
        ? {
            data: {
              id: '701',
              type: 'projects',
              attributes: { name: `Org ${ORG_A} på ${BASE}/${ORG_A}/x, år 2026-11-20`, project_number: `${TOKEN_A.slice(3, 15)}` },
            },
          }
        : defaultAnswer(request),
    );
    const result = await gateway(fake).callTool('get_project', { projectId: '701' });
    const text = JSON.stringify(result);
    expect(text).not.toContain(ORG_A);
    for (const piece of pieces(TOKEN_A)) expect(text).not.toContain(piece);
    expect(result.structuredContent).toMatchObject({
      project: { name: `Org ‹redacted› på ${BASE}/‹redacted›/x, år 2026-11-20`, projectNumber: '‹redacted›' },
    });
  });
});

describe('errors', () => {
  const failing = (status: number, headers: Record<string, string> = {}) =>
    fakeProductive(() =>
      jsonApi(
        { errors: [{ status: String(status), code: 'secret_code', detail: `Productive says no to ${ORG_A}`, title: 'Leak me' }] },
        status,
        { 'x-request-id': 'req-abc-123', ...headers },
      ),
    );

  it('reports HTTP failures in our own words, status first, never with Productive text', async () => {
    const expected: Array<[number, string]> = [
      [400, 'Productive API request failed with HTTP 400. Productive refused the request.'],
      [401, 'Productive API request failed with HTTP 401. The API token was refused.'],
      [403, 'Productive API request failed with HTTP 403. The token has no access to this organization or this record.'],
      [404, 'Productive API request failed with HTTP 404. The record does not exist, or the feature is not enabled for the organization.'],
      [422, 'Productive API request failed with HTTP 422. Productive could not apply the change: a value is missing or not valid.'],
      [500, 'Productive API request failed with HTTP 500. Productive had an error; try again later.'],
      [418, 'Productive API request failed with HTTP 418.'],
    ];
    for (const [status, text] of expected) {
      const audit = sink();
      const result = await gateway(failing(status), { policy: { audit: audit.audit } }).callTool('get_project', { projectId: '701' });
      expect(result).toEqual({ isError: true, content: [{ type: 'text', text }], failure: { httpStatus: status } });
      expect(audit.records.at(-1)).toMatchObject({ action: 'error', error: `http_${status}` });
      expect(JSON.stringify(audit.records)).not.toMatch(/Leak me|secret_code|req-abc/);
    }
    const limited = await gateway(failing(429, { 'retry-after': '30' })).callTool('list_tasks', {});
    expect(limited.content[0]?.text).toBe(
      'Productive API request failed with HTTP 429. Rate limited by Productive; try again later. Retry after 30 seconds.',
    );
  });

  it('reports redirects, timeouts and network errors without the address', async () => {
    const redirect = fakeProductive(() => new Response(null, { status: 302, headers: { location: 'https://evil.example.test/' } }));
    expect((await gateway(redirect).callTool('list_tasks', {})).content[0]?.text).toBe(
      'Productive API request failed with HTTP 302. Redirects are not followed.',
    );
    const timeout = fakeProductive(() => {
      throw new DOMException('The operation was aborted due to timeout', 'TimeoutError');
    });
    expect((await gateway(timeout).callTool('list_tasks', {})).content[0]?.text).toBe('Productive API request timed out.');
    const network = fakeProductive(() => {
      throw new TypeError(`fetch failed for ${BASE}`);
    });
    expect((await gateway(network).callTool('list_tasks', {})).content[0]?.text).toBe('Network error calling the Productive API.');
  });

  it('explains a task without a service in our own words', async () => {
    const fake = fakeProductive((request: RecordedRequest) =>
      request.path === '/tasks/9001' ? { data: { id: '9001', type: 'tasks', attributes: { title: 't' } } } : defaultAnswer(request),
    );
    const result = await gateway(fake, { policy: { enableWrites: true } }).callTool('track_time', {
      personId: '11',
      date: '2026-11-19',
      minutes: 15,
      taskId: '9001',
    });
    expect(result.content[0]?.text).toMatch(/^Task 9001 has no service attached/);
    expect(fake.requests.some(request => request.method === 'POST')).toBe(false);
  });
});
