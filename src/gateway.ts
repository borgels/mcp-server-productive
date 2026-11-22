import { createHash, createHmac, randomBytes, randomUUID } from 'node:crypto';
import { z } from 'zod/v4';
import { fixedOutputs, withheldAuditRecord, withheldResult } from './fallbacks.js';
import {
  GATEWAY_RESOURCES,
  GATEWAY_TOOLS,
  GatewayInputError,
  type GatewayRiskLevel,
  type GatewayToolSpec,
  type GatewayUpstreamOperation,
} from './gateway-tools.js';
import { ActAsRefusedError, actAsRefusalInForm, normaliseActAs, type ActAs, type ActAsRefusal } from './act-as.js';
import { failureMetadata, vendorRequestId, type FailureMetadata } from './errors.js';
import { admitsKey, KEY_REFUSED, leaksSecret, maskedText, sealedError } from './key-admission.js';
import { DEFAULT_BASE_URL, ProductiveClient } from './productive/client.js';
import type { ProductivePolicy } from './productive/policy.js';
import {
  canonicalToolName,
  currentActAs,
  currentCallContext,
  currentInstancePolicy,
  currentRedactor,
  GatewayConfigError,
  resolveInstancePolicy,
  runInCallScope,
  TOOL_PREFIX,
  type CallContext,
  type InstancePolicy,
  type ResolvedInstancePolicy,
} from './productive/scope.js';
import { redactDeep, SecretRedactor } from './redaction.js';

/**
 * Embeddable entry point (package export `./gateway`): an embedding host,
 * such as an MCP gateway that does its own per-user authorization, lists
 * `tools` and invokes `callTool`. The tools (src/gateway-tools.ts) are narrow
 * tools over fixed Productive resources, built on the same list, get,
 * create, update and time-tracking logic as the MCP server.
 *
 * Several gateway instances (for example one per tenant) can run in one
 * process. Each instance uses only the API token and organization id passed
 * to createProductiveGateway and reads no PRODUCTIVE_* variable at all: not
 * the credentials (PRODUCTIVE_API_TOKEN, PRODUCTIVE_ORGANIZATION_ID), not
 * PRODUCTIVE_BASE_URL (Productive's own address unless `baseUrl` is given),
 * not PRODUCTIVE_TIMEOUT_MS (30 seconds unless `timeoutMs` is given), and
 * none of the policy, per-user and audit variables. Each instance redacts
 * results, errors and audit records with its own redactor.
 *
 * Instance policy (writes, disabled tools, audit) comes from the host when it
 * passes `policy`; without it the instance uses the default policy (no writes,
 * no disabled tools, no audit records). Whatever the policy, the gateway never
 * deletes, never stages a change for a later commit, never runs an action and
 * never writes a financial or administrative resource: it has no tool that
 * could.
 *
 * Acting as a person: a host that verified the person a call is made for
 * passes `actAs: { email }` in the call context. Every change (a write tool)
 * then first finds exactly one active Productive team member with that email
 * (`GET /people`, as the token's owner) and is made for them: a time entry gets
 * their `person_id`, and a time entry for anyone else is refused. Productive
 * has no author field for a task or a comment, so those still show the token's
 * owner in Productive's activity log; they are only made when the person exists.
 * No such person, or more than one: nothing is sent, and the result has
 * `actAsRefused: 'no_user'`. Productive refusing the lookup (403):
 * `actAsRefused: 'not_permitted'`. A malformed `actAs` refuses the call
 * (`invalid`). Reads run as the token's owner, except the self tool
 * `list_my_time_entries` (catalog `self: true`): it finds the person the same
 * way, lists only their own time and is refused without `actAs`. The email is
 * never written to the audit or returned. The server's X-MCP-User resolution is never used.
 *
 * Every call runs in a call scope of its own (AsyncLocalStorage), so a call
 * made from inside another instance's call (from its audit sink or its fetch)
 * never inherits that instance's policy, sink, redactor or caller.
 */

export type { AuditSink, InstancePolicy } from './productive/scope.js';
export type { GatewayRiskLevel, GatewayUpstreamOperation } from './gateway-tools.js';
export { GatewayConfigError } from './productive/scope.js';
export { ACT_AS_REFUSALS, ACT_AS_TEXTS } from './act-as.js';

