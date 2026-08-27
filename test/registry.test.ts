import { describe, expect, it } from 'vitest';
import {
  allResources,
  FILTER_OPERATORS,
  describeResource,
  isOutwardOperation,
  requireAction,
  requireResource,
  resourceKeys,
  searchResources,
  validateBody,
  validateFilters,
  validateGroup,
  validateInclude,
  validateSort,
} from '../src/productive/registry.js';

describe('registry shape', () => {
  it('covers the whole API surface it claims to', () => {
    // Guards against a regeneration that silently drops half the document — the
    // filter count is the number most sensitive to a $ref-resolution bug.
    expect(resourceKeys().length).toBeGreaterThan(120);
    const filters = allResources().reduce(
      (total, resource) => total + (resource.list?.filters ?? []).length,
      0,
    );
    expect(filters).toBeGreaterThan(2000);
  });

  it('excludes the surfaces the generator refuses to expose', () => {
    // Authentication, password changes and Productive's own billing are absent
    // by construction, so no policy bug can re-open them.
    for (const key of ['passwords', 'sessions', 'organization_subscriptions']) {
      expect(resourceKeys()).not.toContain(key);
    }
    expect(() => requireResource('sessions')).toThrow(/Unknown resource/);
  });

  it('never leaves a write-capable resource unclassified', () => {
    for (const resource of allResources()) {
      const writable = Boolean(resource.create || resource.update || resource.remove);
      if (!writable) continue;
      expect(['write', 'financial', 'admin']).toContain(resource.tier);
    }
  });

  it('classifies money and access away from ordinary project work', () => {
    expect(requireResource('tasks').tier).toBe('write');
    expect(requireResource('time_entries').tier).toBe('write');
    expect(requireResource('invoices').tier).toBe('financial');
    expect(requireResource('salaries').tier).toBe('financial');
    expect(requireResource('people').tier).toBe('admin');
    expect(requireResource('roles').tier).toBe('admin');
  });

  it('keeps single-record and collection-wide verbs apart', () => {
    // Both /time_entries/{id}/approve and /time_entries/approve exist. If they
    // collapsed to one name, "approve this entry" could approve everything.
    const single = requireAction('time_entries', 'approve');
    const bulk = requireAction('time_entries', 'bulk_approve');
    expect(single.requiresId).toBe(true);
    expect(single.collectionWide).toBeUndefined();
    expect(bulk.requiresId).toBe(false);
    expect(bulk.collectionWide).toBe(true);
  });

  it('flags the operations that leave the organization', () => {
    expect(isOutwardOperation('PATCH /invoices/{id}/send')).toBe(true);
    expect(isOutwardOperation('POST /invitations')).toBe(true);
    expect(isOutwardOperation('PATCH /tasks/{id}/reposition')).toBe(false);
    expect(requireAction('invoices', 'send').outward).toBe(true);
  });
});

