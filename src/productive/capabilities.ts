import { searchResources, type ResourceMatch } from './registry.js';
import type { Tier } from './registry-types.js';

/**
 * What this server can do, in a form that can be searched.
 *
 * Productive has ~130 resources and ~650 operations. Enumerating them as MCP
 * tools would flood any client's tool list, so the surface is twelve tools
 * driven by a registry, and this catalogue is how a caller finds their way in:
 * search for "invoice" or "capacity" and get told which resource and which tool.
 *
 * `guide` entries are not tools. They document a workflow that spans several
 * calls, or a trap in the API that costs an hour to discover. They are returned
 * by search and read back with productive_search_capabilities, and deliberately
 * do not shadow a tool name.
 */

export type CapabilityKind = 'tool' | 'guide';

export interface Capability {
  id: string;
  kind: CapabilityKind;
  title: string;
  description: string;
  tier: Tier;
  keywords: string[];
  /** For guides: the ordered steps, naming real tools. */
  steps?: Array<{ tool: string; note: string }>;
}

const tool = (
  id: string,
  title: string,
  description: string,
  tier: Tier,
  keywords: string[],
): Capability => ({ id, kind: 'tool', title, description, tier, keywords });

const guide = (
  id: string,
  title: string,
  description: string,
  keywords: string[],
  steps: Array<{ tool: string; note: string }>,
): Capability => ({ id, kind: 'guide', title, description, tier: 'read', keywords, steps });

export const TOOL_CAPABILITIES: Capability[] = [
  tool(
    'productive_search_capabilities',
    'Search capabilities',
    'Find the resource, tool or guide for a subject. Start here — the resource names are Productive\'s own and are not always guessable.',
    'read',
    ['discovery', 'help', 'find', 'search', 'what can you do'],
  ),
  tool(
    'productive_describe_resource',
    'Describe a resource',
    'The full contract for one resource: every filter and the operators it accepts, sort keys, includable relationships, writable attributes with the required ones marked, and its named actions.',
    'read',
    ['schema', 'fields', 'filters', 'attributes', 'contract', 'describe'],
  ),
  tool(
    'productive_check_connection',
    'Check connection',
    'Verify the token and organization, report who the token belongs to, and list what this deployment is allowed to write.',
    'read',
    ['auth', 'token', 'setup', 'health', 'whoami', 'organization', 'permissions'],
  ),
  tool(
    'productive_list',
    'List records',
    'List any resource with server-side filtering, sorting, includes and paging. Also the way to read the report endpoints, which add grouping.',
    'read',
    ['list', 'search', 'query', 'filter', 'report', 'export'],
  ),
  tool(
    'productive_get',
    'Get one record',
    'Read one record by id, optionally pulling related records in the same call.',
    'read',
    ['get', 'read', 'detail', 'fetch', 'show'],
  ),
  tool(
    'productive_describe_custom_fields',
    'Describe custom fields',
    'List the organization\'s custom fields with the id each one is written under, which resource it belongs to, and its allowed options.',
    'read',
    ['custom field', 'custom fields', 'extra field', 'dropdown', 'options'],
  ),
  tool(
    'productive_create',
    'Create a record',
    'Create a record on any writable resource. Attributes are validated against the resource contract first.',
    'write',
    ['create', 'add', 'new', 'insert'],
  ),
  tool(
    'productive_update',
    'Update a record',
    'Update a record. PATCH semantics: omitted attributes keep their values.',
    'write',
    ['update', 'edit', 'change', 'patch', 'modify'],
  ),
  tool(
    'productive_delete',
    'Delete a record',
    'Delete a record. Gated by its own switch and always staged through prepare/commit.',
    'write',
    ['delete', 'remove', 'destroy'],
  ),
  tool(
    'productive_run_action',
    'Run a named action',
    'Run one of Productive\'s named verbs — archive, restore, close, approve, copy, finalize, send — including the bulk forms that act on every record a filter matches.',
    'write',
    ['action', 'archive', 'restore', 'approve', 'close', 'copy', 'send', 'finalize', 'reposition'],
  ),
  tool(
    'productive_track_time',
    'Track time',
    'Log a time entry, resolving the person from the caller and the service from the task so neither has to be looked up by hand.',
    'write',
    ['time', 'track', 'log time', 'timesheet', 'hours', 'worked'],
  ),
  tool(
    'productive_commit_operation',
    'Commit a staged operation',
    'Execute a write that was staged by prepare, after restating it unchanged.',
    'write',
    ['commit', 'confirm', 'apply', 'execute'],
  ),
];

