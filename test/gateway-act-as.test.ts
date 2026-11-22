import { describe, expect, it } from 'vitest';
import { ACT_AS_TEXTS, createProductiveGateway, productiveToolCatalog, type GatewayJsonObject } from '../src/gateway.js';
import { PERSON_MISMATCH } from '../src/gateway-tools.js';
import { LOOKUP_LIMIT } from '../src/productive/act-as-person.js';
import { BASE, defaultAnswer, fakeProductive, jsonApi, ORG_A, sink, TOKEN_A, type RecordedRequest } from './gateway-helpers.js';

const PERSON = { email: 'Mia.Lund@Example.test ', name: 'Mia Lund' };
const MIA = { id: '42', type: 'people', attributes: { first_name: 'Mia', last_name: 'Lund', email: 'mia.lund@example.test', status: 1 } };

function people(records: unknown[], total = records.length) {
  return { data: records, included: [], meta: { total_count: total, current_page: 1, total_pages: 1, page_size: LOOKUP_LIMIT } };
}

/** A fake Productive whose /people answers with `found`. */
function withPeople(found: unknown | ((request: RecordedRequest) => unknown)) {
  return fakeProductive(request =>
    request.method === 'GET' && request.path === '/people'
      ? typeof found === 'function'
        ? (found as (request: RecordedRequest) => unknown)(request)
        : found
      : defaultAnswer(request),
  );
}

function writer(fake: ReturnType<typeof fakeProductive>, audit = sink()) {
  return createProductiveGateway({
    apiToken: TOKEN_A,
    organizationId: ORG_A,
    baseUrl: BASE,
    fetchImpl: fake.fetchImpl,
    policy: { enableWrites: true, audit: audit.audit },
  });
}

const TRACK: GatewayJsonObject = { date: '2026-11-19', minutes: 90, taskId: '9001', note: 'Montage' };