describe('query validation', () => {
  const tasks = requireResource('tasks');

  it('accepts a real filter and names the alternatives for a wrong one', () => {
    expect(() => validateFilters(tasks, { assignee_id: 5 })).not.toThrow();
    expect(() => validateFilters(tasks, { assignee: 5 })).toThrow(/no filter "assignee"/);
    // The suggestion is the point: a bare rejection leaves nowhere to go.
    expect(() => validateFilters(tasks, { assignee: 5 })).toThrow(/assignee_id/);
  });

  it('accepts the six operators the API really has, and only those', () => {
    // Measured live, not read off the spec: the spec omits gt/lt for this field
    // while the API honours them, and offers no hint that gte/lte do not exist.
    for (const operator of FILTER_OPERATORS) {
      expect(() => validateFilters(tasks, { created_at: { [operator]: '2026-01-01' } })).not.toThrow();
    }
    expect(() => validateFilters(tasks, { created_at: { totally_wrong: 1 } })).toThrow(
      /not a filter operator Productive accepts/,
    );
  });

  it('says what to do instead when asked for an inclusive range', () => {
    // gte/lte are the operators people reach for first, and Productive has
    // neither. A bare rejection would leave the caller retrying.
    expect(() => validateFilters(tasks, { created_at: { gte: '2026-01-01' } })).toThrow(
      /no inclusive comparison/,
    );
    // The alternative it points at has to actually exist on the resource.
    // Tasks carry a bare after/before pair plus per-field ones; `created_after`
    // is NOT among them, which is exactly why the advice has to be checked
    // against the registry rather than assumed from the field name.
    expect(tasks.list?.filters).toContain('after');
    expect(tasks.list?.filters).toContain('before');
    expect(tasks.list?.filters).toContain('due_date_after');
    expect(tasks.list?.filters).not.toContain('created_after');
  });

  it('recurses into advanced logical groups', () => {
    expect(() =>
      validateFilters(tasks, { $op: 'and', 0: { assignee_id: { eq: '5' } }, 1: { company_id: { eq: '7' } } }),
    ).not.toThrow();
    expect(() => validateFilters(tasks, { $op: 'maybe' })).toThrow(/must be "and" or "or"/);
    // A bad field inside a group must be caught too, not waved through.
    expect(() => validateFilters(tasks, { $op: 'or', 0: { nonsense: 1 } })).toThrow(
      /no filter "nonsense"/,
    );
  });

  it('validates sort direction prefixes and include names', () => {
    expect(() => validateSort(tasks, ['-created_at', 'title'])).not.toThrow();
    expect(() => validateSort(tasks, ['-nope'])).toThrow(/cannot sort by "nope"/);
    expect(() => validateInclude(tasks, ['assignee', 'project'])).not.toThrow();
    // Nested includes are valid JSON:API; only the first segment is ours to check.
    expect(() => validateInclude(tasks, ['project.company'])).not.toThrow();
    expect(() => validateInclude(tasks, ['assignees'])).toThrow(/no relationship "assignees"/);
  });

  it('allows grouping only where Productive aggregates', () => {
    const report = requireResource('reports/time_reports');
    expect(() => validateGroup(report, 'person')).not.toThrow();
    expect(() => validateGroup(report, 'astrology')).toThrow(/cannot group by/);
    expect(() => validateGroup(tasks, 'person')).toThrow(/does not support grouping/);
  });
});

describe('write validation', () => {
  it('refuses an unknown attribute, because Productive would accept it silently', () => {
    const tasks = requireResource('tasks');
    expect(() =>
      validateBody(tasks.update, { attributes: { titel: 'typo' } }, {
        requireRequired: false,
        what: 'Updating a "tasks"',
      }),
    ).toThrow(/no attribute "titel"/);
    // The reason is spelled out, since the API's own 200 is what makes this
    // check load-bearing rather than cosmetic.
    expect(() =>
      validateBody(tasks.update, { attributes: { titel: 'typo' } }, {
        requireRequired: false,
        what: 'Updating a "tasks"',
      }),
    ).toThrow(/silently ignores unknown attributes/);
  });

  it('demands the attributes Productive rejects the call without', () => {
    const tasks = requireResource('tasks');
    expect(() =>
      validateBody(tasks.create, { attributes: { title: 'x' } }, {
        requireRequired: true,
        what: 'Creating a "tasks"',
      }),
    ).toThrow(/requires: project_id, task_list_id/);

    expect(() =>
      validateBody(
        tasks.create,
        { attributes: { title: 'x', project_id: '1', task_list_id: '2' } },
        { requireRequired: true, what: 'Creating a "tasks"' },
      ),
    ).not.toThrow();
  });

  it('does not demand required attributes on an update', () => {
    const tasks = requireResource('tasks');
    expect(() =>
      validateBody(tasks.update, { attributes: { due_date: '2026-12-31' } }, {
        requireRequired: false,
        what: 'Updating a "tasks"',
      }),
    ).not.toThrow();
  });
});

describe('discovery', () => {
  it('finds a resource by the word a person would use, not its key', () => {
    // Productive calls a budget a "deal"; somebody searching "budget" has to
    // land there anyway, which is why filter names are searched too.
    expect(searchResources('budget').map(match => match.resource)).toContain('deals');
    expect(searchResources('invoice').map(match => match.resource)).toContain('invoices');
    expect(searchResources('time').map(match => match.resource)).toContain('time_entries');
  });

  it('describes a resource completely enough to write against it', () => {
    const description = describeResource('time_entries');
    expect(description.operations).toContain('create');
    expect(description.create?.required).toContain('person_id');
    expect(description.list?.filters).toContain('after');
    expect(description.list?.filterOperators).toEqual(FILTER_OPERATORS);
    expect(description.actions.map(action => action.name)).toContain('bulk_approve');
    expect(description.notes.join(' ')).toMatch(/bulk_\*/);
  });

  it('suggests a near miss on the resource name itself', () => {
    expect(() => requireResource('time_entry')).toThrow(/time_entries/);
  });
});
