import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { ProductiveClient, type ProductiveClientOptions } from './productive/client.js';
import { registerProductiveTools } from './tools/productive.js';
import { describePolicy, loadPolicy, perUserAuthEnabled } from './productive/policy.js';
import type { CredentialStore } from './productive/store.js';

export interface CreateServerOptions {
  client?: ProductiveClient;
  clientOptions?: ProductiveClientOptions;
  /** Caller address, forwarded by an authenticating gateway (X-MCP-User). */
  onBehalfOf?: string;
  /** Per-user token store — required when PRODUCTIVE_PER_USER_AUTH=true. */
  store?: CredentialStore;
  /** Public base URL, used to build enrollment links. */
  publicBaseUrl?: string;
}

const INSTRUCTIONS = `Productive.io: projects, tasks, time, resourcing, financials, CRM and reports for
one organization.

Twelve tools cover an API of ~650 operations, so the first move is almost always
productive_search_capabilities, then productive_describe_resource. Resource
names are Productive's own and are not guessable: a budget is a \`deal\`, a board
column is a \`workflow_status\`, and the 26 report endpoints are resources named
\`reports/*\` read through productive_list with a \`group\`.

Units matter and are easy to get wrong. Time is MINUTES everywhere — a time
entry of 2 is two minutes. Money is minor units. Both come back that way too, so
convert before showing a figure and convert back before writing one.

Reads are paged. page[size] caps at 200 and Productive clamps a larger request
without saying so, so read \`total\` and \`nextPage\` from the result instead of
assuming one page is the whole answer.

Writes divide in two. Ordinary project work happens in one call. Anything
touching money, pricing, payroll or access, every delete, anything that leaves
the organization, and every \`bulk_*\` action is staged first: the tool returns
the exact request with a hash and changes nothing, and productive_commit_operation
runs it only if the operation comes back unaltered. Show a staged change to the
person who asked before committing it, and never commit an \`outward\` operation —
sending an invoice, inviting a person — unless they asked for that specific thing.

Two failure modes are worth knowing. An unknown filter, sort or include is
rejected with HTTP 400, so a typo there fails loudly. An unknown ATTRIBUTE on a
write is accepted with HTTP 200 and silently changes nothing, so this server
refuses those itself rather than reporting a write that did not happen. If a
write is refused for an unknown attribute, the name is wrong — call
productive_describe_resource, do not retry.

Every change Productive records is credited to whoever owns the token being
used. productive_check_connection names them.

If a tool answers NOT_CONNECTED, this server runs per-user auth: the caller has
to link their own Productive token first. Call productive_connect, give them the
link it returns, and let them paste the token into that page — never into this
conversation, where it would stay in the transcript. productive_status says
whether they are linked.`;

export function createServer(options: CreateServerOptions = {}): McpServer {
  const server = new McpServer(
    { name: 'mcp-server-productive', version: '0.2.0' },
    { instructions: INSTRUCTIONS },
  );

  // In per-user mode this client carries no usable credential of its own — it
  // is a template the tools clone per call with the caller's stored token, so
  // PRODUCTIVE_API_TOKEN stays unset on such a deployment.
  const client = options.client ?? new ProductiveClient(options.clientOptions);
  registerProductiveTools(server, client, {
    onBehalfOf: options.onBehalfOf,
    store: options.store,
    publicBaseUrl: options.publicBaseUrl,
  });

  return server;
}

/** Startup line for the operator: what this process will and will not do. */
export function describeDeployment(): Record<string, unknown> {
  return {
    organizationId: process.env.PRODUCTIVE_ORGANIZATION_ID ?? '(unset — every request will fail)',
    permissions: describePolicy(loadPolicy()),
    forwardedIdentity: process.env.PRODUCTIVE_TRUST_FORWARDED_USER === 'true',
    perUserAuth: perUserAuthEnabled(),
  };
}
