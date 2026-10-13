import { MAX_PAGE_SIZE, type FilterValue, type ProductiveClient } from './client.js';
import { flattenCollection, flattenSingle, type FlatCollection, type FlatRecord } from './jsonapi.js';
import {
  describeResource,
  isOutwardOperation,
  requireAction,
  requireResource,
  validateBody,
  validateFilters,
  validateGroup,
  validateInclude,
  validateSort,
  type GeneratedResource,
} from './registry.js';
import {
  checkPolicy,
  describePolicy,
  loadPolicy,
  perUserAuthEnabled,
  requiresTwoStep,
  type ProductivePolicy,
} from './policy.js';
import { prepareOperation, verifyPreparedOperation, type PreparedOperation } from './operations.js';
import { audited } from './audit.js';
import { assertSafePathSegment, encodePathSegment } from './path-params.js';
import type { CallerIdentity } from './identity.js';
import type { HttpMethod, Tier } from './registry-types.js';

export interface ExecutionContext {
  policy?: ProductivePolicy;
  identity?: CallerIdentity;
  /**
   * The caller as forwarded by the gateway. A staged operation is bound to it,
   * so only the caller who prepared a change can commit it.
   */
  user?: string;
}

/** Either the write happened, or it was staged and needs committing. */
export type WriteOutcome =
  | { status: 'done'; record: FlatRecord | null; raw?: unknown }
  | { status: 'staged'; operation: PreparedOperation; next: string };

// ---------------------------------------------------------------------------
// Reads
// ---------------------------------------------------------------------------

export interface ListInput {
  resource: string;
  filters?: Record<string, FilterValue>;
  sort?: string[];
  group?: string;
  include?: string[];
  page?: { number?: number; size?: number };
  /** Return Productive's JSON:API envelope untouched instead of flat records. */
  raw?: boolean;
}

export async function listRecords(
  client: ProductiveClient,
  input: ListInput,
  context: ExecutionContext = {},
): Promise<FlatCollection | unknown> {
  const resource = requireResource(input.resource);
  if (!resource.list) {
    throw new Error(
      `Resource "${resource.key}" has no collection endpoint. Read it by id with productive_get.`,
    );
  }
  gate(resource, 'list', false, context);

  validateFilters(resource, input.filters);
  validateSort(resource, input.sort);
  validateGroup(resource, input.group);
  validateInclude(resource, input.include);

  const response = await client.request({
    path: resource.path,
    filters: input.filters,
    sort: input.sort,
    group: input.group,
    include: input.include,
    page: { number: input.page?.number, size: input.page?.size ?? 50 },
  });

  return input.raw ? response : flattenCollection(response);
}

export interface GetInput {
  resource: string;
  id: string;
  include?: string[];
  raw?: boolean;
}

export async function getRecord(
  client: ProductiveClient,
  input: GetInput,
  context: ExecutionContext = {},
): Promise<FlatRecord | null | unknown> {
  const resource = requireResource(input.resource);
  if (!resource.get) {
    throw new Error(`Resource "${resource.key}" cannot be fetched by id.`);
  }
  gate(resource, 'get', false, context);
  validateInclude(resource, input.include, true);

  const response = await client.request({
    path: `${resource.path}/${encodePathSegment(input.id)}`,
    include: input.include,
  });

  return input.raw ? response : flattenSingle(response);
}

/**
 * Custom fields, with the id each value is written under.
 *
 * Productive stores custom-field values in one `custom_fields` map keyed by the
 * field's numeric id. The name a person sees in the UI is not the key and is
 * silently ignored if used as one, so the ids have to come from somewhere —
 * this is that somewhere.
 */
