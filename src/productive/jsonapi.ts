import type { ProductiveResponse } from './client.js';

/**
 * JSON:API flattening.
 *
 * Productive answers in strict JSON:API: attributes live one level down, every
 * relationship is a `{ type, id }` stub, and the records those stubs point at
 * arrive in a sibling `included` array. Handed to a model unchanged, a list of
 * twenty tasks with two includes costs several thousand tokens of envelope
 * before a single field of substance, and answering "who is this assigned to"
 * means correlating three arrays by hand.
 *
 * So responses are flattened: attributes are hoisted onto the record,
 * relationship stubs are replaced by the included record where one was
 * requested, and null relationships are dropped rather than listed as null.
 * The raw envelope is still available — `raw: true` on the list and get tools —
 * for the rare case where the shape itself matters.
 */

export interface JsonApiRecord {
  id?: string;
  type?: string;
  attributes?: Record<string, unknown>;
  relationships?: Record<string, { data?: RelationshipStub | RelationshipStub[] | null }>;
}

interface RelationshipStub {
  id?: string;
  type?: string;
}

export interface FlatRecord {
  id: string;
  type: string;
  [attribute: string]: unknown;
}

export interface FlatCollection {
  /** Total across all pages, from `meta.total_count`. */
  total?: number;
  page?: number;
  pageSize?: number;
  totalPages?: number;
  records: FlatRecord[];
  /**
   * Set when more pages exist, naming the next page number — otherwise a model
   * reading twenty of two hundred records has no signal that it is looking at a
   * slice.
   */
  nextPage?: number;
}

/** Index the `included` array by `type:id` so stubs can be resolved in O(1). */
function indexIncluded(included: unknown[] | undefined): Map<string, JsonApiRecord> {
  const index = new Map<string, JsonApiRecord>();
  for (const entry of included ?? []) {
    const record = entry as JsonApiRecord;
    if (record?.id && record.type) index.set(`${record.type}:${record.id}`, record);
  }
  return index;
}

function flattenRelationship(
  stub: RelationshipStub,
  index: Map<string, JsonApiRecord>,
): Record<string, unknown> {
  const full = stub.type && stub.id ? index.get(`${stub.type}:${stub.id}`) : undefined;
  if (!full) return { id: stub.id, type: stub.type };
  return { id: full.id, type: full.type, ...(full.attributes ?? {}) };
}

export function flattenRecord(
  record: JsonApiRecord,
  index: Map<string, JsonApiRecord> = new Map(),
): FlatRecord {
  const flat: FlatRecord = {
    id: String(record.id ?? ''),
    type: String(record.type ?? ''),
    ...(record.attributes ?? {}),
  };

  const relationships: Record<string, unknown> = {};
  for (const [name, value] of Object.entries(record.relationships ?? {})) {
    const data = value?.data;
    // An unset relationship arrives as `{ data: null }`. Listing it as null
    // would triple the size of a record for no information.
    if (data === null || data === undefined) continue;
    relationships[name] = Array.isArray(data)
      ? data.map(stub => flattenRelationship(stub, index))
      : flattenRelationship(data, index);
  }
  if (Object.keys(relationships).length) flat.relationships = relationships;

  return flat;
}

export function flattenCollection(response: ProductiveResponse): FlatCollection {
  const index = indexIncluded(response.included);
  const rows = Array.isArray(response.data) ? (response.data as JsonApiRecord[]) : [];
  const meta = response.meta ?? {};
  const current = meta.current_page;
  const totalPages = meta.total_pages;

  return {
    total: meta.total_count,
    page: current,
    pageSize: meta.page_size,
    totalPages,
    records: rows.map(row => flattenRecord(row, index)),
    nextPage:
      current !== undefined && totalPages !== undefined && current < totalPages
        ? current + 1
        : undefined,
  };
}

export function flattenSingle(response: ProductiveResponse): FlatRecord | null {
  const index = indexIncluded(response.included);
  const data = response.data as JsonApiRecord | undefined;
  if (!data || Array.isArray(data)) return null;
  return flattenRecord(data, index);
}