export const GUIDE_CAPABILITIES: Capability[] = [
  guide(
    'productive_guide_time_tracking',
    'How time tracking hangs together',
    'A time entry needs person_id, service_id, date and time — and `time` is MINUTES, not hours. The service is the hard part: it is the budget line the work is billed to, not the task, so it comes from the task\'s `service` relationship or from the deal. productive_track_time resolves both; do it by hand only when that fails. Timers are separate records: create one on /timers and stop it with the `stop` action, which turns it into a time entry.',
    ['time', 'timer', 'hours', 'minutes', 'service', 'budget line', 'timesheet', 'billable'],
    [
      { tool: 'productive_track_time', note: 'Log against a task; person and service are resolved for you.' },
      { tool: 'productive_list', note: 'resource="services" filtered by deal_id or project to find a billable line yourself.' },
      { tool: 'productive_list', note: 'resource="time_entries" with filters {after, before, person_id} to read a period back.' },
      { tool: 'productive_run_action', note: 'resource="timers", action="stop" to convert a running timer into an entry.' },
    ],
  ),
  guide(
    'productive_guide_custom_fields',
    'Writing custom fields',
    'Custom-field values are not top-level attributes. They travel inside one `custom_fields` object on the record, keyed by the NUMERIC CUSTOM FIELD ID — never by the field\'s display name, which is silently ignored. Because the key is an id, the allowlist in this server cannot check it: get the ids first.',
    ['custom field', 'custom fields', 'extra data', 'dropdown', 'select', 'options'],
    [
      { tool: 'productive_describe_custom_fields', note: 'Get each field\'s id, the resource it applies to, and its options.' },
      { tool: 'productive_update', note: 'Send attributes: { custom_fields: { "<field id>": "<value>" } }.' },
    ],
  ),
  guide(
    'productive_guide_reports',
    'Reading the report endpoints',
    'Productive\'s reports are read through the same list tool, as resources named reports/*: reports/time_reports, reports/budget_reports, reports/invoice_reports and 23 more. What makes them reports is `group` — group="person" or "month" or "project" returns aggregated rows rather than records. Money comes back in minor units and time in minutes. There is no group for a plain resource; asking for one is an error rather than a silent full list.',
    ['report', 'reports', 'aggregate', 'group', 'summary', 'utilisation', 'capacity', 'profit', 'revenue'],
    [
      { tool: 'productive_search_capabilities', note: 'Search "report" to see all 26 report resources.' },
      { tool: 'productive_describe_resource', note: 'resource="reports/time_reports" lists the 21 group keys and every filter.' },
      { tool: 'productive_list', note: 'resource="reports/time_reports", group="person", filters={after,before}.' },
    ],
  ),
  guide(
    'productive_guide_two_step_writes',
    'Why some writes take two calls',
    'Ordinary project work — a task, a time entry, a booking — is written in one call. Anything with a wider blast radius is staged instead: the prepare step returns the exact request plus a hash and changes nothing, and productive_commit_operation runs it only if the restated operation still matches. That covers money and pricing, access and organization settings, every delete, anything that leaves the organization (sending an invoice, inviting a person), and every bulk_* action, because those act on all records a filter matches rather than one. Show the staged change before committing it.',
    ['prepare', 'commit', 'confirm', 'two step', 'dry run', 'staged', 'why blocked', 'disabled'],
    [
      { tool: 'productive_update', note: 'On a financial or admin resource this returns a staged operation, not a result.' },
      { tool: 'productive_commit_operation', note: 'Pass the staged operation back unchanged to execute it.' },
    ],
  ),
  guide(
    'productive_guide_paging_and_limits',
    'Paging, limits and what the API will not tell you',
    'Lists are paged: page[size] caps at 200 and Productive clamps a larger request silently rather than erroring, so a request for 500 quietly returns 200. Read meta.total_count and the nextPage field in the result rather than assuming a page is the whole answer. Unknown filters, sorts and includes are rejected with HTTP 400, so a typo fails loudly — but an unknown attribute on a WRITE returns 200 and changes nothing, which is why this server refuses those itself. Filters accept exactly six operators on any field — contains, eq, gt, lt, not_contain, not_eq — and there is no gte or lte, so an inclusive range needs the resource\'s own after/before filter fields. Rate limits are enforced without any rate-limit header to read, so back off on 429 instead of probing.',
    ['pagination', 'paging', 'page size', 'limit', 'rate limit', '429', 'total', 'truncated', 'operator', 'gte', 'range', 'between'],
    [
      { tool: 'productive_list', note: 'Pass page={number,size} and read total, nextPage from the result.' },
    ],
  ),
];

export const ALL_CAPABILITIES: Capability[] = [...TOOL_CAPABILITIES, ...GUIDE_CAPABILITIES];

export interface CapabilitySearchResult {
  capabilities: Capability[];
  resources: ResourceMatch[];
}

export function searchCapabilities(query: string, limit = 10): CapabilitySearchResult {
  const needle = query.trim().toLowerCase();
  const capabilities = needle
    ? ALL_CAPABILITIES.filter(
        capability =>
          capability.id.includes(needle) ||
          capability.title.toLowerCase().includes(needle) ||
          capability.description.toLowerCase().includes(needle) ||
          capability.keywords.some(keyword => keyword.includes(needle) || needle.includes(keyword)),
      ).slice(0, limit)
    : TOOL_CAPABILITIES.slice(0, limit);

  return { capabilities, resources: searchResources(needle, limit) };
}

/** Capability ids that name a real tool, for the tools-match-catalogue test. */
export function toolCapabilityIds(): string[] {
  return TOOL_CAPABILITIES.map(capability => capability.id);
}