/** The person a call is made for (GatewayCallContext.actAs; see src/act-as.ts). */
export type GatewayActAs = ActAs;
/** Why a call was not made as the person: `invalid` actAs, `no_user` in Productive, or the token is `not_permitted` to. */
export type GatewayActAsRefusal = ActAsRefusal;

/** Productive's API address, used when the host gives no `baseUrl`. */
export const PRODUCTIVE_DEFAULT_BASE_URL = DEFAULT_BASE_URL;

export type GatewayJsonValue =
  | string
  | number
  | boolean
  | null
  | GatewayJsonValue[]
  | { [key: string]: GatewayJsonValue };
/** A tool's input, and the JSON object shape of the definitions. */
export type GatewayJsonObject = { [key: string]: GatewayJsonValue };

export interface GatewayToolDefinition {
  name: string;
  title: string;
  description: string;
  riskLevel: GatewayRiskLevel;
  enabledByDefault: boolean;
  inputSchema: GatewayJsonObject;
}

/**
 * Metadata about a failed call, on an error result whose cause is known: the HTTP status Productive answered with,
 * and its request id when a response header gives one as a UUID or hex id. For a host that counts failures without
 * reading their text. Never the response body, Productive's error code or message, or the input.
 */
export type GatewayFailure = FailureMetadata;

export interface GatewayToolResult {
  content: Array<{ type: 'text'; text: string }>;
  structuredContent?: GatewayJsonValue;
  isError?: boolean;
  /** On an error result from Productive's API only: its HTTP status and request id (see GatewayFailure). */
  failure?: GatewayFailure;
  /**
   * On an error result only: the change was not sent, because it could not be made for the person in `actAs`. The text
   * is fixed and never holds the email.
   */
  actAsRefused?: GatewayActAsRefusal;
}

/**
 * Who and which request a call belongs to, and the person to act as. The caller is written to the audit records only
 * as a pseudonym; the person to act as never.
 */
export type GatewayCallContext = CallContext;

/** Deeply read-only JSON, as found in the frozen tool catalog. */
export type GatewayReadonlyJsonValue =
  | string
  | number
  | boolean
  | null
  | readonly GatewayReadonlyJsonValue[]
  | { readonly [key: string]: GatewayReadonlyJsonValue };

/** A tool catalog entry: the gateway definition plus the upstream requests the tool may make. */
export interface GatewayToolCatalogEntry {
  readonly name: string;
  readonly title: string;
  readonly description: string;
  readonly riskLevel: GatewayRiskLevel;
  readonly enabledByDefault: boolean;
  readonly inputSchema: { readonly [key: string]: GatewayReadonlyJsonValue };
  /** Every Productive request the tool may make. Empty for a tool that does not call Productive. */
  readonly upstream: readonly GatewayUpstreamOperation[];
  /**
   * True when the tool can read more than its name says (anything in the
   * system, chosen by the input). A host that grants tools per role gives a
   * broad tool only to roles that may read everything. No gateway tool is broad.
   */
  readonly broad: boolean;
  /**
   * True for a self tool: it works only on the Productive person of the person in `actAs` (found by email) and is
   * refused without one (`actAsRefused: 'invalid'`). False for every other tool.
   */
  readonly self: boolean;
}

export interface ProductiveGatewayOptions {
  /** The customer's Productive API token. Required; never read from the environment. */
  apiToken: string;
  /** The customer's Productive organization id (digits). Required; never read from the environment. */
  organizationId: string;
  /** Productive API base URL (https only). Default https://api.productive.io/api/v2; never read from the environment. */
  baseUrl?: string;
  /** The fetch to use. Default the global fetch. */
  fetchImpl?: typeof fetch;
  /** Time limit per Productive request in milliseconds, 1-600000. Default 30000; never read from the environment. */
  timeoutMs?: number;
  /**
   * Instance policy from the host. Without it the instance uses the default
   * policy (no writes, no disabled tools, no audit records); it never reads
   * a policy or audit variable from the environment.
   */
  policy?: InstancePolicy;
}

