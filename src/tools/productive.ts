import { z } from 'zod';
import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import type { ProductiveClient, FilterValue } from '../productive/client.js';
import { formatUnknownError } from '../errors.js';
import { loadPolicy, type ProductivePolicy } from '../productive/policy.js';
import { searchCapabilities } from '../productive/capabilities.js';
import { describeResource, resourceKeys, SPEC_FINGERPRINT } from '../productive/registry.js';
import type { PreparedOperation } from '../productive/operations.js';
import { resolveIdentity, type CallerIdentity } from '../productive/identity.js';
import {
  checkConnection,
  commitOperation,
  createRecord,
  deleteRecord,
  describeCustomFields,
  getRecord,
  listRecords,
  runAction,
  trackTime,
  updateRecord,
  type ExecutionContext,
} from '../productive/resources.js';

export interface RegisterOptions {
  /** Caller address forwarded by an authenticating gateway. */
  onBehalfOf?: string;
}

/**
 * Filters, sorts and includes are described rather than typed.
 *
 * The vocabulary is per-resource — 2,138 filter fields across 132 resources —
 * so a static schema could only be `object`. The real check happens against the
 * generated registry before the request goes out, and productive_describe_resource
 * is how a caller learns what a given resource accepts.
 */
const filtersSchema = z
  .record(z.string(), z.unknown())
  .describe(
    'Server-side filters. A bare value means equality: {"assignee_id":"5"}. An array is ' +
      'comma-joined: {"id":["1","2"]}. An operator object narrows further: ' +
      '{"created_at":{"gt":"2026-01-01"}} — the ONLY operators Productive accepts are contains, ' +
      'eq, gt, lt, not_contain, not_eq. There is no gte/lte, so for an inclusive date range use ' +
      'the resource\'s own after/before filter fields instead. Logical groups nest: ' +
      '{"$op":"and","0":{"assignee_id":{"eq":"5"}},"1":{"company_id":{"eq":"7"}}}. Field names are ' +
      'validated against the resource — call productive_describe_resource for the list.',
  )
  .optional();

const pageSchema = z
  .object({
    number: z.number().int().min(1).optional().describe('1-based page number.'),
    size: z
      .number()
      .int()
      .min(1)
      .optional()
      .describe('Records per page. Productive caps this at 200 and silently clamps more.'),
  })
  .optional();

const attributesSchema = z
  .record(z.string(), z.unknown())
  .describe(
    'Attributes to write, by their Productive names. Validated against the resource contract ' +
      'first, because Productive answers 200 and ignores an unknown attribute rather than ' +
      'reporting it. Custom-field values go in a nested `custom_fields` object keyed by field id.',
  )
  .optional();

/** The staged-operation shape, as productive_commit_operation takes it back. */
const preparedOperationSchema = z.object({
  operation: z.string(),
  resource: z.string(),
  method: z.enum(['GET', 'POST', 'PUT', 'PATCH', 'DELETE']),
  path: z.string(),
  tier: z.enum(['read', 'write', 'financial', 'admin']),
  filters: z.record(z.string(), z.unknown()).optional(),
  body: z.unknown().optional(),
  effect: z.string(),
  warnings: z.array(z.string()),
  dryRun: z.literal(true),
  operationHash: z.string(),
});

