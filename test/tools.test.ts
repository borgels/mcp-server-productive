import { afterEach, describe, expect, it, vi } from 'vitest';
import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { InMemoryTransport } from '@modelcontextprotocol/sdk/inMemory.js';
import { createServer } from '../src/server.js';
import { ProductiveClient } from '../src/productive/client.js';
import {
  ALL_CAPABILITIES,
  GUIDE_CAPABILITIES,
  searchCapabilities,
  toolCapabilityIds,
} from '../src/productive/capabilities.js';

const originalEnv = { ...process.env };
afterEach(() => {
  process.env = { ...originalEnv };
});

function stubClient(): ProductiveClient {
  const fetchImpl = vi.fn(
    async () =>
      new Response(JSON.stringify({ data: [], meta: { total_count: 0 } }), {
        status: 200,
        headers: { 'content-type': 'application/vnd.api+json' },
      }),
  ) as unknown as typeof fetch;
  return new ProductiveClient({ apiToken: 't', organizationId: '1', fetchImpl });
}

async function connect() {
  const server = createServer({ client: stubClient() });
  const [clientTransport, serverTransport] = InMemoryTransport.createLinkedPair();
  const client = new Client({ name: 'test', version: '0' });
  await Promise.all([server.connect(serverTransport), client.connect(clientTransport)]);
  return client;
}

describe('tool surface', () => {
  it('registers exactly the tools the catalogue advertises', async () => {
    // A tool in the catalogue but not on the server is a dead end for the
    // model; a tool on the server but not in the catalogue is undiscoverable.
    const client = await connect();
    const { tools } = await client.listTools();
    expect(tools.map(tool => tool.name).sort()).toEqual(toolCapabilityIds().sort());
  });

  it('keeps the surface small enough to sit alongside other servers', async () => {
    // The point of the registry is that ~650 API operations do not become ~650
    // tools. If this grows a lot, the design has drifted.
    const client = await connect();
    const { tools } = await client.listTools();
    expect(tools.length).toBeLessThanOrEqual(15);
  });

  it('marks reads as read-only and writes as not', async () => {
    const client = await connect();
    const { tools } = await client.listTools();
    const byName = new Map(tools.map(tool => [tool.name, tool]));

    for (const name of [
      'productive_list',
      'productive_get',
      'productive_describe_resource',
      'productive_search_capabilities',
      'productive_check_connection',
      'productive_describe_custom_fields',
    ]) {
      expect(byName.get(name)?.annotations?.readOnlyHint, name).toBe(true);
    }
    for (const name of [
      'productive_create',
      'productive_update',
      'productive_delete',
      'productive_run_action',
      'productive_track_time',
      'productive_commit_operation',
    ]) {
      expect(byName.get(name)?.annotations?.readOnlyHint, name).toBe(false);
    }
    expect(byName.get('productive_delete')?.annotations?.destructiveHint).toBe(true);
  });

  it('tells the model the units it will otherwise get wrong', async () => {
    // Time in minutes and money in minor units are the two mistakes that
    // produce plausible, wrong answers rather than errors.
    const client = await connect();
    const instructions = client.getInstructions() ?? '';
    expect(instructions).toMatch(/MINUTES/);
    expect(instructions).toMatch(/minor units/);
    // And the asymmetry that makes a silent write failure possible.
    expect(instructions).toMatch(/silently changes nothing/);
  });
});

describe('guides', () => {
  it('never shadow a tool name', async () => {
    const client = await connect();
    const registered = new Set((await client.listTools()).tools.map(tool => tool.name));
    for (const guide of GUIDE_CAPABILITIES) {
      expect(registered.has(guide.id), guide.id).toBe(false);
    }
  });

  it('only cite tools that exist', async () => {
    const client = await connect();
    const registered = new Set((await client.listTools()).tools.map(tool => tool.name));
    expect(GUIDE_CAPABILITIES.length).toBeGreaterThan(0);
    for (const guide of GUIDE_CAPABILITIES) {
      expect(guide.steps?.length, guide.id).toBeGreaterThan(0);
      for (const step of guide.steps ?? []) {
        expect(registered.has(step.tool), `${guide.id} -> ${step.tool}`).toBe(true);
      }
    }
  });

  it('are reachable by the words somebody would actually search', async () => {
    const cases: Array<[string, string]> = [
      ['custom field', 'productive_guide_custom_fields'],
      ['timer', 'productive_guide_time_tracking'],
      ['report', 'productive_guide_reports'],
      ['gte', 'productive_guide_paging_and_limits'],
      ['confirm', 'productive_guide_two_step_writes'],
    ];
    for (const [query, expected] of cases) {
      const ids = searchCapabilities(query).capabilities.map(capability => capability.id);
      expect(ids, query).toContain(expected);
    }
  });
});

describe('capability search', () => {
  it('returns resources alongside tools, so a subject leads to a resource key', () => {
    const result = searchCapabilities('invoice');
    expect(result.resources.map(match => match.resource)).toContain('invoices');
  });

  it('answers an empty query with the tool list rather than nothing', () => {
    const result = searchCapabilities('');
    expect(result.capabilities.length).toBeGreaterThan(0);
  });

  it('has no duplicate capability ids', () => {
    const ids = ALL_CAPABILITIES.map(capability => capability.id);
    expect(new Set(ids).size).toBe(ids.length);
  });
});
