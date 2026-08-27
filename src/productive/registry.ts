import { GENERATED_RESOURCES, OUTWARD_OPERATIONS, SPEC_FINGERPRINT } from './registry.generated.js';
import type {
  ActionContract,
  BodyContract,
  GeneratedResource,
  Tier,
} from './registry-types.js';
import type { FilterValue } from './client.js';

export { SPEC_FINGERPRINT };
export type { ActionContract, BodyContract, GeneratedResource, Tier };

/**
 * The filter operators Productive accepts — all of them, on any field.
 *
 * Measured against the live API rather than read off the spec, because the two
 * disagree in both directions. The spec lists four operators per field and omits
 * `gt`/`lt`, which do work; and it offers no way to discover that `gte`, `lte`,
 * `in`, `not_in`, `starts_with`, `ends_with`, `blank`, `present`, `like` and
 * `ilike` are all refused with `unsupported_filter_operation`.
 *
 * The absence of `gte`/`lte` is the one that bites. An inclusive range has to
 * use a dedicated field — most date-bearing resources carry `after`/`before` or
 * `<field>_after`/`<field>_before` filters — rather than an operator.
 */
export const FILTER_OPERATORS = ['contains', 'eq', 'gt', 'lt', 'not_contain', 'not_eq'] as const;

const OPERATOR_SET = new Set<string>(FILTER_OPERATORS);

export function resourceKeys(): string[] {
  return Object.keys(GENERATED_RESOURCES);
}

export function allResources(): GeneratedResource[] {
  return Object.values(GENERATED_RESOURCES);
}

export function findResource(key: string): GeneratedResource | undefined {
  return GENERATED_RESOURCES[key];
}

/**
 * Look a resource up, or fail with the nearest names.
 *
 * Naming is where a caller most often guesses: Productive calls them
 * `time_entries` and `organization_memberships`, not `times` or `members`, and
 * a bare "unknown resource" leaves nowhere to go.
 */
export function requireResource(key: string): GeneratedResource {
  const resource = GENERATED_RESOURCES[key];
  if (resource) return resource;
  const near = nearest(key, resourceKeys());
  throw new Error(
    `Unknown resource "${key}".` +
      (near.length ? ` Did you mean: ${near.join(', ')}?` : '') +
      ' Use productive_search_capabilities to find the right name.',
  );
}

export function requireAction(resourceKey: string, name: string): ActionContract {
  const resource = requireResource(resourceKey);
  const action = resource.actions.find(candidate => candidate.name === name);
  if (action) return action;
  const available = resource.actions.map(candidate => candidate.name);
  throw new Error(
    `Resource "${resourceKey}" has no action "${name}". ` +
      (available.length
        ? `Available actions: ${available.join(', ')}.`
        : 'It has no actions — use productive_create, productive_update or productive_delete.'),
  );
}

/** Operations that reach outside the organization, keyed by `METHOD /path`. */
export function isOutwardOperation(operationId: string): boolean {
  return OUTWARD_OPERATIONS.includes(operationId);
}

// ---------------------------------------------------------------------------
// Query validation
// ---------------------------------------------------------------------------

/**
 * Validate a filter object against the resource's filter contract.
 *
 * Productive itself rejects an unknown filter with HTTP 400
 * (`unsupported_filter`), so this is not a correctness backstop — it is a
 * better error, raised before the round trip and naming the keys that do work.
 * The same is true of sort and include.
 */
