import { z } from 'zod/v4';
import { MAX_PAGE_SIZE, type FilterValue, type ProductiveClient, type ProductiveResponse } from './productive/client.js';
import { flattenCollection, flattenSingle, type FlatCollection, type FlatRecord } from './productive/jsonapi.js';
import { ActAsRefusedError } from './act-as.js';
import { personForChange } from './productive/act-as-person.js';
import type { ProductivePolicy } from './productive/policy.js';
import {
  createRecord,
  getRecord,
  listRecords,
  tokenOwner,
  trackTime,
  updateRecord,
  type WriteOutcome,
} from './productive/resources.js';

/**
 * The embeddable gateway's tools (src/gateway.ts): narrow, predictable tools,
 * each over a fixed Productive resource, built on the same list/get/create/
 * update/track-time logic as the MCP server (src/productive/resources.ts).
 *
 * Nothing here deletes, stages, runs an action, or writes a financial or
 * administrative resource. Every result is a fixed projection of the record:
 * people come back as name, title, mail and active flag; budgets, services,
 * time entries and reports leave out cost, profit, margin and revenue (they
 * are derived from salaries). Money that is kept (a budget's total and used)
 * is in the currency's minor units; time is in minutes.
 */

export type GatewayRiskLevel = 'read' | 'write' | 'destructive';

/** One Productive API request a tool may make: the method and the path template on the configured base URL. */
export interface GatewayUpstreamOperation {
  readonly method: 'GET' | 'POST' | 'PATCH';
  readonly path: string;
}

/** What a gateway tool's handler gets besides its input. */
export interface GatewayToolContext {
  client: ProductiveClient;
  /** The resource policy the shared logic checks: writes per the host, never financial, admin or delete. */
  policy: ProductivePolicy;
  /** The tools the instance offers (names without prefix); search_capabilities lists only these. */
  offered: ReadonlySet<string>;
}

export interface GatewayToolSpec {
  name: string;
  title: string;
  description: string;
  riskLevel: GatewayRiskLevel;
  /** The first line of a successful result's text. */
  summary: string;
  upstream: readonly GatewayUpstreamOperation[];
  broad?: boolean;
  /**
   * True for a self tool: it works only on the Productive person of the person in `actAs` (found by email) and is
   * refused without one. False (absent) for every other tool.
   */
  self?: boolean;
  /** Registry resources the tool reads or writes; a write tool's must all be of the standard (`write`) tier. */
  resources: readonly string[];
  input: z.ZodObject;
  handler(input: Record<string, unknown>, context: GatewayToolContext): Promise<unknown>;
}

/** A refusal in our own words, about the caller's input: its message is returned as it is. */
export class GatewayInputError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'GatewayInputError';
  }
}

const get = (path: string): GatewayUpstreamOperation => ({ method: 'GET', path });
const post = (path: string): GatewayUpstreamOperation => ({ method: 'POST', path });
const patch = (path: string): GatewayUpstreamOperation => ({ method: 'PATCH', path });
/** A change made for the person in `actAs` first finds their Productive person (src/productive/act-as-person.ts). */
const findPerson = get('/people');

// ---------------------------------------------------------------------------
// Input building blocks
// ---------------------------------------------------------------------------

const id = (what: string) =>
  z
    .string()
    .regex(/^[1-9][0-9]{0,18}$/)
    .describe(`Productive id of the ${what} (digits).`);

const isoDate = (what: string) =>
  z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/)
    .refine(value => validDate(value), { message: 'not a calendar date' })
    .describe(`${what} (YYYY-MM-DD).`);

const page = z.number().int().min(1).max(10_000).optional().describe('Page number, from 1. Default 1.');
const pageSize = z
  .number()
  .int()
  .min(1)
  .max(MAX_PAGE_SIZE)
  .optional()
  .describe(`Records per page, 1-${MAX_PAGE_SIZE}. Default 50.`);
const query = z.string().trim().min(1).max(200).optional();

/** The longest period a time read may span: one year (a leap year included). */
const MAX_PERIOD_DAYS = 366;