const MAX_TIMEOUT_MS = 600_000;

/**
 * JSON Schema for a gateway tool, derived from the same zod schema the call
 * is validated with. `format` is dropped: validators such as Ajv reject
 * unknown formats in strict mode, and zod checks the values when the call runs.
 */
function toJsonSchema(schema: z.ZodType): GatewayJsonObject {
  const { $schema: _ignored, ...json } = z.toJSONSchema(schema, {
    io: 'input',
    override: ctx => {
      delete (ctx.jsonSchema as Record<string, unknown>).format;
    },
  }) as Record<string, unknown>;
  return json as GatewayJsonObject;
}

function deepFreeze<T>(value: T): T {
  if (typeof value === 'object' && value !== null && !Object.isFrozen(value)) {
    for (const entry of Object.values(value)) {
      deepFreeze(entry);
    }
    Object.freeze(value);
  }
  return value;
}

function definition(tool: GatewayToolSpec): GatewayToolDefinition {
  return {
    name: tool.name,
    title: tool.title,
    description: tool.description,
    riskLevel: tool.riskLevel,
    enabledByDefault: tool.riskLevel === 'read',
    inputSchema: toJsonSchema(tool.input),
  };
}

/** All gateway tools, as definitions (names without the `productive_` prefix). */
export const productiveGatewayTools: GatewayToolDefinition[] = GATEWAY_TOOLS.map(definition);

/**
 * The tool catalog: every gateway tool with its definition, the upstream
 * requests it may make and the broad mark. Generated from the same table as
 * `productiveGatewayTools` and deeply frozen. Hosts can use it to build their
 * own permission model without creating a gateway instance.
 */
export const productiveToolCatalog: readonly GatewayToolCatalogEntry[] = deepFreeze(
  GATEWAY_TOOLS.map(tool => ({
    ...definition(tool),
    upstream: tool.upstream.map(operation => ({ ...operation })),
    broad: tool.broad === true,
    self: tool.self === true,
  })),
);

const TOOLS_BY_NAME: ReadonlyMap<string, GatewayToolSpec> = new Map(
  GATEWAY_TOOLS.map(tool => [`${TOOL_PREFIX}${tool.name}`, tool]),
);
const GATEWAY_TOOL_NAMES: readonly string[] = [...TOOLS_BY_NAME.keys()];

/** KEY_REFUSED with every run that shares a piece with any of the secrets masked, so it holds no piece of one. */
function refusedText(field: string, secrets: readonly unknown[]): string {
  return secrets.reduce<string>((text, secret) => maskedText(text, secret), `${field}: ${KEY_REFUSED}`);
}

interface Credentials {
  apiToken: string;
  organizationId: string;
}

function requiredCredentials(options: ProductiveGatewayOptions | undefined, given: readonly unknown[]): Credentials {
  const apiToken: unknown = options?.apiToken;
  const organizationId: unknown = options?.organizationId;
  if (typeof apiToken !== 'string' || apiToken.trim() === '' || typeof organizationId !== 'string' || organizationId.trim() === '') {
    throw new GatewayConfigError(
      'createProductiveGateway requires options.apiToken and options.organizationId. Embedded instances do not read credentials from the environment.',
    );
  }
  // Key admission (src/key-admission.ts): printable ASCII of 16 characters or more, sharing no piece with any text of
  // ours. Checked before anything is built from the token; the refusal is a fixed text that holds no piece of it.
  if (!admitsKey(apiToken.trim())) throw new GatewayConfigError(refusedText('options.apiToken', given));
  // The organization id is the number in the customer's Productive address: digits only. The value is not quoted.
  if (!/^[0-9]{1,12}$/.test(organizationId.trim())) {
    throw new GatewayConfigError('options.organizationId must be the numeric Productive organization id (digits only).');
  }
  return { apiToken: apiToken.trim(), organizationId: organizationId.trim() };
}

function resolveBaseUrl(value: unknown): string {
  if (value === undefined) return DEFAULT_BASE_URL;
  let url: URL | undefined;
  try {
    url = typeof value === 'string' ? new URL(value.trim()) : undefined;
  } catch {
    url = undefined;
  }
  // The value is not quoted: configuration is never echoed.
  if (!url || url.protocol !== 'https:' || url.username || url.password || url.search || url.hash) {
    throw new GatewayConfigError('options.baseUrl must be an https:// URL without user info, query or fragment.');
  }
  return url.toString().replace(/\/+$/, '');
}

