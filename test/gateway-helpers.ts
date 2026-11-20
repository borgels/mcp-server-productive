import { vi } from 'vitest';

export const TOKEN_A = 'qqqqwwwwzzzzxxxx7';
export const TOKEN_B = 'jjjjkkkkvvvvyyyy8';
export const ORG_A = '48213';
export const ORG_B = '57190';
export const BASE = 'https://productive.example.test/api/v2';

export interface RecordedRequest {
  method: string;
  /** Path below the base URL. */
  path: string;
  query: URLSearchParams;
  headers: Record<string, string>;
  body?: unknown;
}

export function jsonApi(payload: unknown, status = 200, headers: Record<string, string> = {}): Response {
  return new Response(JSON.stringify(payload), {
    status,
    headers: { 'content-type': 'application/vnd.api+json', ...headers },
  });
}

const person = (id: string, first: string, last: string) => ({
  id,
  type: 'people',
  attributes: { first_name: first, last_name: last, email: `${first.toLowerCase()}@example.test`, title: 'Konsulent', status: 1, cost_rate: 99_900 },
});

/** A JSON:API answer per request, shaped like Productive's, for every path the gateway tools use. */
export function defaultAnswer(request: RecordedRequest, organizationId = ORG_A): unknown {
  const { method, path } = request;
  const list = (data: unknown[], included: unknown[] = []) => ({
    data,
    included,
    meta: { total_count: data.length, current_page: 1, total_pages: 1, page_size: 50 },
  });
  const projectRecord = {
    id: '701',
    type: 'projects',
    attributes: { name: 'Nyt lager', project_number: 'P-12', archived_at: null, last_activity_at: '2026-11-19T10:00:00Z' },
    relationships: { company: { data: { id: '31', type: 'companies' } }, organization: { data: { id: organizationId, type: 'organizations' } } },
  };
  const company = { id: '31', type: 'companies', attributes: { name: 'Testfirma ApS', company_code: 'TF' } };
  const taskRecord = {
    id: '9001',
    type: 'tasks',
    attributes: { title: 'Bestil reoler', task_number: '42', closed: false, due_date: '2026-12-01', description: 'Se tilbud', worked_time: 90 },
    relationships: {
      project: { data: { id: '701', type: 'projects' } },
      assignee: { data: { id: '11', type: 'people' } },
      service: { data: { id: '555', type: 'services' } },
    },
  };
  const budgetRecord = {
    id: '801',
    type: 'deals',
    attributes: { name: 'Lager 2026', budget: true, budget_total: 1_240_000, budget_used: 300_000, currency: 'DKK', cost: 99, profit: 1 },
  };
  if (method === 'GET') {
    switch (true) {
      case path === '/users':
        return list([{ id: '3', type: 'users', attributes: { first_name: 'Anna', last_name: 'Holm', email: 'anna@example.test' } }]);
      case path === '/organizations':
        return list([
          { id: organizationId, type: 'organizations', attributes: { name: 'Testfirma' } },
          { id: '99999', type: 'organizations', attributes: { name: 'Andet firma' } },
        ]);
      case path === '/projects':
        return list([projectRecord], [company]);
      case path === '/projects/701':
        return { data: projectRecord, included: [company] };
      case path === '/tasks':
        return list([taskRecord], [person('11', 'Bo', 'Berg')]);
      case path === '/tasks/9001':
        return { data: taskRecord, included: [person('11', 'Bo', 'Berg'), { id: '555', type: 'services', attributes: { name: 'Montage' } }] };
      case path === '/comments':
        return list(
          [{ id: '61', type: 'comments', attributes: { body: 'Bestilt', created_at: '2026-11-18T09:00:00Z' }, relationships: { creator: { data: { id: '11', type: 'people' } } } }],
          [person('11', 'Bo', 'Berg')],
        );
      case path === '/people':
        return list([person('11', 'Bo', 'Berg')]);
      case path === '/companies':
        return list([company]);
      case path === '/deals':
        return list([budgetRecord]);
      case path === '/deals/801':
        return { data: budgetRecord };
      case path === '/deals/802':
        return { data: { ...budgetRecord, id: '802', attributes: { ...budgetRecord.attributes, budget: false } } };
      case path === '/services':
        return list([{ id: '555', type: 'services', attributes: { name: 'Montage', time_tracking_enabled: true, price: 100 } }]);
      case path === '/time_entries':
        return list([{ id: '71', type: 'time_entries', attributes: { date: '2026-11-18', time: 120, billable_time: 60, note: 'Montage', cost: 500 } }]);
      case path === '/reports/time_reports':
        return list([{ id: 'r1', type: 'time_reports', attributes: { count: 3, worked_time: 300, billable_time: 240, cost: 9, revenue: 10 }, relationships: { person: { data: { id: '11', type: 'people' } } } }], [person('11', 'Bo', 'Berg')]);
      case path === '/task_lists':
        return list([{ id: '120', type: 'task_lists', attributes: { name: 'Indkøb' } }]);
      default:
        return { data: null };
    }
  }
  if (method === 'POST' && path === '/tasks') {
    return { data: { id: '9002', type: 'tasks', attributes: { title: (request.body as any)?.data?.attributes?.title } } };
  }
  if (method === 'PATCH' && path.startsWith('/tasks/')) {
    return { data: { ...taskRecord, attributes: { ...taskRecord.attributes, ...(request.body as any)?.data?.attributes } } };
  }
  if (method === 'POST' && path === '/comments') {
    return { data: { id: '62', type: 'comments', attributes: { body: (request.body as any)?.data?.attributes?.body } } };
  }
  if (method === 'POST' && path === '/time_entries') {
    return { data: { id: '72', type: 'time_entries', attributes: (request.body as any)?.data?.attributes } };
  }
  return { data: null };
}

/** A fake Productive: records every request and answers with `answer` (default: defaultAnswer). */
export function fakeProductive(
  answer: (request: RecordedRequest) => unknown | Response = request => defaultAnswer(request),
  base = BASE,
) {
  const requests: RecordedRequest[] = [];
  const fetchImpl = vi.fn<typeof fetch>(async (url, init) => {
    const parsed = new URL(String(url));
    const headers: Record<string, string> = {};
    new Headers(init?.headers).forEach((value, key) => {
      headers[key] = value;
    });
    const request: RecordedRequest = {
      method: init?.method ?? 'GET',
      path: parsed.pathname.slice(new URL(base).pathname.length),
      query: parsed.searchParams,
      headers,
      body: typeof init?.body === 'string' ? JSON.parse(init.body) : undefined,
    };
    requests.push(request);
    const result = await answer(request);
    return result instanceof Response ? result : jsonApi(result);
  });
  return { requests, fetchImpl };
}

export function sink() {
  const records: Array<Record<string, unknown>> = [];
  return { records, audit: (record: Readonly<Record<string, unknown>>) => void records.push({ ...record }) };
}

/** Every 6-character piece of a value. */
export function pieces(value: string): string[] {
  const out: string[] = [];
  for (let i = 0; i + 6 <= value.length; i += 1) out.push(value.slice(i, i + 6));
  return out;
}