export async function describeCustomFields(
  client: ProductiveClient,
  options: { appliesTo?: string } = {},
): Promise<{
  fields: Array<Record<string, unknown>>;
  appliesToValues: string[];
  howToWrite: string;
  notes: string[];
}> {
  // The includable relationship is `options`, not `custom_field_options` —
  // the latter is the resource name and Productive answers 400 for it.
  const response = await client.request({
    path: '/custom_fields',
    include: ['options'],
    page: { size: MAX_PAGE_SIZE },
  });
  const flat = flattenCollection(response);

  const needle = options.appliesTo?.toLowerCase();
  const all = flat.records.map(field => {
    const relationships = (field.relationships ?? {}) as Record<string, unknown>;
    const choices = relationships.options;
    return {
      id: field.id,
      name: field.name,
      /**
       * Productive's own word for the object the field hangs off. It is not the
       * resource key: a field on people reports `employees`, so this is passed
       * through verbatim rather than translated into something that looks
       * authoritative and is wrong.
       */
      appliesTo: field.customizable_type,
      dataTypeId: field.data_type_id,
      required: field.required,
      sensitive: field.sensitive,
      archived: Boolean(field.archived_at),
      options: Array.isArray(choices)
        ? choices.map(choice => {
            const option = choice as Record<string, unknown>;
            return { id: option.id, name: option.name ?? option.value };
          })
        : undefined,
    };
  });

  const fields = needle
    ? all.filter(field => String(field.appliesTo ?? '').toLowerCase().includes(needle))
    : all;

  return {
    fields,
    appliesToValues: [
      ...new Set(all.map(field => String(field.appliesTo ?? '')).filter(Boolean)),
    ].sort(),
    howToWrite:
      'Write values as attributes.custom_fields = { "<id>": <value> } using the ids above. ' +
      'The display name is not a valid key: Productive answers 200 and stores nothing.',
    notes: [
      'appliesTo is Productive\'s vocabulary, not this server\'s resource keys — fields on people report "employees". Filter on the values listed in appliesToValues.',
      'dataTypeId is an integer 1-8 whose meaning Productive does not publish, so it is reported raw. A field with `options` is a choice field; write one of the option values.',
    ],
  };
}

/**
 * Who the token is, which organization it is pinned to, and what may be written.
 *
 * The owner comes from `GET /users`, which is Productive's de-facto "me": it
 * returns exactly one record, the caller. There is no `/users/me` — that path
 * 404s. An earlier version read the first row of `/organization_memberships`
 * instead, which is wrong for a subtle reason worth recording: that collection
 * is not scoped to the pinned organization at all. It lists the CALLER's
 * memberships across every organization they belong to, so its row count says
 * nothing about how many people are in this one.
 */
export async function checkConnection(
  client: ProductiveClient,
  context: ExecutionContext = {},
): Promise<Record<string, unknown>> {
  const owner = await tokenOwner(client);

  // The same token commonly reaches several organizations, gated only by the
  // header — so listing them is the honest way to show what the pin is holding
  // back, rather than implying the token could only ever see one.
  let reachable: unknown = 'could not be listed';
  try {
    const orgs = flattenCollection(
      await client.request({ path: '/organizations', page: { size: MAX_PAGE_SIZE } }),
    );
    reachable = orgs.records.map(org => ({
      organizationId: org.id,
      name: org.name,
      pinned: org.id === client.organization,
    }));
  } catch {
    // Not fatal: the connection is already proven by the owner lookup.
  }

  return {
    ok: true,
    organizationId: client.organization,
    tokenBelongsTo: owner,
    reachableOrganizations: reachable,
    caller: context.identity
      ? {
          email: context.identity.email,
          personId: context.identity.personId,
          resolved: context.identity.resolved,
          note: context.identity.note,
        }
      : 'not forwarded (PRODUCTIVE_TRUST_FORWARDED_USER is off, or no gateway header)',
    permissions: describePolicy(context.policy ?? loadPolicy()),
    attribution: perUserAuthEnabled()
      ? 'Per-user auth is on: each caller acts with their own Productive token, so Productive credits changes to them.'
      : 'Productive records every change against the token owner above, whatever the caller. ' +
        'Person-shaped fields default to the resolved caller where one is known.',
  };
}

/** The person a token belongs to, via Productive's single-row /users. */
export async function tokenOwner(
  client: ProductiveClient,
): Promise<Record<string, unknown> | undefined> {
  const response = await client.request({ path: '/users' });
  const user = flattenCollection(response).records[0];
  if (!user) return undefined;
  return {
    userId: user.id,
    email: user.email,
    name: [user.first_name, user.last_name].filter(Boolean).join(' ') || undefined,
    defaultOrganizationId: user.default_organization_id,
  };
}

// ---------------------------------------------------------------------------
// Writes
// ---------------------------------------------------------------------------