function resolveTimeout(value: unknown): number {
  if (value === undefined) return 30_000;
  if (typeof value !== 'number' || !Number.isSafeInteger(value) || value < 1 || value > MAX_TIMEOUT_MS) {
    throw new GatewayConfigError(`options.timeoutMs must be an integer between 1 and ${MAX_TIMEOUT_MS}.`);
  }
  return value;
}

/** A caller or request id from the host: redacted before it is cut short, so no part of a secret survives. */
function contextValue(value: unknown, redactor: SecretRedactor): string | undefined {
  return typeof value === 'string' && value.trim() !== '' ? redactor.redact(value.trim()).slice(0, 200) : undefined;
}

/**
 * Create one gateway instance. `apiToken` and `organizationId` are required
 * and are the only credentials the instance uses; a missing or refused value
 * fails here with GatewayConfigError, before anything is built or sent.
 */
export function createProductiveGateway(options: ProductiveGatewayOptions) {
  let credentials: Credentials | undefined;
  let guard: SecretRedactor | undefined;
  // What the host gave, admitted or not: every error is masked against it.
  const raw = options as Partial<ProductiveGatewayOptions> | undefined;
  const given: unknown[] = [raw?.apiToken];
  const secrets = given.flatMap(value => (typeof value === 'string' ? [value, value.trim()] : []));
  try {
    // Admission first, before a redactor is built from the token.
    credentials = requiredCredentials(options, secrets);
    guard = new SecretRedactor().addSecret(credentials.apiToken).addWholeNumber(credentials.organizationId);
    // The fixed outputs of the sink check (src/fallbacks.ts) must hold no piece of the token.
    if (leaksSecret(fixedOutputs(), guard)) {
      throw new GatewayConfigError(refusedText('options.apiToken', secrets));
    }
    const gateway = buildProductiveGateway(options, credentials, guard);
    // The tool list leaves the gateway as it is: a token that shares a piece with it is refused.
    if (leaksSecret(gateway.tools, guard)) {
      throw new GatewayConfigError(refusedText('options.apiToken', secrets));
    }
    return gateway;
  } catch (error) {
    let message = error instanceof Error ? error.message : String(error);
    if (guard && credentials !== undefined) {
      // Redacted, then checked whole as the very last step: a message that still holds a piece of the token becomes
      // the fixed refusal.
      message = guard.redact(message);
      if (leaksSecret(message, guard)) message = refusedText('options.apiToken', secrets);
    }
    // A fresh error in final form (src/key-admission.ts, sealedError): no cause, a stack without frames, and name,
    // message and stack masked against the token. Then the sink check on the finished object.
    const final = sealedError(new GatewayConfigError(message), ...secrets);
    if (guard && credentials !== undefined && leaksSecret(final, guard)) {
      throw sealedError(new GatewayConfigError(refusedText('options.apiToken', secrets)), ...secrets);
    }
    throw final;
  }
}

