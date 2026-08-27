import { readFileSync } from 'node:fs';
import type { Tier } from './registry-types.js';

/**
 * What this server is allowed to do.
 *
 * One master write switch is not enough for Productive. The same API covers
 * moving a task, issuing an invoice, and granting somebody a permission set,
 * and those are three different decisions. So the tiers are gated separately:
 * a server can be trusted to run project work and time tracking without also
 * being able to send an invoice or change who has access.
 *
 * Everything defaults to off. A read-only server is the useful, safe default.
 */
export interface ProductivePolicy {
  /** Master switch: no mutation of any kind happens without it. */
  writesEnabled: boolean;
  /** Money, pricing, payroll, and documents a customer receives. */
  financialsEnabled: boolean;
  /** Access and organization-wide configuration. */
  adminEnabled: boolean;
  /**
   * Deletes, gated on top of the tier. Off by default even with writes on:
   * only some Productive types land in `deleted_items` and can be restored,
   * and which ones is not something the API states.
   */
  deletesEnabled: boolean;
  /** When non-empty, only these resource keys may be touched at all. */
  allowedResources: string[];
  /** Resource keys refused even when their tier is enabled. */
  deniedResources: string[];
}

export interface PolicyDecision {
  allowed: boolean;
  reason: string;
}

export interface PolicyCheckInput {
  resource: string;
  tier: Tier;
  /** `list`, `get`, `create`, `update`, `delete`, or `action:<name>`. */
  operation: string;
  isMutation: boolean;
  isDelete?: boolean;
}

export function loadPolicy(): ProductivePolicy {
  const base: ProductivePolicy = {
    writesEnabled: process.env.PRODUCTIVE_ENABLE_WRITES === 'true',
    financialsEnabled: process.env.PRODUCTIVE_ENABLE_FINANCIALS === 'true',
    adminEnabled: process.env.PRODUCTIVE_ENABLE_ADMIN === 'true',
    deletesEnabled: process.env.PRODUCTIVE_ENABLE_DELETES === 'true',
    allowedResources: splitList(process.env.PRODUCTIVE_ALLOWED_RESOURCES),
    deniedResources: splitList(process.env.PRODUCTIVE_DENIED_RESOURCES),
  };

  const policyPath = process.env.PRODUCTIVE_POLICY_PATH;
  if (!policyPath) return base;

  const parsed = JSON.parse(readFileSync(policyPath, 'utf8')) as Partial<ProductivePolicy>;
  return {
    writesEnabled: parsed.writesEnabled ?? base.writesEnabled,
    financialsEnabled: parsed.financialsEnabled ?? base.financialsEnabled,
    adminEnabled: parsed.adminEnabled ?? base.adminEnabled,
    deletesEnabled: parsed.deletesEnabled ?? base.deletesEnabled,
    allowedResources: parsed.allowedResources ?? base.allowedResources,
    deniedResources: parsed.deniedResources ?? base.deniedResources,
  };
}

export function checkPolicy(
  input: PolicyCheckInput,
  policy: ProductivePolicy = loadPolicy(),
): PolicyDecision {
  // The resource allow/deny lists apply to reads as well. An instance scoped to
  // time tracking should not be able to read salaries either.
  if (policy.deniedResources.includes(input.resource)) {
    return { allowed: false, reason: `resource denied by policy: ${input.resource}` };
  }
  if (policy.allowedResources.length && !policy.allowedResources.includes(input.resource)) {
    return {
      allowed: false,
      reason:
        `resource not in PRODUCTIVE_ALLOWED_RESOURCES: ${input.resource} ` +
        `(allowed: ${policy.allowedResources.join(', ')})`,
    };
  }

  if (!input.isMutation) return { allowed: true, reason: 'read operation' };

  if (!policy.writesEnabled) {
    return { allowed: false, reason: 'writes are disabled (PRODUCTIVE_ENABLE_WRITES)' };
  }

  if (input.tier === 'financial' && !policy.financialsEnabled) {
    return {
      allowed: false,
      reason:
        `"${input.resource}" is a financial resource and financial writes are disabled ` +
        '(PRODUCTIVE_ENABLE_FINANCIALS). It touches money, pricing, payroll or a document a customer receives.',
    };
  }

  if (input.tier === 'admin' && !policy.adminEnabled) {
    return {
      allowed: false,
      reason:
        `"${input.resource}" is an administrative resource and admin writes are disabled ` +
        '(PRODUCTIVE_ENABLE_ADMIN). It changes access or organization-wide configuration.',
    };
  }

  if (input.isDelete && !policy.deletesEnabled) {
    return { allowed: false, reason: 'deletes are disabled (PRODUCTIVE_ENABLE_DELETES)' };
  }

  return { allowed: true, reason: `permitted by policy (${input.tier} tier)` };
}

/**
 * Whether a mutation must go through prepare/commit rather than executing on
 * the spot.
 *
 * Ordinary project work — creating a task, logging time, moving a booking — runs
 * directly, because a two-step handshake around every time entry would make the
 * server unusable for the thing people do most. Everything with a wider blast
 * radius is staged first: money and access, deletes, anything that leaves the
 * building, and any bulk verb that acts on every record a filter matches.
 */
export function requiresTwoStep(input: {
  tier: Tier;
  isDelete?: boolean;
  collectionWide?: boolean;
  outward?: boolean;
}): boolean {
  return Boolean(
    input.tier === 'financial' ||
      input.tier === 'admin' ||
      input.isDelete ||
      input.collectionWide ||
      input.outward,
  );
}

/** One-line summary of what this deployment permits, for the connection check. */
export function describePolicy(policy: ProductivePolicy = loadPolicy()): Record<string, unknown> {
  return {
    writes: policy.writesEnabled,
    financialWrites: policy.writesEnabled && policy.financialsEnabled,
    adminWrites: policy.writesEnabled && policy.adminEnabled,
    deletes: policy.writesEnabled && policy.deletesEnabled,
    allowedResources: policy.allowedResources.length ? policy.allowedResources : 'all',
    deniedResources: policy.deniedResources.length ? policy.deniedResources : 'none',
  };
}

function splitList(value: string | undefined): string[] {
  return (value ?? '')
    .split(',')
    .map(entry => entry.trim())
    .filter(Boolean);
}
