import { createHmac, randomBytes, timingSafeEqual } from 'node:crypto';
import type { HttpMethod, Tier } from './registry-types.js';
import type { FilterValue } from './client.js';

/**
 * A staged write.
 *
 * Nothing in a prepared operation has reached Productive. It carries the exact
 * request that would be sent plus an HMAC-SHA256 signature over that request,
 * keyed with a server-side secret (PRODUCTIVE_PREPARE_SECRET, or a random
 * per-process key when unset). productive_commit_operation refuses to run
 * unless the signature verifies, the operation has not expired, and — when a
 * caller identity is known — the committing caller is the one who prepared it.
 *
 * The signature is defence in depth: the commit step additionally re-derives
 * the HTTP method and path from the registry and re-runs the policy checks, so
 * the decision never rests on values that arrived from outside.
 */
export interface PreparedOperation {
  operation: string;
  resource: string;
  method: HttpMethod;
  path: string;
  tier: Tier;
  filters?: Record<string, FilterValue>;
  body?: unknown;
  /** Plain-language description of the effect, shown before committing. */
  effect: string;
  /** Loud warnings: leaves the organization, acts on many records, destroys. */
  warnings: string[];
  /** The caller that prepared it; only they may commit it. Null when unknown. */
  actingAs: string | null;
  preparedAt: string;
  expiresAt: string;
  dryRun: true;
  operationHash: string;
}

export interface PrepareInput {
  operation: string;
  resource: string;
  method: HttpMethod;
  path: string;
  tier: Tier;
  filters?: Record<string, FilterValue>;
  body?: unknown;
  effect: string;
  warnings?: string[];
  actingAs?: string;
  now?: Date;
}

export const PREPARED_OPERATION_TTL_MS = 15 * 60 * 1000;

const processSecret = randomBytes(32);

function secret(): Buffer {
  const configured = process.env.PRODUCTIVE_PREPARE_SECRET;
  return configured ? Buffer.from(configured, 'utf8') : processSecret;
}

export function prepareOperation(input: PrepareInput): PreparedOperation {
  const preparedAt = input.now ?? new Date();
  const unsigned: Omit<PreparedOperation, 'operationHash'> = {
    operation: input.operation,
    resource: input.resource,
    method: input.method,
    path: input.path,
    tier: input.tier,
    filters: input.filters,
    body: input.body,
    effect: input.effect,
    warnings: input.warnings ?? [],
    actingAs: input.actingAs ?? null,
    preparedAt: preparedAt.toISOString(),
    expiresAt: new Date(preparedAt.getTime() + PREPARED_OPERATION_TTL_MS).toISOString(),
    dryRun: true,
  };

  return { ...unsigned, operationHash: sign(unsigned) };
}

/**
 * Verify the signature, expiry and owner of a staged operation, and refuse
 * anything that does not check out.
 */
export function verifyPreparedOperation(
  operation: PreparedOperation,
  context: { actingAs?: string; now?: Date } = {},
): PreparedOperation {
  const { operationHash, ...unsigned } = operation;
  const expected = Buffer.from(sign(unsigned), 'hex');
  const given = Buffer.from(typeof operationHash === 'string' ? operationHash : '', 'hex');
  if (expected.length !== given.length || !timingSafeEqual(expected, given)) {
    throw new Error(
      'The prepared operation does not match its signature, so it was altered since it was prepared ' +
        'or prepared by another server. Re-run the prepare step and commit the result unchanged.',
    );
  }

  const expiresAt = Date.parse(operation.expiresAt);
  if (!Number.isFinite(expiresAt) || (context.now ?? new Date()).getTime() > expiresAt) {
    throw new Error('The prepared operation has expired (15 minutes). Re-run the prepare step.');
  }

  if ((operation.actingAs ?? null) !== (context.actingAs ?? null)) {
    throw new Error(
      'The prepared operation belongs to another caller. The committing caller must prepare it themselves.',
    );
  }

  return operation;
}

function sign(value: unknown): string {
  return createHmac('sha256', secret()).update(stableStringify(value)).digest('hex');
}

/** Key-order-independent JSON, so an object round-tripped through a client hashes the same. */
function stableStringify(value: unknown): string {
  if (Array.isArray(value)) {
    return `[${value.map(stableStringify).join(',')}]`;
  }
  if (value && typeof value === 'object') {
    return `{${Object.entries(value as Record<string, unknown>)
      .filter(([, nested]) => nested !== undefined)
      .sort(([a], [b]) => (a < b ? -1 : a > b ? 1 : 0))
      .map(([key, nested]) => `${JSON.stringify(key)}:${stableStringify(nested)}`)
      .join(',')}}`;
  }
  return JSON.stringify(value) ?? 'null';
}