function buildProductiveGateway(options: ProductiveGatewayOptions, credentials: Credentials, redactor: SecretRedactor) {
  const raw = options as Partial<ProductiveGatewayOptions>;
  if (raw.fetchImpl !== undefined && typeof raw.fetchImpl !== 'function') {
    throw new GatewayConfigError('options.fetchImpl must be a function.');
  }
  // Always a policy: the host's, or the default one. A gateway call never reads policy or audit variables.
  const policy: ResolvedInstancePolicy = resolveInstancePolicy(raw.policy ?? {}, GATEWAY_TOOL_NAMES);
  const client = new ProductiveClient({
    apiToken: credentials.apiToken,
    organizationId: credentials.organizationId,
    baseUrl: resolveBaseUrl(raw.baseUrl),
    timeoutMs: resolveTimeout(raw.timeoutMs),
    fetchImpl: raw.fetchImpl,
    // Nothing from PRODUCTIVE_*, and no process-wide secret registry.
    fromEnvironment: false,
  });
  // What the shared resource logic checks. Financial, admin and delete are off whatever the host says, and only the
  // gateway's own resources are allowed at all.
  const resourcePolicy: ProductivePolicy = Object.freeze({
    writesEnabled: policy.enableWrites,
    financialsEnabled: false,
    adminEnabled: false,
    deletesEnabled: false,
    allowedResources: [...GATEWAY_RESOURCES],
    deniedResources: [],
  });
  const offeredNames = GATEWAY_TOOL_NAMES.filter(name => !policy.disabledTools.has(name));
  const offeredTools: ReadonlySet<string> = new Set(offeredNames);
  const offered: ReadonlySet<string> = new Set(offeredNames.map(name => name.slice(TOOL_PREFIX.length)));

  return {
    /** Tools enabled on this instance (tools the host's policy disables are left out). */
    tools: productiveGatewayTools.filter(tool => offeredTools.has(`${TOOL_PREFIX}${tool.name}`)),
    callTool(toolName: string, input: GatewayJsonObject = {}, context?: GatewayCallContext): Promise<GatewayToolResult> {
      // The person to act as, checked before anything else: a malformed one refuses the call, so a change is never made
      // for the token's owner by mistake.
      let actAs: Readonly<ActAs> | undefined;
      try {
        actAs = normaliseActAs(context?.actAs);
      } catch {
        return Promise.resolve(actAsRefused('invalid'));
      }
      // Every call in a scope of its own.
      return runInCallScope(
        {
          ...(actAs ? { actAs } : {}),
          policy,
          redactor,
          caller: contextValue(context?.caller, redactor),
          // Our own id for the call: the host's request id is its text, and is not written to the audit.
          requestId: randomUUID(),
          offeredTools,
        },
        () =>
          runCall(toolName, input).then(result => {
            // A successful result is already redacted as data (twice) and its JSON text built from that data; an
            // error result is our own text, redacted as a whole, its failure metadata checked again after that.
            const final = result.isError ? withFailureInForm(redactDeep(result, redactor) as GatewayToolResult) : result;
            // The sink check, as the very last step: a result that holds a piece of the token anywhere, outer
            // fields and the JSON text included, is withheld whole.
            return leaksSecret(final, redactor) ? withheldResult() : final;
          }),
      );
    },
  };

  async function runCall(toolName: string, input: GatewayJsonObject): Promise<GatewayToolResult> {
    const name = typeof toolName === 'string' ? canonicalToolName(toolName) : '';
    const tool = TOOLS_BY_NAME.get(name);
    if (!tool) {
      // Neither the audit record nor the answer repeats the name: it is the caller's text, not ours.
      await auditQuietly({ tool: UNKNOWN_TOOL, action: 'rejected', reason: 'unsupported tool' });
      return errorResult('Unsupported Productive gateway tool.');
    }
    if (!offeredTools.has(name)) {
      await auditQuietly({ tool: name, action: 'policy_denied', reason: 'tool disabled' });
      return errorResult(`The tool ${tool.name} is disabled on this instance.`);
    }
    if (tool.riskLevel !== 'read' && !policy.enableWrites) {
      await auditQuietly({ tool: name, action: 'policy_denied', reason: 'writes disabled' });
      return errorResult(`The tool ${tool.name} changes data, and writes are disabled on this instance.`);
    }

    if (tool.self === true && !currentActAs()) {
      await auditQuietly({ tool: name, action: 'rejected', reason: 'no person to act as' });
      return actAsRefused('invalid');
    }

    const parsed = tool.input.safeParse(input ?? {});
    if (!parsed.success) {
      await auditQuietly({ tool: name, action: 'rejected', reason: 'invalid input' });
      return errorResult(`Invalid input for ${tool.name}: ${z.prettifyError(parsed.error)}`);
    }
    const target = parsed.data as Record<string, unknown>;

    // The start record is written before anything is sent: a sink that refuses it refuses the call.
    try {
      await writeGatewayAudit({ tool: name, action: 'start', target });
    } catch {
      return errorResult(AUDIT_REFUSED);
    }
    let data: unknown;
    try {
      data = await tool.handler(target, { client, policy: resourcePolicy, offered });
    } catch (error) {
      await auditQuietly({ tool: name, action: 'error', target, error });
      if (error instanceof ActAsRefusedError) return actAsRefused(error.refusal);
      return errorResult(gatewayErrorText(error), failureMetadata(error));
    }
    await auditQuietly({ tool: name, action: 'finish', target, status: 'ok' });
    // Twice: the second pass, the last step, also covers what the first inserted (the depth placeholder).
    return jsonResult(tool.summary, redactDeep(redactDeep(data, redactor), redactor));
  }
}