function validDate(value: string): boolean {
  const date = new Date(`${value}T00:00:00Z`);
  return !Number.isNaN(date.getTime()) && date.toISOString().slice(0, 10) === value;
}

function checkPeriod(input: { after: string; before: string }): void {
  const days = (Date.parse(`${input.before}T00:00:00Z`) - Date.parse(`${input.after}T00:00:00Z`)) / 86_400_000;
  if (days < 0) throw new GatewayInputError('before must not be earlier than after.');
  if (days > MAX_PERIOD_DAYS) throw new GatewayInputError('The period may span at most one year.');
}

// ---------------------------------------------------------------------------
// Projections
// ---------------------------------------------------------------------------

type Rec = Record<string, unknown>;

function relation(record: FlatRecord | null | undefined, name: string): Rec | undefined {
  const value = (record?.relationships as Rec | undefined)?.[name];
  return value && typeof value === 'object' && !Array.isArray(value) ? (value as Rec) : undefined;
}

function text(value: unknown): string | null {
  return typeof value === 'string' && value !== '' ? value : null;
}

function num(value: unknown): number | null {
  return typeof value === 'number' && Number.isFinite(value) ? value : null;
}

function personName(record: Rec | undefined): string | null {
  if (!record) return null;
  const name = [record.first_name, record.last_name].filter(part => typeof part === 'string' && part).join(' ');
  return name || text(record.name);
}

/** A related record as `{ id, name }`, or null. */
function ref(record: FlatRecord | null | undefined, name: string, label: 'name' | 'person' | 'title' = 'name') {
  const related = relation(record, name);
  if (!related || typeof related.id !== 'string') return null;
  const shown = label === 'person' ? personName(related) : text(related[label]) ?? text(related.name);
  return { id: related.id, name: shown };
}

function page_(collection: FlatCollection) {
  return {
    total: collection.total ?? null,
    page: collection.page ?? null,
    nextPage: collection.nextPage ?? null,
  };
}

function project(record: FlatRecord) {
  return {
    id: record.id,
    name: text(record.name),
    projectNumber: text(record.project_number) ?? text(record.number),
    company: ref(record, 'company'),
    projectManager: ref(record, 'project_manager', 'person'),
    archived: Boolean(record.archived_at),
    lastActivityAt: text(record.last_activity_at),
  };
}

function task(record: FlatRecord) {
  return {
    id: record.id,
    title: text(record.title),
    taskNumber: text(record.task_number) ?? (num(record.number) === null ? null : String(record.number)),
    project: ref(record, 'project'),
    taskList: ref(record, 'task_list'),
    assignee: ref(record, 'assignee', 'person'),
    status: ref(record, 'workflow_status'),
    closed: typeof record.closed === 'boolean' ? record.closed : Boolean(record.closed_at),
    startDate: text(record.start_date),
    dueDate: text(record.due_date),
    updatedAt: text(record.updated_at),
  };
}

function taskDetail(record: FlatRecord) {
  return {
    ...task(record),
    description: text(record.description),
    service: ref(record, 'service'),
    initialEstimateMinutes: num(record.initial_estimate),
    remainingMinutes: num(record.remaining_time),
    workedMinutes: num(record.worked_time),
    billableMinutes: num(record.billable_time),
    createdAt: text(record.created_at),
  };
}

function comment(record: FlatRecord) {
  return {
    id: record.id,
    body: text(record.body),
    author: ref(record, 'creator', 'person'),
    createdAt: text(record.created_at),
  };
}

function person(record: FlatRecord) {
  const status = num(record.status);
  return {
    id: record.id,
    name: personName(record),
    title: text(record.title),
    email: text(record.email),
    active: status !== null ? status === 1 : !record.deactivated_at && !record.archived_at,
  };
}

function company(record: FlatRecord) {
  return {
    id: record.id,
    name: text(record.name),
    companyCode: text(record.company_code),
    archived: Boolean(record.archived_at),
  };
}

