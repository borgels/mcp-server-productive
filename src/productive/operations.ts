import { createHash } from 'node:crypto';
import type { HttpMethod, Tier } from './registry-types.js';
import type { FilterValue } from './client.js';

/**
 * A staged write.
 *
 * Nothing in a prepared operation has reached Productive. It carries the exact
 * request that would be sent plus a hash over that request, and
 * productive_commit_operation refuses to run unless the hash still matches. The
 * point is not tamper-proofing — the same process computes both — but that the
 * change has to be restated in full before it happens, so a financial or
 * access-changing write is always shown before it is made.
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
}

export function prepareOperation(input: PrepareInput): PreparedOperation {
  const core = {
    operation: input.operation,
    resource: input.resource,
    method: input.method,
    path: input.path,
    tier: input.tier,
    filters: input.filters,
    body: input.body,
    effect: input.effect,
  };

  return {
    ...core,
    warnings: input.warnings ?? [],
    dryRun: true,
    operationHash: stableHash(core),
  };
}

/**
 * Re-derive the hash and refuse a mismatch.
 *
 * The hash covers the request, not the warnings: a caller that drops the
 * warnings while keeping the change would otherwise slip through, and a caller
 * that edits the change cannot.
 */
export function verifyPreparedOperation(operation: PreparedOperation): PreparedOperation {
  const expected = stableHash({
    operation: operation.operation,
    resource: operation.resource,
    method: operation.method,
    path: operation.path,
    tier: operation.tier,
    filters: operation.filters,
    body: operation.body,
    effect: operation.effect,
  });

  if (expected !== operation.operationHash) {
    throw new Error(
      'The prepared operation does not match its hash, so it has been altered since it was prepared. ' +
        'Re-run the prepare step and commit the result unchanged.',
    );
  }

  return operation;
}

function stableHash(value: unknown): string {
  return createHash('sha256').update(stableStringify(value)).digest('hex');
}

/** Key-order-independent JSON, so an object round-tripped through a client hashes the same. */
function stableStringify(value: unknown): string {
  if (Array.isArray(value)) {
    return `[${value.map(stableStringify).join(',')}]`;
  }
  if (value && typeof value === 'object') {
    return `{${Object.entries(value as Record<string, unknown>)
      .filter(([, nested]) => nested !== undefined)
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([key, nested]) => `${JSON.stringify(key)}:${stableStringify(nested)}`)
      .join(',')}}`;
  }
  return JSON.stringify(value) ?? 'null';
}