/** One gateway instance, as returned by createProductiveGateway. */
export type ProductiveGateway = ReturnType<typeof createProductiveGateway>;

/** The text of a call refused because its start record could not be written. */
const AUDIT_REFUSED = 'The audit record could not be written, so the call was not run.';

/** The audit's tool for a call to a tool this gateway does not have. */
const UNKNOWN_TOOL = 'unknown_tool';

// ---------------------------------------------------------------------------
// Errors
// ---------------------------------------------------------------------------

/** Our own words per HTTP status, after `Productive API request failed with HTTP <status>`. */
const STATUS_HINTS: Record<number, string> = {
  400: 'Productive refused the request.',
  401: 'The API token was refused.',
  403: 'The token has no access to this organization or this record.',
  404: 'The record does not exist, or the feature is not enabled for the organization.',
  422: 'Productive could not apply the change: a value is missing or not valid.',
  429: 'Rate limited by Productive; try again later.',
};

/**
 * An error as a gateway returns it: our own English text, never Productive's
 * response body, message or request id, nor the request's address.
 */
export function gatewayErrorText(error: unknown): string {
  const name = error instanceof Error ? error.name : '';
  const status = (error as { status?: unknown } | null)?.status;
  if ((name === 'ProductiveHttpError' || name === 'ProductiveRedirectError') && typeof status === 'number') {
    const prefix = `Productive API request failed with HTTP ${status}`;
    if (name === 'ProductiveRedirectError') return `${prefix}. Redirects are not followed.`;
    const hint = STATUS_HINTS[status] ?? (status >= 500 ? 'Productive had an error; try again later.' : undefined);
    const retry = status === 429 ? retryAfter((error as { retryAfter?: unknown }).retryAfter) : '';
    return hint ? `${prefix}. ${hint}${retry}` : `${prefix}.`;
  }
  if (name === 'TimeoutError' || name === 'AbortError') return 'Productive API request timed out.';
  if (error instanceof GatewayInputError) return error.message;
  if (error instanceof TypeError) return 'Network error calling the Productive API.';
  // Our own checks (registry validation, time tracking) throw plain errors with our own text.
  if (error instanceof Error && Object.getPrototypeOf(error) === Error.prototype) return error.message;
  return 'The Productive call failed.';
}

/** ` Retry after N seconds.` for a numeric Retry-After header, otherwise nothing. */
function retryAfter(value: unknown): string {
  return typeof value === 'string' && /^\d{1,6}$/.test(value.trim()) ? ` Retry after ${Number(value)} seconds.` : '';
}

// ---------------------------------------------------------------------------
// Audit
// ---------------------------------------------------------------------------

interface GatewayAuditEvent {
  tool: string;
  action: 'start' | 'finish' | 'error' | 'policy_denied' | 'rejected';
  target?: unknown;
  status?: string;
  reason?: string;
  error?: unknown;
}

/** The key of the caller pseudonyms: random per process, never written anywhere. */
const CALLER_KEY = randomBytes(32);

/** The caller as `hmac:` and 16 hex characters: the same caller gives the same pseudonym within the process. */
export function callerPseudonym(caller: string | undefined): string | undefined {
  if (caller === undefined || caller === '') return undefined;
  return `hmac:${createHmac('sha256', CALLER_KEY).update(caller, 'utf8').digest('hex').slice(0, 16)}`;
}

/**
 * The audit's code for an error: `http_<status>` for a Productive answer, `timeout`, `act_as_<refusal>`, `network`, or
 * `error`. Only
 * codes from this fixed set are written; the error's message never is.
 */
