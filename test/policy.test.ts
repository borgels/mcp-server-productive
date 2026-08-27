import { afterEach, describe, expect, it } from 'vitest';
import { checkPolicy, describePolicy, loadPolicy, requiresTwoStep } from '../src/productive/policy.js';

const originalEnv = { ...process.env };
afterEach(() => {
  process.env = { ...originalEnv };
});

const read = { resource: 'tasks', tier: 'write' as const, operation: 'list', isMutation: false };
const writeTask = { resource: 'tasks', tier: 'write' as const, operation: 'create', isMutation: true };
const writeInvoice = {
  resource: 'invoices',
  tier: 'financial' as const,
  operation: 'create',
  isMutation: true,
};
const writePerson = {
  resource: 'people',
  tier: 'admin' as const,
  operation: 'update',
  isMutation: true,
};

describe('default posture', () => {
  it('reads, and writes nothing', () => {
    delete process.env.PRODUCTIVE_ENABLE_WRITES;
    expect(checkPolicy(read).allowed).toBe(true);
    expect(checkPolicy(writeTask).allowed).toBe(false);
    expect(checkPolicy(writeTask).reason).toMatch(/PRODUCTIVE_ENABLE_WRITES/);
  });
});

describe('tiers are gated independently', () => {
  it('does not let ordinary writes unlock money or access', () => {
    // The whole point of the split: a server trusted to move tasks and log time
    // must not thereby be able to issue an invoice or change a permission set.
    process.env.PRODUCTIVE_ENABLE_WRITES = 'true';
    expect(checkPolicy(writeTask).allowed).toBe(true);
    expect(checkPolicy(writeInvoice).allowed).toBe(false);
    expect(checkPolicy(writeInvoice).reason).toMatch(/PRODUCTIVE_ENABLE_FINANCIALS/);
    expect(checkPolicy(writePerson).allowed).toBe(false);
    expect(checkPolicy(writePerson).reason).toMatch(/PRODUCTIVE_ENABLE_ADMIN/);
  });

  it('needs the master switch even when a tier switch is on', () => {
    delete process.env.PRODUCTIVE_ENABLE_WRITES;
    process.env.PRODUCTIVE_ENABLE_FINANCIALS = 'true';
    process.env.PRODUCTIVE_ENABLE_ADMIN = 'true';
    expect(checkPolicy(writeInvoice).allowed).toBe(false);
    expect(checkPolicy(writeInvoice).reason).toMatch(/PRODUCTIVE_ENABLE_WRITES/);
  });

  it('opens each tier only with its own switch', () => {
    process.env.PRODUCTIVE_ENABLE_WRITES = 'true';
    process.env.PRODUCTIVE_ENABLE_FINANCIALS = 'true';
    expect(checkPolicy(writeInvoice).allowed).toBe(true);
    expect(checkPolicy(writePerson).allowed).toBe(false);
  });
});

describe('deletes', () => {
  it('stay closed even when the tier is open', () => {
    process.env.PRODUCTIVE_ENABLE_WRITES = 'true';
    const del = { resource: 'tasks', tier: 'write' as const, operation: 'delete', isMutation: true, isDelete: true };
    expect(checkPolicy(del).allowed).toBe(false);
    expect(checkPolicy(del).reason).toMatch(/PRODUCTIVE_ENABLE_DELETES/);

    process.env.PRODUCTIVE_ENABLE_DELETES = 'true';
    expect(checkPolicy(del).allowed).toBe(true);
  });

  it('still respect the tier gate', () => {
    process.env.PRODUCTIVE_ENABLE_WRITES = 'true';
    process.env.PRODUCTIVE_ENABLE_DELETES = 'true';
    const del = {
      resource: 'invoices',
      tier: 'financial' as const,
      operation: 'delete',
      isMutation: true,
      isDelete: true,
    };
    expect(checkPolicy(del).allowed).toBe(false);
    expect(checkPolicy(del).reason).toMatch(/PRODUCTIVE_ENABLE_FINANCIALS/);
  });
});

describe('resource scoping', () => {
  it('applies the allow list to reads as well as writes', () => {
    // An instance scoped to time tracking should not read salaries either.
    process.env.PRODUCTIVE_ALLOWED_RESOURCES = 'tasks,time_entries';
    expect(checkPolicy(read).allowed).toBe(true);
    expect(
      checkPolicy({ resource: 'salaries', tier: 'financial', operation: 'list', isMutation: false })
        .allowed,
    ).toBe(false);
  });

  it('lets a deny list win over an open instance', () => {
    process.env.PRODUCTIVE_DENIED_RESOURCES = 'salaries';
    process.env.PRODUCTIVE_ENABLE_WRITES = 'true';
    process.env.PRODUCTIVE_ENABLE_FINANCIALS = 'true';
    expect(
      checkPolicy({ resource: 'salaries', tier: 'financial', operation: 'update', isMutation: true })
        .allowed,
    ).toBe(false);
  });
});

describe('two-step staging', () => {
  it('runs ordinary project work in one call', () => {
    expect(requiresTwoStep({ tier: 'write' })).toBe(false);
  });

  it('stages anything with a wider blast radius', () => {
    expect(requiresTwoStep({ tier: 'financial' })).toBe(true);
    expect(requiresTwoStep({ tier: 'admin' })).toBe(true);
    expect(requiresTwoStep({ tier: 'write', isDelete: true })).toBe(true);
    // A bulk verb acts on everything a filter matches, so it is staged even in
    // the ordinary tier.
    expect(requiresTwoStep({ tier: 'write', collectionWide: true })).toBe(true);
    expect(requiresTwoStep({ tier: 'write', outward: true })).toBe(true);
  });
});

describe('policy file', () => {
  it('reports what the deployment allows', () => {
    process.env.PRODUCTIVE_ENABLE_WRITES = 'true';
    process.env.PRODUCTIVE_ENABLE_FINANCIALS = 'true';
    const described = describePolicy(loadPolicy());
    expect(described).toMatchObject({
      writes: true,
      financialWrites: true,
      adminWrites: false,
      deletes: false,
      allowedResources: 'all',
    });
  });
});
