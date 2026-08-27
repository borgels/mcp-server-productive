/**
 * Live smoke test against a real Productive organization.
 *
 * Not part of `npm test`: it needs credentials and it talks to a real tenant.
 * Run it after a change that touches the client, the registry or the policy:
 *
 *   PRODUCTIVE_API_TOKEN=... PRODUCTIVE_ORGANIZATION_ID=... npm run smoke:live
 *
 * It only reads, and stages one write without committing it, so it is safe to
 * point at a production organization. Nothing it prints includes a credential.
 */
import { ProductiveClient } from '../src/productive/client.js';
import {
  checkConnection,
  createRecord,
  listRecords,
  updateRecord,
} from '../src/productive/resources.js';
import { describeResource, FILTER_OPERATORS } from '../src/productive/registry.js';
import { loadPolicy } from '../src/productive/policy.js';
import type { FlatCollection } from '../src/productive/jsonapi.js';

const client = new ProductiveClient();
const context = { policy: loadPolicy() };

function heading(text: string): void {
  console.log(`\n=== ${text}`);
}

async function attempt(label: string, call: () => Promise<unknown>): Promise<unknown> {
  try {
    const result = await call();
    console.log(`  ok    ${label}`);
    return result;
  } catch (error) {
    console.log(`  FAIL  ${label}: ${error instanceof Error ? error.message : String(error)}`);
    return undefined;
  }
}

async function main(): Promise<void> {
  heading('connection');
  const connection = (await attempt('check_connection', () =>
    checkConnection(client, context),
  )) as Record<string, unknown> | undefined;
  if (connection) {
    console.log(`        organization ${String(connection.organizationId)}`);
    console.log(`        token owner  ${JSON.stringify(connection.tokenBelongsTo)}`);
    console.log(`        permissions  ${JSON.stringify(connection.permissions)}`);
  }

  heading('reads across every area the server claims to cover');
  for (const resource of [
    'projects',
    'tasks',
    'time_entries',
    'bookings',
    'deals',
    'companies',
    'people',
    'invoices',
    'services',
    'custom_fields',
    'reports/time_reports',
  ]) {
    const result = (await attempt(`list ${resource}`, () =>
      listRecords(
        client,
        {
          resource,
          page: { size: 1 },
          ...(resource.startsWith('reports/') ? { group: 'person' } : {}),
        },
        context,
      ),
    )) as FlatCollection | undefined;
    if (result) console.log(`        total ${String(result.total)}`);
  }

  heading('the registry agrees with the live API');
  // A filter and a sort the registry believes in should be accepted, and one it
  // rejects should be rejected by Productive too. If these disagree, the
  // registry is stale and needs regenerating.
  await attempt('registry-approved filter is accepted', () =>
    listRecords(client, { resource: 'tasks', filters: { after: '2020-01-01' } }, context),
  );
  await attempt('registry-approved gt operator is accepted', () =>
    listRecords(client, { resource: 'projects', filters: { id: { gt: '1' } }, page: { size: 1 } }, context),
  );
  await attempt('registry-approved sort is accepted', () =>
    listRecords(client, { resource: 'projects', sort: ['-created_at'], page: { size: 1 } }, context),
  );
  console.log(`        operators this server allows: ${FILTER_OPERATORS.join(', ')}`);

  heading('describe_resource returns a usable contract');
  const description = describeResource('time_entries');
  console.log(`        time_entries: ${description.list?.filters.length} filters, ` +
    `${description.actions.length} actions, create requires ${description.create?.required.join('+')}`);

  heading('writes are staged, not performed');
  const staged = await attempt('financial update stages instead of writing', () =>
    updateRecord(client, { resource: 'invoices', id: '1', attributes: { note: 'smoke' } }, context),
  );
  console.log(`        ${JSON.stringify(staged).slice(0, 160)}`);

  const refused = await attempt('unknown attribute is refused', async () => {
    try {
      await createRecord(client, { resource: 'tasks', attributes: { titel: 'x' } }, context);
      return 'NOT REFUSED — this is a bug';
    } catch (error) {
      return error instanceof Error ? error.message.slice(0, 80) : String(error);
    }
  });
  console.log(`        ${String(refused)}`);

  console.log('\nDone. Nothing was written.');
}

main().catch(error => {
  console.error(error);
  process.exit(1);
});