function auditErrorCode(error: unknown): string {
  const name = error instanceof Error ? error.name : '';
  const status = (error as { status?: unknown } | null)?.status;
  if ((name === 'ProductiveHttpError' || name === 'ProductiveRedirectError') && typeof status === 'number') {
    return `http_${status}`;
  }
  if (name === 'TimeoutError' || name === 'AbortError') return 'timeout';
  if (error instanceof ActAsRefusedError) return `act_as_${error.refusal}`;
  if (error instanceof TypeError) return 'network';
  return 'error';
}

/**
 * Send one audit record to the host's sink (none: nothing is written). The
 * record holds the caller only as a pseudonym, the call's own request id, the
 * input only as a hash, and an error only as a code. It is redacted with the
 * instance's redactor, then checked in its final form: one that still holds a
 * piece of the token is replaced by a fixed record. A failing sink throws.
 */
async function writeGatewayAudit(event: GatewayAuditEvent): Promise<void> {
  const sink = currentInstancePolicy()?.audit;
  const redactor = currentRedactor();
  if (!sink || !redactor) return;
  const context = currentCallContext();
  const record = {
    timestamp: new Date().toISOString(),
    requestId: context.requestId,
    tool: event.tool,
    caller: callerPseudonym(context.caller),
    action: event.action,
    targetHash:
      event.target === undefined
        ? undefined
        : createHash('sha256').update(JSON.stringify(event.target)).digest('hex'),
    status: event.status,
    reason: event.reason,
    error: event.error === undefined ? undefined : auditErrorCode(event.error),
  };
  const safe = JSON.parse(JSON.stringify(redactDeep(redactDeep(record, redactor), redactor))) as Record<string, unknown>;
  await sink(leaksSecret(safe, redactor) ? withheldAuditRecord() : safe);
}

/** An audit record that does not decide whether the call runs: a failing sink is ignored. */
async function auditQuietly(event: GatewayAuditEvent): Promise<void> {
  try {
    await writeGatewayAudit(event);
  } catch {
    // Only the start record is required.
  }
}

// ---------------------------------------------------------------------------
// Results
// ---------------------------------------------------------------------------

/**
 * The summary, then the same (already redacted) data as compact JSON in the text block, as the MCP spec asks of a
 * tool that returns structured content: many clients read only the text. The text holds exactly
 * `structuredContent`, and the sink check in callTool covers it.
 */
function jsonResult(text: string, structuredContent: unknown): GatewayToolResult {
  const data = JSON.parse(JSON.stringify(structuredContent ?? null)) as GatewayJsonValue;
  return {
    content: [{ type: 'text', text: `${text}\n\n${JSON.stringify(data)}` }],
    structuredContent: data,
  };
}

/** A change not made for the person: our fixed text and the refusal, nothing else. */
function actAsRefused(refusal: ActAsRefusal): GatewayToolResult {
  return { ...errorResult(new ActAsRefusedError(refusal).message), actAsRefused: refusal };
}

function errorResult(text: string, failure?: GatewayFailure): GatewayToolResult {
  return {
    isError: true,
    content: [{ type: 'text', text }],
    ...(failure ? { failure } : {}),
  };
}

/**
 * The failure metadata as it must be after redaction: on an error result only, a status of 100-599 and a request id
 * still in the form of one (redaction can have changed it). Anything else is dropped, never passed on.
 */
function withFailureInForm(result: GatewayToolResult): GatewayToolResult {
  const { failure, actAsRefused: refusal, ...withoutRefusal } = result;
  // The refusal stays only on an error result, and only as one of ours.
  const kept = result.isError ? actAsRefusalInForm(refusal) : undefined;
  const rest: GatewayToolResult = kept ? { ...withoutRefusal, actAsRefused: kept } : withoutRefusal;
  if (!result.isError || failure === undefined || failure === null || typeof failure !== 'object') return rest;
  const status = failure.httpStatus;
  if (typeof status !== 'number' || !Number.isInteger(status) || status < 100 || status > 599) return rest;
  const requestId = vendorRequestId(failure.requestId);
  return { ...rest, failure: requestId === undefined ? { httpStatus: status } : { httpStatus: status, requestId } };
}