function budget(record: FlatRecord) {
  return {
    id: record.id,
    name: text(record.name),
    number: text(record.number) ?? (num(record.number) === null ? null : String(record.number)),
    company: ref(record, 'company'),
    project: ref(record, 'project'),
    responsible: ref(record, 'responsible', 'person'),
    open: !record.closed_at,
    startDate: text(record.date),
    endDate: text(record.end_date),
    currency: text(record.currency),
    budgetTotal: num(record.budget_total),
    budgetUsed: num(record.budget_used),
    budgetedMinutes: num(record.budgeted_time),
    workedMinutes: num(record.worked_time),
    billableMinutes: num(record.billable_time),
  };
}

function service(record: FlatRecord) {
  return {
    id: record.id,
    name: text(record.name),
    budget: ref(record, 'deal'),
    timeTrackingEnabled: typeof record.time_tracking_enabled === 'boolean' ? record.time_tracking_enabled : null,
    budgetedMinutes: num(record.budgeted_time),
    workedMinutes: num(record.worked_time),
  };
}

function timeEntry(record: FlatRecord) {
  return {
    id: record.id,
    date: text(record.date),
    minutes: num(record.time),
    billableMinutes: num(record.billable_time),
    note: text(record.note),
    person: ref(record, 'person', 'person'),
    service: ref(record, 'service'),
    task: ref(record, 'task', 'title'),
    approved: typeof record.approved === 'boolean' ? record.approved : Boolean(record.approved_at),
  };
}

const TIME_GROUPS = ['person', 'project', 'service'] as const;

/** A report row: the group it is for, the row count and every time figure (`*_time`, in minutes). */
function reportRow(record: FlatRecord, groupBy: (typeof TIME_GROUPS)[number]) {
  const row: Rec = { [groupBy]: ref(record, groupBy, groupBy === 'person' ? 'person' : 'name') };
  if (num(record.count) !== null) row.count = record.count;
  for (const [key, value] of Object.entries(record)) {
    if (key.endsWith('_time') && num(value) !== null) {
      row[`${camel(key.slice(0, -'_time'.length))}Minutes`] = value;
    }
  }
  return row;
}

function camel(key: string): string {
  return key.replace(/_([a-z0-9])/g, (_, letter: string) => letter.toUpperCase());
}

function written(outcome: WriteOutcome): FlatRecord {
  // The gateway writes standard-tier records only, which never stage; anything else is refused, not reported.
  if (outcome.status !== 'done' || !outcome.record) {
    throw new Error('Productive did not confirm the change.');
  }
  return outcome.record;
}

// ---------------------------------------------------------------------------
// Shared reads
// ---------------------------------------------------------------------------

/** The text of an error for an answer that is not a JSON:API document: it is refused, not passed on as empty. */
const UNREADABLE = 'Productive sent an answer this server cannot read.';