export interface CreateInput {
  resource: string;
  attributes?: Record<string, unknown>;
  relationships?: Record<string, unknown>;
}

export async function createRecord(
  client: ProductiveClient,
  input: CreateInput,
  context: ExecutionContext = {},
): Promise<WriteOutcome> {
  const resource = requireResource(input.resource);
  if (!resource.create) {
    throw new Error(`Resource "${resource.key}" cannot be created through the API.`);
  }
  gate(resource, 'create', true, context);

  const body = validateBody(resource.create, input, {
    requireRequired: true,
    what: `Creating a "${resource.key}"`,
  });
  const operationId = `POST ${resource.path}`;
  const outward = isOutwardOperation(operationId);

  return dispatch(client, {
    operation: 'create',
    resource: resource.key,
    tier: resource.tier,
    method: 'POST',
    path: resource.path,
    body: jsonApiBody(resource, body, undefined),
    effect: `Create a new ${resource.tag} record.`,
    warnings: outward
      ? ['This reaches somebody outside the organization as soon as it runs.']
      : [],
    twoStep: requiresTwoStep({ tier: resource.tier, outward }),
    context,
  });
}

export interface UpdateInput {
  resource: string;
  id: string;
  attributes?: Record<string, unknown>;
  relationships?: Record<string, unknown>;
}

export async function updateRecord(
  client: ProductiveClient,
  input: UpdateInput,
  context: ExecutionContext = {},
): Promise<WriteOutcome> {
  const resource = requireResource(input.resource);
  if (!resource.update) {
    throw new Error(`Resource "${resource.key}" cannot be updated through the API.`);
  }
  gate(resource, 'update', true, context);

  const body = validateBody(resource.update, input, {
    requireRequired: false,
    what: `Updating a "${resource.key}"`,
  });
  const path = `${resource.path}/${encodePathSegment(input.id)}`;

  return dispatch(client, {
    operation: 'update',
    resource: resource.key,
    tier: resource.tier,
    method: 'PATCH',
    path,
    body: jsonApiBody(resource, body, input.id),
    effect:
      `Update ${resource.tag} ${input.id}: set ${Object.keys(body.attributes).join(', ') || '(nothing)'}. ` +
      'Attributes not listed keep their current values.',
    twoStep: requiresTwoStep({ tier: resource.tier }),
    context,
  });
}

export async function deleteRecord(
  client: ProductiveClient,
  input: { resource: string; id: string },
  context: ExecutionContext = {},
): Promise<WriteOutcome> {
  const resource = requireResource(input.resource);
  if (!resource.remove) {
    throw new Error(
      `Resource "${resource.key}" cannot be deleted through the API. Many Productive types are archived instead — check productive_describe_resource for an "archive" action.`,
    );
  }
  gate(resource, 'delete', true, context);

  return dispatch(client, {
    operation: 'delete',
    resource: resource.key,
    tier: resource.tier,
    method: 'DELETE',
    path: `${resource.path}/${encodePathSegment(input.id)}`,
    effect: `Delete ${resource.tag} ${input.id}.`,
    warnings: [
      'Deletion. Some Productive types appear in `deleted_items` afterwards and can be restored (verified for tasks), but this is not guaranteed for every type — check before relying on it.',
    ],
    // Always staged, regardless of tier.
    twoStep: true,
    context,
  });
}

export interface ActionInput {
  resource: string;
  action: string;
  id?: string;
  attributes?: Record<string, unknown>;
  /** Selects the records a bulk_* action applies to. */
  filters?: Record<string, FilterValue>;
}