export function validateFilters(
  resource: GeneratedResource,
  filters: Record<string, FilterValue> | undefined,
  path: string[] = [],
): void {
  if (!filters) return;
  const contract = resource.list?.filters;
  if (!contract) {
    throw new Error(`Resource "${resource.key}" has no list endpoint, so it takes no filters.`);
  }

  for (const [key, value] of Object.entries(filters)) {
    // `$op` and numeric keys are Productive's advanced logical grouping:
    // filter[$op]=and&filter[0][id][eq]=1. The group recurses into the same
    // field vocabulary, so validation recurses with it.
    if (key === '$op') {
      if (value !== 'and' && value !== 'or') {
        throw new Error(`filter${renderPath(path)}[$op] must be "and" or "or", got ${String(value)}.`);
      }
      continue;
    }
    if (/^\d+$/.test(key)) {
      assertObject(value, `filter${renderPath([...path, key])}`);
      validateFilters(resource, value as Record<string, FilterValue>, [...path, key]);
      continue;
    }

    if (!contract.includes(key)) {
      const near = nearest(key, contract);
      throw new Error(
        `Resource "${resource.key}" has no filter "${key}".` +
          (near.length ? ` Did you mean: ${near.join(', ')}?` : '') +
          ` Call productive_describe_resource for the full list (${contract.length} filters).`,
      );
    }

    if (value !== null && typeof value === 'object' && !Array.isArray(value)) {
      for (const operator of Object.keys(value)) {
        if (OPERATOR_SET.has(operator)) continue;
        throw new Error(
          `"${operator}" is not a filter operator Productive accepts. It accepts only: ` +
            `${FILTER_OPERATORS.join(', ')}.` +
            (operator === 'gte' || operator === 'lte'
              ? ' There is no inclusive comparison: use the resource\'s own `after`/`before` filter' +
                ' fields for an inclusive range, or gt/lt with the boundary moved.'
              : ''),
        );
      }
    }
  }
}

export function validateSort(resource: GeneratedResource, sort: string[] | undefined): void {
  if (!sort?.length) return;
  const allowed = resource.list?.sorts ?? [];
  for (const entry of sort) {
    const bare = entry.startsWith('-') ? entry.slice(1) : entry;
    if (!allowed.includes(bare)) {
      const near = nearest(bare, allowed);
      throw new Error(
        `Resource "${resource.key}" cannot sort by "${bare}".` +
          (near.length ? ` Did you mean: ${near.join(', ')}?` : '') +
          (allowed.length ? '' : ' It supports no sort keys.'),
      );
    }
  }
}

export function validateInclude(
  resource: GeneratedResource,
  include: string[] | undefined,
  forSingle = false,
): void {
  if (!include?.length) return;
  const allowed = (forSingle ? resource.get?.relationships : resource.list?.relationships) ?? [];
  for (const entry of include) {
    // Nested includes (`service.project`) are valid JSON:API; only the first
    // segment can be checked against this resource's own relationships.
    const head = entry.split('.')[0] ?? entry;
    if (!allowed.includes(head)) {
      const near = nearest(head, allowed);
      throw new Error(
        `Resource "${resource.key}" has no relationship "${head}" to include.` +
          (near.length ? ` Did you mean: ${near.join(', ')}?` : '') +
          ` Available: ${allowed.join(', ') || '(none)'}.`,
      );
    }
  }
}

export function validateGroup(resource: GeneratedResource, group: string | undefined): void {
  if (!group) return;
  const allowed = resource.list?.groups;
  if (!allowed?.length) {
    throw new Error(
      `Resource "${resource.key}" does not support grouping. Grouping is a report feature — see the reports/* resources.`,
    );
  }
  if (!allowed.includes(group)) {
    throw new Error(
      `Report "${resource.key}" cannot group by "${group}". It groups by: ${allowed.join(', ')}.`,
    );
  }
}

// ---------------------------------------------------------------------------
// Write validation
// ---------------------------------------------------------------------------

export interface ValidatedBody {
  attributes: Record<string, unknown>;
  relationships?: Record<string, unknown>;
}

/**
 * Validate a create or update body against the resource's own contract.
 *
 * Unlike filters, this one carries real weight. Verified live: Productive
 * accepts an unknown attribute on PATCH with **HTTP 200 and applies nothing**,
 * so a misspelled field name is indistinguishable from a successful write in
 * the response. Anything not in the spec's attribute list for the operation is
 * therefore refused here rather than reported back as done.
 */