export function registerProductiveTools(
  server: McpServer,
  client: ProductiveClient,
  options: RegisterOptions = {},
): void {
  const policy: ProductivePolicy = loadPolicy();

  /**
   * The caller is resolved once per request, lazily. The HTTP transport builds a
   * fresh server per request, so this is per-request state despite the closure.
   */
  let identityPromise: Promise<CallerIdentity | undefined> | undefined;
  const context = async (): Promise<ExecutionContext> => {
    identityPromise ??= resolveIdentity(client, options.onBehalfOf);
    return { policy, identity: await identityPromise };
  };

  const readOnly = { readOnlyHint: true } as const;
  const mutating = { readOnlyHint: false } as const;

  // -------------------------------------------------------------------------
  // Discovery
  // -------------------------------------------------------------------------

  server.registerTool(
    'productive_search_capabilities',
    {
      title: 'Search capabilities',
      description:
        'Find the right resource, tool or guide for a subject. Start here: Productive names its ' +
        'resources its own way (a budget is a `deal`, a person is a `person`, a board column is a ' +
        '`workflow_status`), and guessing wastes calls. Returns matching tools, workflow guides, ' +
        'and resources with the operations each supports.',
      inputSchema: {
        query: z
          .string()
          .describe('Subject to search for, e.g. "invoice", "capacity", "custom field", "time".'),
        limit: z.number().int().min(1).max(50).optional(),
      },
      annotations: readOnly,
    },
    async ({ query, limit }) =>
      wrap(() => Promise.resolve(searchCapabilities(query, limit ?? 10))),
  );

  server.registerTool(
    'productive_describe_resource',
    {
      title: 'Describe a resource',
      description:
        'The exact contract for one resource, derived from Productive\'s own OpenAPI document: ' +
        'every filter field, the operators any field accepts, sort keys, report group keys, ' +
        'includable relationships, the writable attributes for create and update with the ' +
        'required ones marked, and any named actions. Read this before writing — it is the ' +
        'difference between a write that lands and a 200 that changed nothing.',
      inputSchema: {
        resource: z
          .string()
          .describe('Resource key, e.g. "tasks", "time_entries", "reports/time_reports".'),
      },
      annotations: readOnly,
    },
    async ({ resource }) => wrap(() => Promise.resolve(describeResource(resource))),
  );

  server.registerTool(
    'productive_check_connection',
    {
      title: 'Check connection',
      description:
        'Verify the token and organization and report what this deployment may do. Also names the ' +
        'person the token belongs to — every change Productive records is credited to them, ' +
        'whoever asked — and the caller identity, when a gateway forwards one.',
      inputSchema: {},
      annotations: readOnly,
    },
    async () => wrap(async () => checkConnection(client, await context())),
  );

  server.registerTool(
    'productive_describe_custom_fields',
    {
      title: 'Describe custom fields',
      description:
        'List the organization\'s custom fields with the id each value is written under, the ' +
        'object it applies to, and its options. Custom-field values are keyed by numeric id, not ' +
        'by display name — a name used as a key is accepted with 200 and stored nowhere.',
      inputSchema: {
        appliesTo: z
          .string()
          .optional()
          .describe(
            "Narrow to fields on one object, matched against Productive's own wording for it. " +
              "That wording is not this server's resource key — fields on people report " +
              '"employees" — so call this without an argument first and pick from appliesToValues.',
          ),
      },
      annotations: readOnly,
    },
    async ({ appliesTo }) => wrap(() => describeCustomFields(client, { appliesTo })),
  );

  // -------------------------------------------------------------------------
  // Reads
  // -------------------------------------------------------------------------

  server.registerTool(
    'productive_list',
    {
      title: 'List records',
      description:
        'List any Productive resource with server-side filtering, sorting, includes and paging. ' +
        'Also how the 26 report endpoints are read: use resource "reports/time_reports" (and the ' +
        'rest) with `group` to get aggregated rows instead of records. Results are flattened out ' +
        'of JSON:API — attributes hoisted, included records inlined into their relationship — with ' +
        '`total` and `nextPage` so a page is never mistaken for the whole answer.',
      inputSchema: {
        resource: z.string().describe(`One of ${resourceKeys().length} resource keys; see productive_search_capabilities.`),
        filters: filtersSchema,
        sort: z
          .array(z.string())
          .optional()
          .describe('Sort keys; prefix with "-" for descending, e.g. ["-created_at"].'),
        group: z
          .string()
          .optional()
          .describe('Report aggregation key. Only the reports/* resources accept one.'),
        include: z
          .array(z.string())
          .optional()
          .describe('Relationships to pull in the same call, e.g. ["assignee","project"].'),
        page: pageSchema,
        raw: z
          .boolean()
          .optional()
          .describe('Return Productive\'s JSON:API envelope untouched instead of flat records.'),
      },
      annotations: readOnly,
    },
    async input =>
      wrap(async () =>
        listRecords(
          client,
          { ...input, filters: input.filters as Record<string, FilterValue> | undefined },
          await context(),
        ),
      ),
  );

  server.registerTool(
    'productive_get',
    {
      title: 'Get one record',
      description:
        'Read one record by id, optionally pulling related records in the same call rather than ' +
        'following relationship stubs one at a time.',
      inputSchema: {
        resource: z.string(),
        id: z.string(),
        include: z.array(z.string()).optional(),
        raw: z.boolean().optional(),
      },
      annotations: readOnly,
    },
    async input => wrap(async () => getRecord(client, input, await context())),
  );

  // -------------------------------------------------------------------------
  // Writes
  // -------------------------------------------------------------------------

  server.registerTool(
    'productive_create',
    {
      title: 'Create a record',
      description:
        'Create a record on any writable resource. Required attributes are checked first, and so ' +
        'is every attribute name. On a financial or administrative resource this returns a staged ' +
        'operation to review rather than creating anything — pass it to ' +
        'productive_commit_operation to go through with it.',
      inputSchema: {
        resource: z.string(),
        attributes: attributesSchema,
        relationships: z
          .record(z.string(), z.unknown())
          .optional()
          .describe('JSON:API relationships, where the resource accepts them. Most links are set through an `_id` attribute instead.'),
      },
      annotations: mutating,
    },
    async input => wrap(async () => createRecord(client, input, await context())),
  );

  server.registerTool(
    'productive_update',
    {
      title: 'Update a record',
      description:
        'Update a record. PATCH semantics, verified live: attributes you omit keep their values, ' +
        'so there is no need to resend the whole record. On a financial or administrative resource ' +
        'this returns a staged operation instead of writing.',
      inputSchema: {
        resource: z.string(),
        id: z.string(),
        attributes: attributesSchema,
        relationships: z.record(z.string(), z.unknown()).optional(),
      },
      annotations: mutating,
    },
    async input => wrap(async () => updateRecord(client, input, await context())),
  );

  server.registerTool(
    'productive_delete',
    {
      title: 'Delete a record',
      description:
        'Delete a record. Needs its own switch beyond ordinary writes, and always returns a staged ' +
        'operation first. Many Productive types are meant to be archived rather than deleted — ' +
        'check productive_describe_resource for an `archive` action before reaching for this.',
      inputSchema: { resource: z.string(), id: z.string() },
      annotations: { readOnlyHint: false, destructiveHint: true },
    },
    async input => wrap(async () => deleteRecord(client, input, await context())),
  );

  server.registerTool(
    'productive_run_action',
    {
      title: 'Run a named action',
      description:
        'Run one of Productive\'s named verbs: archive, restore, close, open, approve, reject, ' +
        'copy, finalize, send, reposition and the rest. Actions named `bulk_*` act on every record ' +
        'the filter matches rather than one, and refuse to run without an explicit filter. ' +
        'productive_describe_resource lists the actions a resource has.',
      inputSchema: {
        resource: z.string(),
        action: z.string().describe('Action name, e.g. "archive", "approve", "send".'),
        id: z.string().optional().describe('Required for actions that act on one record.'),
        attributes: attributesSchema,
        filters: filtersSchema,
      },
      annotations: mutating,
    },
    async input =>
      wrap(async () =>
        runAction(
          client,
          { ...input, filters: input.filters as Record<string, FilterValue> | undefined },
          await context(),
        ),
      ),
  );

  server.registerTool(
    'productive_track_time',
    {
      title: 'Track time',
      description:
        'Log a time entry without looking up what Productive insists on. Time is stored in ' +
        'MINUTES — pass hours and it converts. The service (the budget line the work bills to, not ' +
        'the task) is resolved from the task when not given, and the person is resolved from the ' +
        'authenticated caller, so time lands on the right person even though the server holds one ' +
        'shared token.',
      inputSchema: {
        date: z.string().describe('Date of the work, YYYY-MM-DD.'),
        minutes: z.number().int().optional().describe('Time worked, in minutes.'),
        hours: z.number().optional().describe('Time worked in hours; converted to minutes.'),
        taskId: z.string().optional().describe('Task worked on. Also used to resolve the service.'),
        serviceId: z.string().optional().describe('Service (budget line) to bill to; overrides the task lookup.'),
        personId: z.string().optional().describe('Whose time this is. Defaults to the resolved caller.'),
        note: z.string().optional(),
        billableMinutes: z.number().int().optional().describe('Billable portion, if it differs from the time worked.'),
      },
      annotations: mutating,
    },
    async input => wrap(async () => trackTime(client, input, await context())),
  );

  server.registerTool(
    'productive_commit_operation',
    {
      title: 'Commit a staged operation',
      description:
        'Execute a write that a prepare step staged. Pass the operation object back exactly as it ' +
        'was returned: it is hashed, and an altered operation is refused rather than run. Show the ' +
        'change to the person who asked for it before committing.',
      inputSchema: { operation: preparedOperationSchema },
      annotations: mutating,
    },
    async ({ operation }) =>
      wrap(async () =>
        commitOperation(client, operation as PreparedOperation, await context()),
      ),
  );
}

/** Render a tool result, turning a thrown error into an error result. */
async function wrap(call: () => Promise<unknown>) {
  try {
    const result = await call();
    return {
      content: [{ type: 'text' as const, text: JSON.stringify(result, null, 2) }],
    };
  } catch (error) {
    return {
      isError: true,
      content: [{ type: 'text' as const, text: formatUnknownError(error) }],
    };
  }
}

export { SPEC_FINGERPRINT };