export async function runAction(
  client: ProductiveClient,
  input: ActionInput,
  context: ExecutionContext = {},
): Promise<WriteOutcome> {
  const resource = requireResource(input.resource);
  const action = requireAction(input.resource, input.action);

  if (action.requiresId && !input.id) {
    throw new Error(`Action "${action.name}" on "${resource.key}" needs an id.`);
  }
  if (action.collectionWide && !input.filters) {
    throw new Error(
      `Action "${action.name}" on "${resource.key}" acts on every record the filter matches, ` +
        'so it will not run without an explicit `filters` argument. Pass the filter that selects the records you mean.',
    );
  }

  const isRead = action.method === 'GET';
  gate(resource, `action:${action.name}`, !isRead, context, action.tier, action.method === 'DELETE');

  const body = action.body
    ? validateBody(action.body, { attributes: input.attributes }, {
        requireRequired: true,
        what: `Action "${action.name}" on "${resource.key}"`,
      })
    : undefined;

  const path = action.path.includes('{id}')
    ? action.path.replace('{id}', encodePathSegment(input.id))
    : action.path;

  if (isRead) {
    const response = await client.request({ method: 'GET', path, filters: input.filters });
    return { status: 'done', record: flattenSingle(response), raw: response };
  }

  const warnings: string[] = [];
  if (action.outward) {
    warnings.push(
      'This leaves the organization the moment it runs — the recipient is a person outside it. Do not run it unless it was explicitly asked for.',
    );
  }
  if (action.collectionWide) {
    warnings.push(
      'This acts on EVERY record matching the filter, not one. Confirm the count with productive_list using the same filter first.',
    );
  }

  return dispatch(client, {
    operation: `action:${action.name}`,
    resource: resource.key,
    tier: action.tier,
    method: action.method,
    path,
    filters: input.filters,
    body: body ? jsonApiBody(resource, body, input.id) : undefined,
    effect: action.summary || `Run "${action.name}" on ${resource.tag}${input.id ? ` ${input.id}` : ''}.`,
    warnings,
    twoStep: requiresTwoStep({
      tier: action.tier,
      isDelete: action.method === 'DELETE',
      collectionWide: action.collectionWide,
      outward: action.outward,
    }),
    context,
  });
}

/**
 * Execute a staged operation.
 *
 * Nothing that decides what is sent or whether it is allowed is taken on trust
 * from the payload. The signature, expiry and owner are verified; then the HTTP
 * method and path template are derived again from the registry for the
 * resource and operation, the supplied path must be that template with only a
 * safe id substituted, and every policy check runs again against the derived
 * tier and method.
 */
export async function commitOperation(
  client: ProductiveClient,
  staged: PreparedOperation,
  context: ExecutionContext = {},
): Promise<{ status: 'done'; record: FlatRecord | null; raw?: unknown }> {
  const operation = verifyPreparedOperation(staged, { actingAs: context.user });
  const resource = requireResource(operation.resource);
  const expected = expectedRequest(resource, operation.operation);

  if (operation.method !== expected.method) {
    throw new Error(
      `Refused: "${operation.operation}" on "${resource.key}" is ${expected.method}, not ${operation.method}.`,
    );
  }
  if (expected.method === 'GET') {
    throw new Error('Refused: read actions are not staged and cannot be committed.');
  }
  assertPathMatchesTemplate(operation.path, expected.template);
  if (operation.filters !== undefined && !expected.allowsFilters) {
    throw new Error(`Refused: "${operation.operation}" does not take filters.`);
  }
  if (operation.operation === 'delete' && operation.body !== undefined) {
    throw new Error('Refused: a delete does not take a body.');
  }

  const tier = expected.tier;
  const isDelete = expected.method === 'DELETE';
  const decision = checkPolicy(
    {
      resource: resource.key,
      tier,
      operation: operation.operation,
      isMutation: true,
      isDelete,
    },
    context.policy,
  );
  if (!decision.allowed) {
    throw new Error(`Refused: ${decision.reason}`);
  }

  const response = await audited(
    {
      tool: 'productive_commit_operation',
      resource: resource.key,
      operation: operation.operation,
      method: expected.method,
      path: operation.path,
      tier,
      user: context.identity?.email ?? context.user,
      organizationId: client.organization,
      allowed: true,
      reason: decision.reason,
      operationHash: operation.operationHash,
    },
    () =>
      client.request({
        method: expected.method,
        path: operation.path,
        filters: operation.filters,
        body: operation.body,
      }),
  );

  return { status: 'done', record: flattenSingle(response), raw: response };
}

interface ExpectedRequest {
  method: HttpMethod;
  /** Path template from the registry, with `{id}` where an id belongs. */
  template: string;
  tier: Tier;
  allowsFilters: boolean;
}