export function validateBody(
  contract: BodyContract | undefined,
  input: { attributes?: Record<string, unknown>; relationships?: Record<string, unknown> },
  options: { requireRequired: boolean; what: string },
): ValidatedBody {
  if (!contract) {
    throw new Error(`${options.what} takes no attributes.`);
  }

  const attributes = input.attributes ?? {};
  const relationships = input.relationships ?? {};

  for (const name of Object.keys(attributes)) {
    // Custom fields ride in as a single `custom_fields` map keyed by field id,
    // so the map itself is the allowlisted attribute and its keys are not
    // checked here — see productive_describe_custom_fields.
    if (contract.attributes.includes(name)) continue;
    const near = nearest(name, contract.attributes);
    throw new Error(
      `${options.what} has no attribute "${name}".` +
        (near.length ? ` Did you mean: ${near.join(', ')}?` : '') +
        ' Productive answers 200 and silently ignores unknown attributes, so this is refused' +
        ' here rather than reported as a successful write.',
    );
  }

  for (const name of Object.keys(relationships)) {
    if (contract.relationships.includes(name)) continue;
    const near = nearest(name, contract.relationships);
    throw new Error(
      `${options.what} has no relationship "${name}".` +
        (near.length ? ` Did you mean: ${near.join(', ')}?` : '') +
        ` Accepted: ${contract.relationships.join(', ') || '(none)'}.` +
        ' Most links are set through an `_id` attribute instead.',
    );
  }

  if (options.requireRequired) {
    const missing = contract.required.filter(name => attributes[name] === undefined);
    if (missing.length) {
      throw new Error(
        `${options.what} requires: ${missing.join(', ')}. Productive rejects the call without them (HTTP 422).`,
      );
    }
  }

  return {
    attributes,
    relationships: Object.keys(relationships).length ? relationships : undefined,
  };
}

// ---------------------------------------------------------------------------
// Description and search
// ---------------------------------------------------------------------------

export interface ResourceDescription {
  resource: string;
  productiveName: string;
  path: string;
  tier: Tier;
  operations: string[];
  list?: {
    filters: string[];
    /** Every filter field accepts every one of these, and nothing else. */
    filterOperators: readonly string[];
    sorts: string[];
    groups?: string[];
    include: string[];
  };
  create?: BodyContract;
  update?: BodyContract;
  actions: Array<Pick<ActionContract, 'name' | 'method' | 'summary' | 'tier' | 'requiresId'> & {
    collectionWide?: true;
    outward?: true;
    attributes?: string[];
    required?: string[];
  }>;
  notes: string[];
}

export function describeResource(key: string): ResourceDescription {
  const resource = requireResource(key);
  const operations: string[] = [];
  if (resource.list) operations.push('list');
  if (resource.get) operations.push('get');
  if (resource.create) operations.push('create');
  if (resource.update) operations.push('update');
  if (resource.remove) operations.push('delete');
  if (resource.actions.length) operations.push(`${resource.actions.length} action(s)`);

  const notes: string[] = [];
  if (resource.list) {
    notes.push(
      `Filters accept only these operators, on any field: ${FILTER_OPERATORS.join(', ')}. ` +
        'There is no gte/lte — for an inclusive date range use the after/before filter fields ' +
        'where the resource has them.',
    );
  }
  if (!resource.list) {
    notes.push('No collection endpoint: records are fetched by id only.');
  }
  if (resource.createIsBulk) {
    notes.push('Creating takes an array of records — Productive documents this collection as bulk-only.');
  }
  if (resource.remove) {
    notes.push(
      'Deletes are gated separately from other writes (PRODUCTIVE_ENABLE_DELETES). Some types land in `deleted_items` and can be restored; verified for tasks.',
    );
  }
  if (resource.actions.some(action => action.outward)) {
    notes.push('One or more actions reach outside the organization — see the `outward` flag.');
  }
  if (resource.actions.some(action => action.collectionWide)) {
    notes.push('Actions named `bulk_*` act on every record the filter matches, not one record.');
  }

  return {
    resource: resource.key,
    productiveName: resource.tag,
    path: resource.path,
    tier: resource.tier,
    operations,
    list: resource.list && {
      filters: resource.list.filters,
      filterOperators: FILTER_OPERATORS,
      sorts: resource.list.sorts,
      groups: resource.list.groups,
      include: resource.list.relationships,
    },
    create: resource.create,
    update: resource.update,
    actions: resource.actions.map(action => ({
      name: action.name,
      method: action.method,
      summary: action.summary,
      tier: action.tier,
      requiresId: action.requiresId,
      collectionWide: action.collectionWide,
      outward: action.outward,
      attributes: action.body?.attributes,
      required: action.body?.required?.length ? action.body.required : undefined,
    })),
    notes,
  };
}

