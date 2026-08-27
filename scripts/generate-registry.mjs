#!/usr/bin/env node
/**
 * Generate src/productive/registry.generated.ts from Productive's published
 * OpenAPI document.
 *
 * Why generate instead of hand-writing: Productive exposes ~650 operations over
 * ~130 resources, and every list endpoint accepts a different set of filter
 * fields, operators and sort keys. Transcribing that by hand would be wrong
 * within a release. The spec states it exactly, so the registry is derived from
 * the spec and committed — CI never needs the network, and a spec change shows
 * up as a reviewable diff.
 *
 * Usage:
 *   node scripts/generate-registry.mjs [path-to-spec.yaml]
 *
 * With no argument the spec is downloaded from SPEC_URL.
 */
import { createHash } from 'node:crypto';
import { readFile, writeFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';
import YAML from 'yaml';

const SPEC_URL = 'https://developer.productive.io/reference/download_spec';
const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const OUT = resolve(ROOT, 'src/productive/registry.generated.ts');

/**
 * Collections whose path is two segments deep. Everything else is keyed on its
 * first path segment, so `/tasks/{id}/reposition` folds into `tasks` as an
 * action rather than becoming a resource of its own.
 */
const TWO_SEGMENT_PREFIXES = new Set(['reports']);

/**
 * Surfaces this server refuses to expose at all — authentication, password
 * changes and Productive's own subscription billing. These are not gated
 * writes: there is no legitimate reason for an assistant to reach them, and
 * leaving them out means no policy bug can re-open them.
 */
const BLOCKED = new Set([
  'passwords',
  'sessions',
  'organization_subscriptions',
  // Unauthenticated share-link endpoints. They take no API token, so routing
  // them through a credentialed server only obscures who is asking.
  'public',
]);

/**
 * Risk tier per resource, gated by a matching switch. `write` is ordinary
 * project work; `financial` touches money, pricing or a legal document;
 * `admin` hands out access or changes how the whole organization behaves.
 *
 * A resource missing from these lists gets `financial` — failing closed, so a
 * resource Productive adds later cannot be written until it is classified.
 */
const TIERS = {
  write: [
    'activities', 'artifacts', 'attachments', 'approval_statuses', 'boards', 'bookings',
    'comments', 'companies', 'contact_entries', 'dashboards', 'deal_statuses', 'deals',
    'deleted_items', 'discussions', 'emails', 'entitlements', 'events', 'filters',
    'folders', 'holiday_calendars', 'holidays', 'lost_reasons', 'notifications', 'pages',
    'page_versions', 'pipelines', 'placeholder_usages', 'placeholders', 'project_assignments',
    'projects', 'pulses', 'report_categories', 'resource_requests', 'sections',
    'service_assignments', 'service_type_assignments', 'service_types', 'services',
    'survey_field_options', 'survey_fields', 'survey_responses', 'surveys', 'tags',
    'task_dependencies', 'task_lists', 'tasks', 'team_memberships', 'teams', 'templates',
    'time_entries', 'time_entry_versions', 'timers', 'timesheets', 'todos', 'widgets',
    'workflow_statuses', 'workflows',
  ],
  financial: [
    'automatic_invoicing_rules', 'bank_accounts', 'bills', 'contracts', 'deal_cost_rates',
    'document_styles', 'document_types', 'einvoice_identities', 'einvoice_transactions',
    'exchange_rates', 'expenses', 'invoice_attributions', 'invoice_templates', 'invoices',
    'kpd_codes', 'line_items', 'overheads', 'payment_reminder_sequences', 'payments',
    'prices', 'proposals', 'purchase_orders', 'rate_cards', 'revenue_distributions',
    'salaries', 'subsidiaries', 'tax_rates',
  ],
  admin: [
    'agent_configs', 'agent_roles', 'agents', 'approval_policies',
    'approval_policy_assignments', 'approval_workflows', 'custom_domains',
    'custom_field_options', 'custom_field_sections', 'custom_fields',
    'integration_exporter_configurations', 'integration_task_management_configurations',
    'integrations', 'invitations', 'job_roles', 'memberships', 'organization_memberships',
    'organizations', 'people', 'roles', 'time_tracking_policies', 'users', 'webhook_logs',
    'webhooks',
  ],
};

/**
 * Individual operations whose tier differs from their resource's.
 *
 * Two kinds live here. Sending an invoice leaves the building, so it keeps the
 * financial gate even where the surrounding resource is ordinary. Reading and
 * dismissing your own notifications sits below `admin`, because that is
 * housekeeping on your own account rather than administration of anyone else's.
 */
const OPERATION_TIERS = {
  'PATCH /organization_memberships/{id}/read_notifications': 'write',
  'PATCH /organization_memberships/{id}/dismiss_notifications': 'write',
  'PATCH /organization_memberships/{id}/clear_notifications': 'write',
};

/**
 * Operations that reach somebody outside the organization the moment they run.
 * Marked so the prepare step can say so out loud, and so a reviewer can find
 * every one of them in a single grep.
 */
const OUTWARD = new Set([
  'PATCH /invoices/{id}/send',
  'PATCH /invoices/{id}/send_einvoice',
  'PATCH /organizations/{id}/resend_code',
  'POST /invitations',
  'PATCH /people/{id}/invite',
  'PATCH /people/{id}/resend',
]);
// Deliberately not here: the `emails` resource is inbound triage (attach,
// dismiss, delete) and sends nothing, and a proposal is delivered through a
// public share link rather than an API send. Both were guessed wrong first and
// caught by assertClassificationsStillMatch.

/** Operations never exposed, even though their resource is. */
const BLOCKED_OPERATIONS = new Set([
  'PATCH /users/{id}/update_password',
  'PUT /sessions/{id}/validate_otp',
]);

const HTTP_METHODS = ['get', 'post', 'put', 'patch', 'delete'];

async function main() {
  const specArg = process.argv[2];
  const raw = specArg
    ? await readFile(resolve(process.cwd(), specArg), 'utf8')
    : await fetchSpec();
  const spec = YAML.parse(raw);
  const specHash = createHash('sha256').update(raw).digest('hex').slice(0, 16);

  const seen = new Set();
  const resources = buildResources(spec, seen);
  assertClassificationsStillMatch(seen);
  await writeFile(OUT, emit(resources, specHash), 'utf8');

  const all = Object.values(resources);
  console.log(
    [
      `Wrote ${OUT}`,
      `  resources: ${all.length}`,
      `  actions:   ${all.reduce((n, r) => n + r.actions.length, 0)}`,
      `  filters:   ${all.reduce((n, r) => n + (r.list?.filters?.length ?? 0), 0)}`,
      `  spec:      ${specHash}`,
    ].join('\n'),
  );
}

async function fetchSpec() {
  const response = await fetch(SPEC_URL);
  if (!response.ok) throw new Error(`Failed to download spec: HTTP ${response.status}`);
  return response.text();
}

/**
 * Every hand-written classification names an operation by `METHOD /path`. If
 * Productive renames a path, that entry stops matching and the operation
 * quietly falls back to its resource's tier — an invoice-send losing its
 * outward flag, say. Failing the build is the only way that gets noticed.
 */
function assertClassificationsStillMatch(seen) {
  const orphans = [
    ...[...OUTWARD].map(id => ['OUTWARD', id]),
    ...[...BLOCKED_OPERATIONS].map(id => ['BLOCKED_OPERATIONS', id]),
    ...Object.keys(OPERATION_TIERS).map(id => ['OPERATION_TIERS', id]),
  ].filter(([, id]) => !seen.has(id));

  if (orphans.length) {
    throw new Error(
      'These classified operations no longer exist in the spec. Re-check them ' +
        'against the current API before regenerating:\n' +
        orphans.map(([list, id]) => `  ${list}: ${id}`).join('\n'),
    );
  }
}

function buildResources(spec, seen) {
  const resources = {};

  for (const [rawPath, item] of Object.entries(spec.paths ?? {})) {
    const path = rawPath.replace(/^\/api\/v2/, '');
    const segments = path.split('/').filter(Boolean);
    const first = segments[0];
    if (!first) continue;

    // Recorded before the blocklist is applied, so a classification pointing at
    // a blocked resource's operation is not mistaken for a stale one.
    for (const method of HTTP_METHODS) {
      if (item[method]) seen.add(`${method.toUpperCase()} ${path}`);
    }

    const key = TWO_SEGMENT_PREFIXES.has(first) ? segments.slice(0, 2).join('/') : first;
    if (BLOCKED.has(first) || BLOCKED.has(key)) continue;

    const collectionPath = `/${key}`;
    const remainder = path.slice(collectionPath.length);

    for (const method of HTTP_METHODS) {
      const op = item[method];
      if (!op) continue;
      const opId = `${method.toUpperCase()} ${path}`;
      if (BLOCKED_OPERATIONS.has(opId)) continue;

      const resource = (resources[key] ??= {
        key,
        path: collectionPath,
        tag: (op.tags ?? [])[0] ?? key,
        tier: tierFor(key),
        actions: [],
      });

      const upper = method.toUpperCase();

      // GET /coll, GET /coll/{id}, POST /coll, PATCH|DELETE /coll/{id} are the
      // five standard shapes the generic tools drive. Everything else — a named
      // verb, or a collection-level PATCH/DELETE that acts on many records at
      // once — becomes an action, so it has to be asked for by name.
      if (remainder === '' && upper === 'GET') {
        resource.list = {
          filters: filtersFor(spec, op),
          sorts: sortsFor(spec, op),
          groups: groupsFor(spec, op),
          relationships: relationshipsFor(spec, op),
        };
      } else if (remainder === '/{id}' && upper === 'GET') {
        resource.get = { relationships: relationshipsFor(spec, op) };
      } else if (remainder === '' && upper === 'POST') {
        resource.create = bodyFor(spec, op);
      } else if (remainder === '/{id}' && upper === 'PATCH') {
        resource.update = bodyFor(spec, op);
      } else if (remainder === '/{id}' && upper === 'DELETE') {
        resource.remove = true;
      } else {
        resource.actions.push({
          id: opId,
          name: actionName(remainder, upper),
          method: upper,
          path,
          summary: (op.summary ?? '').trim(),
          requiresId: remainder.includes('{id}'),
          collectionWide: !remainder.includes('{id}') && upper !== 'POST' ? true : undefined,
          tier: OPERATION_TIERS[opId] ?? tierFor(key),
          outward: OUTWARD.has(opId) ? true : undefined,
          body: bodyFor(spec, op),
        });
      }
    }
  }

  for (const resource of Object.values(resources)) {
    resource.actions.sort((a, b) => a.name.localeCompare(b.name));

    // Collection-wide endpoints borrow the resource's own request body in the
    // spec: `PATCH /time_entries/approve` points at requestBodies/time_entry,
    // whose required list is date + person_id + service_id + time. Those are
    // what it takes to CREATE an entry, not to approve a set of them, and
    // enforcing them makes the bulk verb impossible to call. Where the body is
    // the borrowed one, the attribute list is kept (bulk_update does set
    // fields) and the required list is dropped as not describing this verb.
    const ownRefs = new Set(
      [resource.create?._ref, resource.update?._ref].filter(Boolean),
    );
    for (const action of resource.actions) {
      if (!action.body) continue;
      if (action.collectionWide && ownRefs.has(action.body._ref)) {
        action.body.required = [];
        action.body.borrowedShape = true;
      }
      delete action.body._ref;
    }
    delete resource.create?._ref;
    delete resource.update?._ref;

    // A few resources accept creates only in bulk: `POST /time_entries` takes
    // an array of records, not one. Nothing in the document says so in prose,
    // but the request-body shape does, so it is recorded rather than guessed.
    if (resource.create?.array) resource.createIsBulk = true;
  }

  return Object.fromEntries(Object.entries(resources).sort(([a], [b]) => a.localeCompare(b)));
}

function tierFor(key) {
  for (const [tier, keys] of Object.entries(TIERS)) {
    if (keys.includes(key)) return tier;
  }
  // Reports are read-only, so their tier is never consulted; naming it `write`
  // keeps the type total without implying a report can be written.
  if (key.startsWith('reports/')) return 'write';
  return 'financial';
}

function actionName(remainder, method) {
  const verb = remainder.replace('/{id}', '').replace(/^\//, '');
  // Several verbs exist in both a single-record and a collection-wide form —
  // `/time_entries/{id}/approve` and `/time_entries/approve`. They must not
  // collapse to the same name: one approves the entry you asked about, the
  // other approves everything the filter matches.
  const wide = !remainder.includes('{id}') && method !== 'POST';
  if (verb) return wide ? `bulk_${verb}` : verb;
  if (method === 'PATCH') return 'bulk_update';
  if (method === 'DELETE') return 'bulk_delete';
  return 'bulk';
}

/** Resolve a local $ref against the document. */
function deref(spec, node, depth = 0) {
  if (depth > 20 || !node || typeof node !== 'object') return node;
  if (typeof node.$ref !== 'string') return node;
  const target = node.$ref
    .replace(/^#\//, '')
    .split('/')
    .reduce(
      (acc, part) =>
        acc ? acc[decodeURIComponent(part.replace(/~1/g, '/').replace(/~0/g, '~'))] : undefined,
      spec,
    );
  return deref(spec, target, depth + 1);
}

function paramByName(spec, op, name) {
  for (const entry of op.parameters ?? []) {
    const param = deref(spec, entry);
    if (param?.name === name && param.in === 'query') return param;
  }
  return undefined;
}

/**
 * The filter fields a list endpoint accepts.
 *
 * Only the field names are recorded, not the per-field operator lists the spec
 * also carries. Those were measured against the live API and found unreliable:
 * the spec gives `projects.name` four operators (eq, not_eq, contains,
 * not_contain), but `filter[name][gt]` and `filter[name][lt]` are accepted and
 * do compare, while `gte`, `lte`, `in`, `starts_with`, `blank` and the rest are
 * refused on every field tried. The operator set is global, not per-field — see
 * FILTER_OPERATORS in registry.ts — so shipping the spec's per-field lists would
 * only teach a caller that a working query is unavailable.
 */
function filtersFor(spec, op) {
  const param = paramByName(spec, op, 'filter');
  if (!param) return [];
  const root = deref(spec, param.schema);
  // The oneOf holds the field map and a recursive "Advanced filters" group for
  // $op/AND-OR nesting, in no fixed order — several resources put the group
  // first. Selecting by title rather than by position matters: taking [0]
  // blindly yields a one-key map ($op) and silently drops every real filter.
  const branches = (root?.oneOf ?? []).map(branch => deref(spec, branch));
  const base = branches.find(branch => branch?.title !== 'Advanced filters') ?? root;
  return Object.keys(base?.properties ?? {}).sort();
}

function sortsFor(spec, op) {
  const schema = deref(spec, paramByName(spec, op, 'sort')?.schema);
  const values = schema?.enum ?? deref(spec, schema?.items)?.enum ?? [];
  // Descending variants are the same key with a leading "-". Record the bare
  // keys and let the tool document the prefix, rather than doubling the list.
  return [...new Set(values.filter(value => !String(value).startsWith('-')))].sort();
}

function groupsFor(spec, op) {
  const schema = deref(spec, paramByName(spec, op, 'group')?.schema);
  const values = schema?.enum ?? deref(spec, schema?.items)?.enum ?? [];
  return values.length ? [...new Set(values)].sort() : undefined;
}

/** Writable attributes and relationships for a create/update/action body. */
function bodyFor(spec, op) {
  const bodyRef = typeof op.requestBody?.$ref === 'string' ? op.requestBody.$ref : undefined;
  const body = deref(spec, op.requestBody);
  const media =
    body?.content?.['application/vnd.api+json'] ?? body?.content?.['application/json'];
  const schema = deref(spec, media?.schema);
  if (!schema) return undefined;

  let data = deref(spec, schema.properties?.data);
  let array = false;
  if (data?.type === 'array') {
    array = true;
    data = deref(spec, data.items);
  }
  if (!data) return undefined;

  const attributes = deref(spec, data.properties?.attributes);
  const relationships = deref(spec, data.properties?.relationships);
  const result = {
    required: (attributes?.required ?? []).slice().sort(),
    attributes: Object.keys(attributes?.properties ?? {}).sort(),
    relationships: Object.keys(relationships?.properties ?? {}).sort(),
  };
  if (array) result.array = true;
  if (!result.attributes.length && !result.relationships.length) return undefined;
  // Kept only long enough for buildResources to spot an action reusing the
  // resource's own body; stripped before the registry is emitted.
  if (bodyRef) result._ref = bodyRef;
  return result;
}

/** Relationship names a caller may pass to `include`. */
function relationshipsFor(spec, op) {
  const response = deref(spec, op.responses?.['200'] ?? op.responses?.['201']);
  const media =
    response?.content?.['application/vnd.api+json'] ?? response?.content?.['application/json'];
  const schema = deref(spec, media?.schema);
  let data = deref(spec, schema?.properties?.data);
  if (data?.type === 'array') data = deref(spec, data.items);
  const relationships = deref(spec, data?.properties?.relationships);
  return Object.keys(relationships?.properties ?? {}).sort();
}

function emit(resources, specHash) {
  return [
    '// GENERATED FILE — do not edit by hand.',
    '//',
    "// Produced by scripts/generate-registry.mjs from Productive's published OpenAPI",
    `// document (${SPEC_URL}).`,
    '// Regenerate with `npm run registry:generate`.',
    '//',
    `// Spec fingerprint: ${specHash}`,
    '',
    "import type { GeneratedResource } from './registry-types.js';",
    '',
    `export const SPEC_FINGERPRINT = '${specHash}';`,
    '',
    '/**',
    ' * Operations that reach somebody outside the organization the moment they',
    ' * run. Listed separately from the resources because some of them are plain',
    " * creates rather than named actions — `POST /invitations` sends an email as",
    ' * surely as `PATCH /invoices/{id}/send` does, and the policy layer has to',
    ' * recognise both by operation id.',
    ' */',
    'export const OUTWARD_OPERATIONS: readonly string[] = [',
    ...[...OUTWARD].sort().map(id => `  '${id}',`),
    '];',
    '',
    'export const GENERATED_RESOURCES: Record<string, GeneratedResource> =',
    `${JSON.stringify(resources, null, 2)};`,
    '',
  ].join('\n');
}

main().catch(error => {
  console.error(error);
  process.exit(1);
});