/** The request the registry says an operation on a resource makes. */
function expectedRequest(resource: GeneratedResource, operation: string): ExpectedRequest {
  switch (operation) {
    case 'create':
      if (!resource.create) break;
      return { method: 'POST', template: resource.path, tier: resource.tier, allowsFilters: false };
    case 'update':
      if (!resource.update) break;
      return {
        method: 'PATCH',
        template: `${resource.path}/{id}`,
        tier: resource.tier,
        allowsFilters: false,
      };
    case 'delete':
      if (!resource.remove) break;
      return {
        method: 'DELETE',
        template: `${resource.path}/{id}`,
        tier: resource.tier,
        allowsFilters: false,
      };
    default:
      if (operation.startsWith('action:')) {
        const action = requireAction(resource.key, operation.slice('action:'.length));
        return { method: action.method, template: action.path, tier: action.tier, allowsFilters: true };
      }
  }
  throw new Error(`Refused: "${operation}" is not an operation "${resource.key}" supports.`);
}

/** The path must be the template with nothing but a safe id put into `{id}`. */
function assertPathMatchesTemplate(path: string, template: string): void {
  const marker = template.indexOf('{id}');
  if (marker === -1) {
    if (path !== template) {
      throw new Error(`Refused: the path ${path} does not match the registry path ${template}.`);
    }
    return;
  }
  const prefix = template.slice(0, marker);
  const suffix = template.slice(marker + '{id}'.length);
  if (
    typeof path !== 'string' ||
    !path.startsWith(prefix) ||
    !path.endsWith(suffix) ||
    path.length <= prefix.length + suffix.length
  ) {
    throw new Error(`Refused: the path ${path} does not match the registry path ${template}.`);
  }
  const encoded = path.slice(prefix.length, path.length - suffix.length);
  let decoded: string;
  try {
    decoded = decodeURIComponent(encoded);
  } catch {
    throw new Error(`Refused: the path ${path} carries a malformed id.`);
  }
  assertSafePathSegment(decoded);
  if (encodeURIComponent(decoded) !== encoded) {
    throw new Error(`Refused: the path ${path} does not match the registry path ${template}.`);
  }
}

// ---------------------------------------------------------------------------
// Time tracking
// ---------------------------------------------------------------------------

export interface TrackTimeInput {
  /** Minutes. Productive's `time` field is minutes; hours is the usual mistake. */
  minutes?: number;
  hours?: number;
  date: string;
  taskId?: string;
  serviceId?: string;
  personId?: string;
  note?: string;
  billableMinutes?: number;
}

/**
 * Log a time entry, resolving what Productive insists on but a caller rarely
 * knows.
 *
 * Three things make the raw endpoint awkward. `time` is minutes, and an entry
 * of "2" for two hours is silently two minutes. `service_id` is mandatory and
 * is the billable budget line, not the task — but it hangs off the task, so it
 * can be looked up. And `person_id` is mandatory, which with one shared token
 * means every entry lands on the token owner unless the real caller is known.
 */
export async function trackTime(
  client: ProductiveClient,
  input: TrackTimeInput,
  context: ExecutionContext = {},
): Promise<WriteOutcome> {
  const resource = requireResource('time_entries');
  gate(resource, 'create', true, context);

  const minutes = resolveMinutes(input);
  const personId = input.personId ?? context.identity?.personId;
  if (!personId) {
    throw new Error(
      'No person to log against. ' +
        (context.identity
          ? `The caller could not be resolved to a Productive person: ${context.identity.note ?? 'unknown reason'}`
          : 'The gateway forwarded no caller identity.') +
        ' Pass personId explicitly — Productive requires one and will not infer it from the token.',
    );
  }

  let serviceId = input.serviceId;
  if (!serviceId) {
    if (!input.taskId) {
      throw new Error(
        'Pass serviceId, or a taskId to resolve it from. Productive bills time to a service (the budget line), not to a task, and requires it on every entry.',
      );
    }
    serviceId = await serviceForTask(client, input.taskId);
  }

  const attributes: Record<string, unknown> = {
    date: input.date,
    time: minutes,
    person_id: personId,
    service_id: serviceId,
  };
  if (input.note) attributes.note = input.note;
  if (input.billableMinutes !== undefined) attributes.billable_time = input.billableMinutes;
  if (input.taskId) attributes.task_id = input.taskId;

  const body = validateBody(resource.create, { attributes }, {
    requireRequired: true,
    what: 'Creating a "time_entries"',
  });

  return dispatch(client, {
    operation: 'create',
    resource: resource.key,
    tier: resource.tier,
    method: 'POST',
    path: resource.path,
    body: jsonApiBody(resource, body, undefined),
    effect: `Log ${minutes} minutes on ${input.date} for person ${personId} against service ${serviceId}.`,
    twoStep: requiresTwoStep({ tier: resource.tier }),
    context,
  });
}