export interface ResourceMatch {
  resource: string;
  productiveName: string;
  tier: Tier;
  operations: string[];
  actions: string[];
}

/**
 * Search resources by key, Productive's own name for them, and their filter
 * vocabulary. Filter names are included on purpose: somebody looking for
 * "budget" should find `deals`, which is what Productive calls a budget.
 */
export function searchResources(query: string, limit = 15): ResourceMatch[] {
  const needle = query.trim().toLowerCase();
  const scored = allResources()
    .map(resource => ({ resource, score: score(resource, needle) }))
    .filter(entry => entry.score > 0)
    .sort((a, b) => b.score - a.score || a.resource.key.localeCompare(b.resource.key))
    .slice(0, limit);

  return scored.map(({ resource }) => ({
    resource: resource.key,
    productiveName: resource.tag,
    tier: resource.tier,
    operations: [
      resource.list && 'list',
      resource.get && 'get',
      resource.create && 'create',
      resource.update && 'update',
      resource.remove && 'delete',
    ].filter((value): value is string => typeof value === 'string'),
    actions: resource.actions.map(action => action.name),
  }));
}

function score(resource: GeneratedResource, needle: string): number {
  if (!needle) return 1;
  const key = resource.key.toLowerCase();
  const tag = resource.tag.toLowerCase();
  if (key === needle || tag === needle) return 100;
  if (key.includes(needle)) return 60;
  if (tag.includes(needle)) return 50;
  if (resource.actions.some(action => action.name.includes(needle))) return 30;
  if ((resource.list?.filters ?? []).some(field => field.includes(needle))) return 10;
  if (resource.create?.attributes.some(attribute => attribute.includes(needle))) return 5;
  return 0;
}

// ---------------------------------------------------------------------------

function assertObject(value: unknown, what: string): void {
  if (value === null || typeof value !== 'object' || Array.isArray(value)) {
    throw new Error(`${what} must be an object.`);
  }
}

function renderPath(path: string[]): string {
  return path.map(segment => `[${segment}]`).join('');
}

/** Up to three closest candidates by edit distance, for typo suggestions. */
function nearest(value: string, candidates: string[], limit = 3): string[] {
  const needle = value.toLowerCase();
  return candidates
    .map(candidate => ({ candidate, distance: distance(needle, candidate.toLowerCase()) }))
    .filter(entry => entry.distance <= Math.max(2, Math.floor(needle.length / 3)))
    .sort((a, b) => a.distance - b.distance || a.candidate.localeCompare(b.candidate))
    .slice(0, limit)
    .map(entry => entry.candidate);
}

function distance(a: string, b: string): number {
  if (a === b) return 0;
  // Substring hits are what a caller usually means (`time_entry` for
  // `time_entries`), and plain Levenshtein ranks them too far apart to survive
  // the cutoff on long names.
  if (a.includes(b) || b.includes(a)) return 1;

  let previous = Array.from({ length: b.length + 1 }, (_, index) => index);
  for (let i = 1; i <= a.length; i += 1) {
    const current = [i];
    for (let j = 1; j <= b.length; j += 1) {
      current[j] = Math.min(
        (previous[j] ?? 0) + 1,
        (current[j - 1] ?? 0) + 1,
        (previous[j - 1] ?? 0) + (a[i - 1] === b[j - 1] ? 0 : 1),
      );
    }
    previous = current;
  }
  return previous[b.length] ?? Number.MAX_SAFE_INTEGER;
}