function isEnvelope(value: unknown): value is ProductiveResponse {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

interface ListArgs {
  filters?: Record<string, FilterValue | undefined>;
  include?: string[];
  sort?: string[];
  group?: string;
  page?: unknown;
  pageSize?: unknown;
}

async function list(context: GatewayToolContext, resource: string, args: ListArgs): Promise<FlatCollection> {
  const filters = Object.fromEntries(Object.entries(args.filters ?? {}).filter(([, value]) => value !== undefined));
  const response = await listRecords(
    context.client,
    {
      resource,
      raw: true,
      filters: Object.keys(filters).length ? (filters as Record<string, FilterValue>) : undefined,
      include: args.include,
      sort: args.sort,
      group: args.group,
      page: {
        number: typeof args.page === 'number' ? args.page : undefined,
        size: typeof args.pageSize === 'number' ? args.pageSize : 50,
      },
    },
    { policy: context.policy },
  );
  if (!isEnvelope(response) || !Array.isArray(response.data)) throw new Error(UNREADABLE);
  return flattenCollection(response);
}

async function one(context: GatewayToolContext, resource: string, recordId: string, include: string[]) {
  const response = await getRecord(
    context.client,
    { resource, id: recordId, include, raw: true },
    { policy: context.policy },
  );
  if (!isEnvelope(response)) throw new Error(UNREADABLE);
  const record = flattenSingle(response);
  if (!record) throw new GatewayInputError('No record with this id.');
  return record;
}

const PROJECT_INCLUDE = ['company', 'project_manager'];
const TASK_INCLUDE = ['project', 'task_list', 'assignee', 'workflow_status'];
const BUDGET_INCLUDE = ['company', 'project', 'responsible'];

/** A track_time for someone else while acting as a person: refused before anything is written. */
export const PERSON_MISMATCH =
  'Refused: acting as a person, time is logged only for that person; leave out personId. Nothing was changed.';

/** list_my_time_entries got an entry of another person back (Productive ignored the filter): nothing is shown. */
export const NOT_OWN_TIME = 'Refused: Productive returned time of another person; nothing is shown.';

/** Productive's status filter values: 1 is active or open, 2 archived or closed; no filter when not asked. */
const openOrClosed = (open: unknown): number | undefined => (open === true ? 1 : open === false ? 2 : undefined);

// ---------------------------------------------------------------------------
// The tools
// ---------------------------------------------------------------------------

export const GATEWAY_TOOLS: readonly GatewayToolSpec[] = [
  {
    name: 'search_capabilities',
    title: 'Search Productive capabilities',
    description: 'Find the Productive tools this connection offers by keyword.',
    riskLevel: 'read',
    summary: 'Productive capabilities.',
    upstream: [],
    resources: [],
    input: z.strictObject({
      query: z.string().trim().min(1).max(200).describe('Words to look for in tool names and descriptions.'),
      limit: z.number().int().min(1).max(50).optional().describe('Most tools to return. Default 10.'),
    }),
    async handler(input, context) {
      const words = String(input.query).toLowerCase().split(/\s+/).filter(Boolean);
      const scored = GATEWAY_TOOLS.filter(tool => context.offered.has(tool.name))
        .map(tool => {
          const haystack = `${tool.name} ${tool.title} ${tool.description}`.toLowerCase();
          return { tool, score: words.filter(word => haystack.includes(word)).length };
        })
        .filter(entry => entry.score > 0)
        .sort((a, b) => b.score - a.score || a.tool.name.localeCompare(b.tool.name));
      const limit = typeof input.limit === 'number' ? input.limit : 10;
      return {
        total: scored.length,
        tools: scored.slice(0, limit).map(({ tool }) => ({
          name: tool.name,
          title: tool.title,
          description: tool.description,
          riskLevel: tool.riskLevel,
        })),
      };
    },
  },
  {
    name: 'check_connection',
    title: 'Check Productive connection',
    description: 'Verify that Productive accepts the token, and name the token owner and the organization.',
    riskLevel: 'read',
    summary: 'Productive connection checked.',
    upstream: [get('/users'), get('/organizations')],
    resources: ['users', 'organizations'],
    async handler(_input, context) {
      const owner = await tokenOwner(context.client);
      const organizations = await list(context, 'organizations', { pageSize: MAX_PAGE_SIZE });
      const pinned = organizations.records.find(record => record.id === context.client.organization);
      return {
        connected: true,
        tokenOwner: text(owner?.name),
        organization: pinned ? text(pinned.name) : null,
      };
    },
    input: z.strictObject({}),
  },
  {
    name: 'list_projects',
    title: 'List Productive projects',
    description:
      'List projects by text and company. Active projects unless archived is true.',
    riskLevel: 'read',
    summary: 'Productive projects.',
    upstream: [get('/projects')],
    resources: ['projects'],
    input: z.strictObject({
      query: query.describe('Text to search project names and numbers for.'),
      archived: z.boolean().optional().describe('True lists archived projects only. Default false (active only).'),
      companyId: id('company (client)').optional(),
      page,
      pageSize,
    }),
    async handler(input, context) {
      const result = await list(context, 'projects', {
        filters: {
          query: input.query as string | undefined,
          status: input.archived === true ? 2 : 1,
          company_id: input.companyId as string | undefined,
        },
        include: PROJECT_INCLUDE,
        page: input.page,
        pageSize: input.pageSize,
      });
      return { ...page_(result), projects: result.records.map(project) };
    },
  },
  {
    name: 'get_project',
    title: 'Get Productive project',
    description: 'Fetch one project by id.',
    riskLevel: 'read',
    summary: 'Productive project.',
    upstream: [get('/projects/{projectId}')],
    resources: ['projects'],
    input: z.strictObject({ projectId: id('project') }),
    async handler(input, context) {
      return { project: project(await one(context, 'projects', String(input.projectId), PROJECT_INCLUDE)) };
    },
  },
  {
    name: 'list_tasks',
    title: 'List Productive tasks',
    description: 'List tasks, filtered by project, assignee, open or closed, and text.',
    riskLevel: 'read',
    summary: 'Productive tasks.',
    upstream: [get('/tasks')],
    resources: ['tasks'],
    input: z.strictObject({
      projectId: id('project').optional(),
      assigneeId: id('assigned person').optional(),
      open: z.boolean().optional().describe('True lists open tasks only, false closed ones only. Default both.'),
      query: query.describe('Text to search task titles for.'),
      page,
      pageSize,
    }),
    async handler(input, context) {
      const result = await list(context, 'tasks', {
        filters: {
          project_id: input.projectId as string | undefined,
          assignee_id: input.assigneeId as string | undefined,
          status: openOrClosed(input.open),
          query: input.query as string | undefined,
        },
        include: TASK_INCLUDE,
        page: input.page,
        pageSize: input.pageSize,
      });
      return { ...page_(result), tasks: result.records.map(task) };
    },
  },
  {
    name: 'get_task',
    title: 'Get Productive task',
    description: 'Fetch one task by id, with its description and up to 50 comments.',
    riskLevel: 'read',
    summary: 'Productive task.',
    upstream: [get('/tasks/{taskId}'), get('/comments')],
    resources: ['tasks', 'comments'],
    input: z.strictObject({ taskId: id('task') }),
    async handler(input, context) {
      const taskId = String(input.taskId);
      const record = await one(context, 'tasks', taskId, [...TASK_INCLUDE, 'service']);
      const comments = await list(context, 'comments', {
        filters: { task_id: taskId },
        include: ['creator'],
        pageSize: 50,
      });
      return {
        task: taskDetail(record),
        commentsTotal: comments.total ?? comments.records.length,
        comments: comments.records.map(comment),
      };
    },
  },
  {
    name: 'list_people',
    title: 'List Productive people',
    description: "List the organization's team members: name, title, mail and whether they are active.",
    riskLevel: 'read',
    summary: 'Productive people.',
    upstream: [get('/people')],
    resources: ['people'],
    input: z.strictObject({
      query: query.describe('Text to search names and mail addresses for.'),
      page,
      pageSize,
    }),
    async handler(input, context) {
      const result = await list(context, 'people', {
        // person_type 1: team members, not client contacts or placeholders.
        filters: { query: input.query as string | undefined, person_type: 1 },
        page: input.page,
        pageSize: input.pageSize,
      });
      return { ...page_(result), people: result.records.map(person) };
    },
  },
  {
    name: 'list_companies',
    title: 'List Productive companies',
    description: 'List companies (clients). Active companies unless archived is true.',
    riskLevel: 'read',
    summary: 'Productive companies.',
    upstream: [get('/companies')],
    resources: ['companies'],
    input: z.strictObject({
      query: query.describe('Text to search company names for.'),
      archived: z.boolean().optional().describe('True lists archived companies only. Default false (active only).'),
      page,
      pageSize,
    }),
    async handler(input, context) {
      const result = await list(context, 'companies', {
        filters: { query: input.query as string | undefined, status: input.archived === true ? 2 : 1 },
        page: input.page,
        pageSize: input.pageSize,
      });
      return { ...page_(result), companies: result.records.map(company) };
    },
  },
  {
    name: 'list_budgets',
    title: 'List Productive budgets',
    description:
      'List budgets by project, company and open or closed: time budgeted and worked (minutes), budget total and used (minor units).',
    riskLevel: 'read',
    summary: 'Productive budgets.',
    upstream: [get('/deals')],
    resources: ['deals'],
    input: z.strictObject({
      projectId: id('project').optional(),
      companyId: id('company (client)').optional(),
      open: z.boolean().optional().describe('True lists open budgets only, false closed ones only. Default both.'),
      page,
      pageSize,
    }),
    async handler(input, context) {
      const result = await list(context, 'deals', {
        filters: {
          // type 2: budgets, not sales deals.
          type: 2,
          project_id: input.projectId as string | undefined,
          company_id: input.companyId as string | undefined,
          budget_status: openOrClosed(input.open),
        },
        include: BUDGET_INCLUDE,
        page: input.page,
        pageSize: input.pageSize,
      });
      return { ...page_(result), budgets: result.records.map(budget) };
    },
  },
  {
    name: 'get_budget',
    title: 'Get Productive budget',
    description: 'Fetch one budget by id.',
    riskLevel: 'read',
    summary: 'Productive budget.',
    upstream: [get('/deals/{budgetId}')],
    resources: ['deals'],
    input: z.strictObject({ budgetId: id('budget') }),
    async handler(input, context) {
      const record = await one(context, 'deals', String(input.budgetId), BUDGET_INCLUDE);
      // A sales deal shares the endpoint: only a budget is returned.
      if (record.budget !== true) throw new GatewayInputError('No budget with this id.');
      return { budget: budget(record) };
    },
  },
  {
    name: 'list_services',
    title: 'List Productive services',
    description: 'List services (budget lines that time is logged against), by budget or project.',
    riskLevel: 'read',
    summary: 'Productive services.',
    upstream: [get('/services')],
    resources: ['services'],
    input: z.strictObject({
      budgetId: id('budget').optional(),
      projectId: id('project').optional(),
      page,
      pageSize,
    }),
    async handler(input, context) {
      const result = await list(context, 'services', {
        filters: { deal_id: input.budgetId as string | undefined, project_id: input.projectId as string | undefined },
        include: ['deal'],
        page: input.page,
        pageSize: input.pageSize,
      });
      return { ...page_(result), services: result.records.map(service) };
    },
  },
  {
    name: 'list_time_entries',
    title: 'List Productive time entries',
    description:
      'List time entries in a period of at most one year, by person, project, service or task. Time in minutes.',
    riskLevel: 'read',
    summary: 'Productive time entries.',
    upstream: [get('/time_entries')],
    resources: ['time_entries'],
    input: z.strictObject({
      after: isoDate('First day of the period'),
      before: isoDate('Last day of the period'),
      personId: id('person').optional(),
      projectId: id('project').optional(),
      serviceId: id('service').optional(),
      taskId: id('task').optional(),
      page,
      pageSize,
    }),
    async handler(input, context) {
      checkPeriod(input as { after: string; before: string });
      const result = await list(context, 'time_entries', {
        filters: {
          after: input.after as string,
          before: input.before as string,
          person_id: input.personId as string | undefined,
          project_id: input.projectId as string | undefined,
          service_id: input.serviceId as string | undefined,
          task_id: input.taskId as string | undefined,
        },
        include: ['person', 'service', 'task'],
        page: input.page,
        pageSize: input.pageSize,
      });
      return { ...page_(result), timeEntries: result.records.map(timeEntry) };
    },
  },
  {
    name: 'list_my_time_entries',
    title: "List the person's own Productive time entries",
    description:
      "List the time entries of the person the host acts as (actAs), in a period of at most one year, optionally by project or task. Never anyone else's time. Time in minutes.",
    riskLevel: 'read',
    self: true,
    summary: 'Productive time entries of the person.',
    upstream: [findPerson, get('/time_entries')],
    resources: ['time_entries'],
    input: z.strictObject({
      after: isoDate('First day of the period'),
      before: isoDate('Last day of the period'),
      projectId: id('project').optional(),
      taskId: id('task').optional(),
      page,
      pageSize,
    }),
    async handler(input, context) {
      checkPeriod(input as { after: string; before: string });
      // The gateway refuses a self tool without a person before this runs; the check here keeps it so on its own.
      const personId = await personForChange(context.client);
      if (personId === undefined) throw new ActAsRefusedError('invalid');
      const result = await list(context, 'time_entries', {
        filters: {
          after: input.after as string,
          before: input.before as string,
          person_id: personId,
          project_id: input.projectId as string | undefined,
          task_id: input.taskId as string | undefined,
        },
        include: ['person', 'service', 'task'],
        page: input.page,
        pageSize: input.pageSize,
      });
      // Only the person's own entries leave: an entry of anyone else (or of no one) means the filter was not applied.
      if (result.records.some(record => relation(record, 'person')?.id !== personId)) throw new Error(NOT_OWN_TIME);
      return { ...page_(result), timeEntries: result.records.map(timeEntry) };
    },
  },
  {
    name: 'time_report',
    title: 'Productive time report',
    description:
      'Time logged in a period of at most one year, summed per person, project or service. Time in minutes.',
    riskLevel: 'read',
    summary: 'Productive time report.',
    upstream: [get('/reports/time_reports')],
    resources: ['reports/time_reports'],
    input: z.strictObject({
      after: isoDate('First day of the period'),
      before: isoDate('Last day of the period'),
      groupBy: z.enum(TIME_GROUPS).describe('What to sum per: person, project or service.'),
      projectId: id('project').optional(),
      personId: id('person').optional(),
      page,
    }),
    async handler(input, context) {
      checkPeriod(input as { after: string; before: string });
      const groupBy = input.groupBy as (typeof TIME_GROUPS)[number];
      const result = await list(context, 'reports/time_reports', {
        filters: {
          after: input.after as string,
          before: input.before as string,
          project_id: input.projectId as string | undefined,
          person_id: input.personId as string | undefined,
        },
        group: groupBy,
        include: [groupBy],
        page: input.page,
        pageSize: MAX_PAGE_SIZE,
      });
      return { ...page_(result), groupBy, rows: result.records.map(record => reportRow(record, groupBy)) };
    },
  },
  {
    name: 'create_task',
    title: 'Create Productive task',
    description:
      "Create a task in a project. Without taskListId it goes in the project's first open task list.",
    riskLevel: 'write',
    summary: 'Productive task created.',
    upstream: [findPerson, get('/task_lists'), post('/tasks')],
    resources: ['task_lists', 'tasks'],
    input: z.strictObject({
      projectId: id('project'),
      taskListId: id('task list').optional(),
      title: z.string().trim().min(1).max(500).describe('Task title.'),
      description: z.string().max(20_000).optional().describe('Task description.'),
      assigneeId: id('person to assign').optional(),
      dueDate: isoDate('Due date').optional(),
    }),
    async handler(input, context) {
      // With a person from the host: only when they are a person in Productive. A task's creator is read-only in
      // Productive's API (no author can be sent), so Productive records the token's owner as for every call.
      await personForChange(context.client);
      let taskListId = input.taskListId as string | undefined;
      if (!taskListId) {
        const lists = await list(context, 'task_lists', {
          filters: { project_id: String(input.projectId), status: 1 },
          pageSize: 1,
        });
        taskListId = lists.records[0]?.id;
        if (!taskListId) throw new GatewayInputError('The project has no open task list. Pass taskListId.');
      }
      const attributes: Rec = { project_id: input.projectId, task_list_id: taskListId, title: input.title };
      if (input.description !== undefined) attributes.description = input.description;
      if (input.assigneeId !== undefined) attributes.assignee_id = input.assigneeId;
      if (input.dueDate !== undefined) attributes.due_date = input.dueDate;
      const outcome = await createRecord(context.client, { resource: 'tasks', attributes }, { policy: context.policy });
      return { created: true, task: task(written(outcome)) };
    },
  },
  {
    name: 'update_task',
    title: 'Update Productive task',
    description:
      'Change a task: title, description, assignee, due date or workflow status (a status in the closed category closes the task). Fields not given keep their values.',
    riskLevel: 'write',
    summary: 'Productive task updated.',
    upstream: [findPerson, patch('/tasks/{taskId}')],
    resources: ['tasks'],
    input: z.strictObject({
      taskId: id('task'),
      title: z.string().trim().min(1).max(500).optional().describe('New title.'),
      description: z.string().max(20_000).optional().describe('New description.'),
      assigneeId: id('person to assign').optional(),
      dueDate: isoDate('New due date').optional(),
      workflowStatusId: id('workflow status (see status in get_task)').optional(),
    }),
    async handler(input, context) {
      const attributes: Rec = {};
      if (input.title !== undefined) attributes.title = input.title;
      if (input.description !== undefined) attributes.description = input.description;
      if (input.assigneeId !== undefined) attributes.assignee_id = input.assigneeId;
      if (input.dueDate !== undefined) attributes.due_date = input.dueDate;
      if (input.workflowStatusId !== undefined) attributes.workflow_status_id = input.workflowStatusId;
      if (Object.keys(attributes).length === 0) throw new GatewayInputError('Give at least one field to change.');
      await personForChange(context.client);
      const outcome = await updateRecord(
        context.client,
        { resource: 'tasks', id: String(input.taskId), attributes },
        { policy: context.policy },
      );
      return { updated: true, task: task(written(outcome)) };
    },
  },
  {
    name: 'add_comment',
    title: 'Comment on Productive task',
    description: 'Add a comment to a task.',
    riskLevel: 'write',
    summary: 'Productive comment added.',
    upstream: [findPerson, post('/comments')],
    resources: ['comments'],
    input: z.strictObject({
      taskId: id('task'),
      body: z.string().trim().min(1).max(20_000).describe('The comment text.'),
    }),
    async handler(input, context) {
      await personForChange(context.client);
      const outcome = await createRecord(
        context.client,
        { resource: 'comments', attributes: { task_id: input.taskId, body: input.body } },
        { policy: context.policy },
      );
      return { created: true, comment: comment(written(outcome)) };
    },
  },
  {
    name: 'track_time',
    title: 'Log time in Productive',
    description:
      "Log time for a person on a date, in minutes or hours, against a service or a task (the task's service is used). When the host acts as a person (actAs), the time is that person's and personId may be left out.",
    riskLevel: 'write',
    summary: 'Productive time logged.',
    upstream: [findPerson, get('/tasks/{taskId}'), post('/time_entries')],
    resources: ['tasks', 'time_entries'],
    input: z.strictObject({
      personId: id(
        'person the time is logged for (required unless the host acts as a person: never guessed)',
      ).optional(),
      date: isoDate('Day the time was worked'),
      minutes: z.number().int().min(1).max(1440).optional().describe('Time in minutes. Give minutes or hours.'),
      hours: z.number().min(0.01).max(24).optional().describe('Time in hours. Give minutes or hours.'),
      taskId: id('task').optional(),
      serviceId: id('service (budget line); taken from the task when not given').optional(),
      note: z.string().max(5_000).optional().describe('Note on the entry.'),
      billableMinutes: z.number().int().min(0).max(1440).optional().describe('Billable part, in minutes.'),
    }),
    async handler(input, context) {
      if ((input.minutes === undefined) === (input.hours === undefined)) {
        throw new GatewayInputError('Give either minutes or hours.');
      }
      if (input.serviceId === undefined && input.taskId === undefined) {
        throw new GatewayInputError('Give serviceId, or a taskId to take the service from.');
      }
      // With a person from the host, the time is theirs: found by their email, and never logged for anyone else.
      const acting = await personForChange(context.client);
      if (acting !== undefined && input.personId !== undefined && input.personId !== acting) {
        throw new GatewayInputError(PERSON_MISMATCH);
      }
      const personId = acting ?? (input.personId as string | undefined);
      if (personId === undefined) throw new GatewayInputError('Give personId: the person the time is logged for.');
      const outcome = await trackTime(
        context.client,
        {
          personId,
          date: String(input.date),
          minutes: input.minutes as number | undefined,
          hours: input.hours as number | undefined,
          taskId: input.taskId as string | undefined,
          serviceId: input.serviceId as string | undefined,
          note: input.note as string | undefined,
          billableMinutes: input.billableMinutes as number | undefined,
        },
        { policy: context.policy },
      );
      return { created: true, timeEntry: timeEntry(written(outcome)) };
    },
  },
];

/** Every registry resource a gateway tool touches: the only ones the gateway's resource policy allows. */
export const GATEWAY_RESOURCES: readonly string[] = [...new Set(GATEWAY_TOOLS.flatMap(tool => tool.resources))];