function resolveMinutes(input: TrackTimeInput): number {
  if (input.minutes !== undefined && input.hours !== undefined) {
    throw new Error('Pass either minutes or hours, not both.');
  }
  if (input.minutes !== undefined) return Math.round(input.minutes);
  if (input.hours !== undefined) return Math.round(input.hours * 60);
  throw new Error('Pass minutes (or hours) — Productive stores time entries in minutes.');
}

async function serviceForTask(client: ProductiveClient, taskId: string): Promise<string> {
  const response = await client.request({
    path: `/tasks/${encodePathSegment(taskId, 'taskId')}`,
  });
  const task = flattenSingle(response);
  const service = (task?.relationships as Record<string, FlatRecord> | undefined)?.service;
  if (!service?.id) {
    throw new Error(
      `Task ${taskId} has no service attached, so there is no budget line to bill the time to. ` +
        'Set a service on the task in Productive, or pass serviceId explicitly.',
    );
  }
  return service.id;
}

// ---------------------------------------------------------------------------
// Shared plumbing
// ---------------------------------------------------------------------------

interface DispatchInput {
  operation: string;
  resource: string;
  tier: Tier;
  method: HttpMethod;
  path: string;
  filters?: Record<string, FilterValue>;
  body?: unknown;
  effect: string;
  warnings?: string[];
  twoStep: boolean;
  context: ExecutionContext;
}

/** Stage the write, or run it and audit it. */
async function dispatch(
  client: ProductiveClient,
  input: DispatchInput,
): Promise<WriteOutcome> {
  if (input.twoStep) {
    return {
      status: 'staged',
      operation: prepareOperation({
        operation: input.operation,
        resource: input.resource,
        method: input.method,
        path: input.path,
        tier: input.tier,
        filters: input.filters,
        body: input.body,
        effect: input.effect,
        warnings: input.warnings,
        actingAs: input.context.user,
      }),
      next:
        'Nothing has been sent to Productive. Show this change, then pass the whole operation object ' +
        'unchanged to productive_commit_operation to run it.',
    };
  }

  const response = await audited(
    {
      tool: `productive_${input.operation}`,
      resource: input.resource,
      operation: input.operation,
      method: input.method,
      path: input.path,
      tier: input.tier,
      user: input.context.identity?.email,
      organizationId: client.organization,
      allowed: true,
    },
    () =>
      client.request({
        method: input.method,
        path: input.path,
        filters: input.filters,
        body: input.body,
      }),
  );

  return { status: 'done', record: flattenSingle(response), raw: response };
}

/**
 * JSON:API request body.
 *
 * `type` is set from the resource even though Productive does not check it —
 * verified live: a task patched with `type: "projects"` returned 200 and applied
 * the change anyway. Sending the right one costs nothing and keeps the request
 * honest against a stricter future.
 */
function jsonApiBody(
  resource: GeneratedResource,
  body: { attributes: Record<string, unknown>; relationships?: Record<string, unknown> },
  id: string | undefined,
): unknown {
  return {
    data: {
      type: resource.key,
      ...(id ? { id } : {}),
      attributes: body.attributes,
      ...(body.relationships ? { relationships: body.relationships } : {}),
    },
  };
}

function gate(
  resource: GeneratedResource,
  operation: string,
  isMutation: boolean,
  context: ExecutionContext,
  tierOverride?: Tier,
  isDelete: boolean = operation === 'delete',
): void {
  const decision = checkPolicy(
    {
      resource: resource.key,
      tier: tierOverride ?? resource.tier,
      operation,
      isMutation,
      isDelete,
    },
    context.policy,
  );
  if (!decision.allowed) {
    throw new Error(
      `Refused: ${decision.reason}. See productive_check_connection for what this deployment allows.`,
    );
  }
}

export { describeResource };
