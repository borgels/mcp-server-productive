/**
 * Shape of the generated resource registry.
 *
 * The registry is the server's map of the Productive API: which resources
 * exist, which filters and sort keys each list endpoint really honours, which
 * attributes a create or update accepts, and what named actions a resource has.
 * It is derived from Productive's OpenAPI document by
 * `scripts/generate-registry.mjs` — see registry.generated.ts.
 */

export type HttpMethod = 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE';

/**
 * How consequential an operation is, and therefore which switch enables it.
 *
 * - `read` — never gated.
 * - `write` — ordinary project work: tasks, time, bookings, pages, CRM records.
 * - `financial` — money, pricing, payroll, or a document a customer receives.
 * - `admin` — access and organization-wide configuration.
 *
 * Splitting `financial` and `admin` out of `write` is the point: a server that
 * should log time and move tasks has no business issuing an invoice or handing
 * somebody a permission set, and one switch cannot express that.
 */
export type Tier = 'read' | 'write' | 'financial' | 'admin';

/** Writable body of a create, update, or action. */
export interface BodyContract {
  /** Attributes Productive rejects the call without. */
  required: string[];
  attributes: string[];
  /** JSON:API relationship names accepted in the body. */
  relationships: string[];
  /** True when the endpoint takes an array of records rather than one. */
  array?: boolean;
  /**
   * True when the spec pointed this endpoint at the resource's own request body
   * rather than one of its own — as the collection-wide verbs do. The attribute
   * list is still a fair guide to what can be set; `required` is not, and has
   * been emptied, because it describes creating a record rather than running
   * this verb.
   */
  borrowedShape?: boolean;
}

export interface ListContract {
  /**
   * Filter fields this endpoint accepts. Which operators may be applied is a
   * global property of the API, not a per-field one — see FILTER_OPERATORS.
   */
  filters: string[];
  /** Sort keys, ascending. Prefix with `-` for descending. */
  sorts: string[];
  /** Aggregation keys, on the report endpoints only. */
  groups?: string[];
  /** Relationship names valid in `include`. */
  relationships: string[];
}

export interface ActionContract {
  /** `METHOD /path` — stable identifier, also used in the audit log. */
  id: string;
  /** Verb as callers name it, e.g. `archive`, `send`, `copy`. */
  name: string;
  method: HttpMethod;
  /** Path template, still containing `{id}` where one is needed. */
  path: string;
  summary: string;
  requiresId: boolean;
  /** True when the action acts on many records at once rather than one. */
  collectionWide?: true;
  tier: Tier;
  /**
   * True when running this reaches somebody outside the organization — sending
   * an invoice, inviting a user. Surfaced in the prepared operation so it can
   * never be committed as though it were an internal edit.
   */
  outward?: true;
  body?: BodyContract;
}

export interface GeneratedResource {
  /** Registry key, e.g. `tasks`, `time_entries`, `reports/time_reports`. */
  key: string;
  /** Collection path relative to the API base, e.g. `/tasks`. */
  path: string;
  /** Productive's own grouping for the resource, e.g. `Time Entries`. */
  tag: string;
  tier: Tier;
  list?: ListContract;
  get?: { relationships: string[] };
  create?: BodyContract;
  update?: BodyContract;
  /** DELETE /{id} exists. */
  remove?: boolean;
  /** Creating goes through the bulk form: the body is an array of records. */
  createIsBulk?: boolean;
  actions: ActionContract[];
}