describe('acting as a person (actAs)', () => {
  it('logs time for the person found by email, and finds them first', async () => {
    const fake = withPeople(people([MIA]));
    const result = await writer(fake).callTool('track_time', TRACK, { caller: 'p1', actAs: PERSON });
    expect(result.isError).toBeUndefined();
    expect(fake.requests.map(request => `${request.method} ${request.path}`)).toEqual([
      'GET /people',
      'GET /tasks/9001',
      'POST /time_entries',
    ]);
    const lookup = fake.requests[0]!;
    expect(lookup.query.get('filter[email]')).toBe('mia.lund@example.test');
    expect(lookup.query.get('filter[person_type]')).toBe('1');
    expect(lookup.query.get('page[size]')).toBe(String(LOOKUP_LIMIT));
    expect((fake.requests[2]?.body as { data: { attributes: Record<string, unknown> } }).data.attributes.person_id).toBe('42');
  });

  it('accepts the person own id as personId, and refuses anyone else before anything is written', async () => {
    const same = withPeople(people([MIA]));
    expect((await writer(same).callTool('track_time', { ...TRACK, personId: '42' }, { actAs: PERSON })).isError).toBeUndefined();

    const fake = withPeople(people([MIA]));
    const other = await writer(fake).callTool('track_time', { ...TRACK, personId: '11' }, { actAs: PERSON });
    expect(other).toEqual({ isError: true, content: [{ type: 'text', text: PERSON_MISMATCH }] });
    expect(fake.requests.map(request => request.method)).toEqual(['GET']);
  });

  it.each([
    ['nobody', people([])],
    ['two people with the address', people([MIA, { ...MIA, id: '43' }])],
    ['only an inactive person', people([{ ...MIA, attributes: { ...MIA.attributes, status: 2 } }])],
    ['another address only', people([{ ...MIA, attributes: { ...MIA.attributes, email: 'mia.lund@example.test.other' } }])],
    ['a result that is not whole', people([MIA], 2)],
    ['a full page', people(Array.from({ length: LOOKUP_LIMIT }, (_, i) => ({ ...MIA, id: String(100 + i) })))],
    ['an answer that is not a list', { data: MIA }],
  ])('changes nothing for %s: no_user', async (_label, answer) => {
    for (const [tool, input] of [
      ['track_time', TRACK],
      ['create_task', { projectId: '701', title: 'Ny' }],
      ['update_task', { taskId: '9001', title: 'Ny' }],
      ['add_comment', { taskId: '9001', body: 'Hej' }],
    ] as const) {
      const fake = withPeople(answer);
      const result = await writer(fake).callTool(tool, input as GatewayJsonObject, { actAs: PERSON });
      expect(result, tool).toEqual({ isError: true, content: [{ type: 'text', text: ACT_AS_TEXTS.no_user }], actAsRefused: 'no_user' });
      expect(fake.requests.map(request => `${request.method} ${request.path}`), tool).toEqual(['GET /people']);
    }
  });

  it('is not_permitted when Productive refuses the lookup (403), and nothing is written', async () => {
    const fake = withPeople(() => jsonApi({ errors: [{ status: '403', detail: 'mia.lund@example.test is secret' }] }, 403));
    const result = await writer(fake).callTool('add_comment', { taskId: '9001', body: 'Hej' }, { actAs: PERSON });
    expect(result).toEqual({ isError: true, content: [{ type: 'text', text: ACT_AS_TEXTS.not_permitted }], actAsRefused: 'not_permitted' });
    expect(fake.requests).toHaveLength(1);
  });

  it('refuses a malformed actAs before anything is sent, null included', async () => {
    for (const actAs of [null, {}, { email: 'not-an-address' }, { email: 'a@b.test', name: '' }, 'a@b.test']) {
      const fake = withPeople(people([MIA]));
      const result = await writer(fake).callTool('list_projects', {}, { actAs: actAs as never });
      expect(result).toEqual({ isError: true, content: [{ type: 'text', text: ACT_AS_TEXTS.invalid }], actAsRefused: 'invalid' });
      expect(fake.requests).toHaveLength(0);
    }
  });

  it('makes task and comment changes only after finding the person, and reads as the token owner', async () => {
    const fake = withPeople(people([MIA]));
    const instance = writer(fake);
    expect((await instance.callTool('create_task', { projectId: '701', title: 'Ny' }, { actAs: PERSON })).isError).toBeUndefined();
    expect((await instance.callTool('update_task', { taskId: '9001', title: 'Ny' }, { actAs: PERSON })).isError).toBeUndefined();
    expect((await instance.callTool('add_comment', { taskId: '9001', body: 'Hej' }, { actAs: PERSON })).isError).toBeUndefined();
    expect(fake.requests.map(request => `${request.method} ${request.path}`)).toEqual([
      'GET /people',
      'GET /task_lists',
      'POST /tasks',
      'GET /people',
      'PATCH /tasks/9001',
      'GET /people',
      'POST /comments',
    ]);
    fake.requests.length = 0;
    expect((await instance.callTool('list_time_entries', { after: '2026-11-01', before: '2026-11-30' }, { actAs: PERSON })).isError).toBeUndefined();
    expect(fake.requests.map(request => request.path)).toEqual(['/time_entries']);
  });

  it('never writes the email to the audit or a result, and keeps actAsRefused only on an error in form', async () => {
    const audit = sink();
    const fake = withPeople(people([]));
    const result = await writer(fake, audit).callTool('track_time', TRACK, { caller: 'p1', actAs: PERSON });
    expect(JSON.stringify(result)).not.toMatch(/mia/i);
    expect(JSON.stringify(audit.records)).not.toMatch(/mia/i);
    expect(audit.records.map(record => record.error).filter(Boolean)).toEqual(['act_as_no_user']);
  });

  it('runs as before without actAs: personId is then required', async () => {
    const fake = fakeProductive();
    const result = await writer(fake).callTool('track_time', { ...TRACK, personId: '11' });
    expect(result.isError).toBeUndefined();
    expect(fake.requests.map(request => request.path)).not.toContain('/people');
  });

  it('declares the lookup first in every write tool upstream', () => {
    for (const tool of productiveToolCatalog.filter(entry => entry.riskLevel === 'write')) {
      expect(tool.upstream[0], tool.name).toEqual({ method: 'GET', path: '/people' });
    }
  });
});
