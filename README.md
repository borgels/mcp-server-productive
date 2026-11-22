# mcp-server-productive

MCP server for the [Productive.io](https://developer.productive.io) API v2 — projects, tasks,
time tracking, resource planning, financials, CRM and reports for one organization.

Productive exposes about 650 operations over 132 resources. Turning those into 650 MCP tools
would swamp any client's tool list, so this server is **twelve tools driven by a generated
registry**: the tools are generic, and the registry knows what each resource really accepts.

This is an independent, unofficial project. It is not developed, endorsed or supported by Productive.

## Tools

**Discovery** — `productive_search_capabilities`, `productive_describe_resource`,
`productive_check_connection`, `productive_describe_custom_fields`

**Read** — `productive_list` (filters, sorts, includes, paging, and the 26 report endpoints with
grouping), `productive_get`

**Write** — `productive_create`, `productive_update`, `productive_delete`, `productive_run_action`
(150 named verbs: archive, restore, approve, close, copy, finalize, send…),
`productive_track_time`, `productive_commit_operation`

**Per-user auth (opt-in)** — `productive_connect`, `productive_status`,
`productive_disconnect` — see [Authentication](#authentication)

Start with `productive_search_capabilities`. Productive's resource names are its own — a budget is
a `deal`, a board column is a `workflow_status`, a timesheet approval lives on `time_entries` —
and guessing costs calls.

## The registry

`src/productive/registry.generated.ts` is derived from Productive's published OpenAPI document by
`scripts/generate-registry.mjs` and committed, so CI never needs the network and a spec change
shows up as a reviewable diff. For every resource it records the filter fields, sort keys, report
group keys, includable relationships, the writable attributes for create and update with the
required ones marked, and each named action.

That is what lets twelve tools stay honest. `productive_describe_resource` hands back the exact
contract for one resource, and every argument is checked against it before a request goes out.

Regenerate with `npm run registry:generate` (add a path argument to use a local copy of the spec).
The generator **fails the build** if a hand-written classification — a risk tier, an
outward-facing flag, a blocked operation — no longer matches any path in the spec, so a rename
upstream cannot silently drop a guard.

## What the API does, as measured

Everything here was verified against a live organization, because the spec and the API disagree in
places that matter.

**Time is minutes. Money is minor units.** A time entry of `2` is two minutes. Both come back
that way too.

**Unknown filters, sorts and includes fail loudly.** HTTP 400 with `unsupported_filter`,
`sort_param_unsupported`, `unsupported_include`. So validating those here is a better error, not a
safety net.

**Unknown write attributes fail silently.** `PATCH` with a misspelled attribute returns **HTTP 200
and changes nothing** — indistinguishable from success. This server therefore refuses an attribute
the resource does not declare, rather than reporting a write that did not happen. It is the single
most useful thing the registry does.

**There are exactly six filter operators, on every field:** `contains`, `eq`, `gt`, `lt`,
`not_contain`, `not_eq`. The spec lists four per field and omits `gt`/`lt`, which do work; `gte`,
`lte`, `in`, `not_in`, `starts_with`, `ends_with`, `blank` and `present` are all refused with
`unsupported_filter_operation`. **There is no inclusive comparison**, so an inclusive range needs
the resource's own `after`/`before` or `<field>_after`/`<field>_before` filter fields.

**`page[size]` caps at 200 and clamps silently.** Asking for 500 returns 200 with no error. Results
carry `total` and `nextPage` so a page is not mistaken for the whole answer.

**PATCH is genuinely partial.** Omitted attributes keep their values; there is no need to resend a
whole record.

**`data.type` is not checked.** Patching a task with `type: "projects"` succeeds and applies the
change. This server sends the correct type anyway.

**A 403 saying the organization id "has to be provided" may mean it was wrong, not missing.** The
same `no_organization_id` code covers a missing header and an organization the token cannot reach.

**A missing feature answers 404, not 403.** `/boards` 404s on an organization without it, which
reads like a broken path.

**Deletes may be restorable.** A deleted task appears in `deleted_items` with `item_type` and
`item_id` and can be restored through that resource's `restore` action. Verified for tasks only —
do not assume it holds for every type.

**`GET /users` is the only caller-scoped endpoint.** It returns exactly one record — you — and is
how this server identifies a token's owner. There is no `/users/me`; that path 404s. Beware
`/organization_memberships`: it is *not* scoped to the pinned organization, but lists the caller's
memberships across every organization they belong to, so its row count is not a headcount.

**No rate-limit headers.** Only `x-request-id`, which errors from this server quote. Back off on
429 rather than probing for the limit.

## Permissions

Four switches, all off by default. A read-only server is the useful, safe default.

| Switch | Covers |
| --- | --- |
| `PRODUCTIVE_ENABLE_WRITES` | Master switch. Nothing is mutated without it. |
| `PRODUCTIVE_ENABLE_FINANCIALS` | Money, pricing, payroll, documents a customer receives: invoices, line items, payments, bills, expenses, purchase orders, proposals, contracts, prices, rate cards, salaries, overheads, tax rates, bank accounts, subsidiaries. |
| `PRODUCTIVE_ENABLE_ADMIN` | Access and organization-wide configuration: people, memberships, permission sets, teams, invitations, custom fields, webhooks, integrations, approval and time-tracking policies. |
| `PRODUCTIVE_ENABLE_DELETES` | Deletes, on top of the tier gate. |

One master switch is not enough for Productive: the same API moves a task, issues an invoice and
grants a permission set, and those are three different decisions. A server trusted to run project
work should not thereby be able to send an invoice.

`PRODUCTIVE_ALLOWED_RESOURCES` / `PRODUCTIVE_DENIED_RESOURCES` narrow an instance further, and
apply to reads as well — an instance scoped to time tracking should not read salaries either.

**Never exposed at all**, regardless of switches: `passwords`, `sessions`,
`organization_subscriptions`, the unauthenticated `public/*` share links, and
`PATCH /users/{id}/update_password`. These are absent from the registry rather than gated, so no
policy bug can re-open them.

### Two-step writes

Ordinary project work — a task, a time entry, a booking, a comment — is written in one call.
Requiring a handshake around every time entry would make the server unusable for the thing people
do most.

Everything with a wider blast radius is **staged**: the tool returns the exact request plus an
HMAC-SHA256 signature and sends nothing, and `productive_commit_operation` runs it only if the
operation comes back unaltered, within 15 minutes, from the same caller that prepared it. At commit
the HTTP method and path are derived again from the registry for the operation's resource and verb
(the path may differ from the template only by a single, safe id), and every policy check runs
again. The signing key is `PRODUCTIVE_PREPARE_SECRET`; when unset, a random key is generated at
start-up, so staged operations do not survive a restart and are not valid across replicas. That covers the financial and admin tiers, every delete, anything that leaves the
organization, and every `bulk_*` action — those act on all records a filter matches, so they also
refuse to run without an explicit filter.

Six operations are flagged `outward` because they reach somebody outside the organization the
moment they run: `invoices.send`, `invoices.send_einvoice`, `people.invite`, `people.resend`,
`organizations.resend_code`, and creating an `invitation`.

## Authentication

Two modes. `PRODUCTIVE_ORGANIZATION_ID` is required in both, and is never a tool argument.

### Per-user tokens (recommended)

Each person links their **own** Productive token, so Productive applies their permissions and
records their name on what they do.

This matters more on Productive than on most systems. Productive attributes work to people: a time
entry belongs to a `person_id`, and every change is stamped with the token's owner in the activity
log — which is the record a client invoice gets defended with. On one shared token, that log says
the service account did everything.

```env
PRODUCTIVE_PER_USER_AUTH=true
PRODUCTIVE_TRUST_FORWARDED_USER=true
PRODUCTIVE_ENCRYPTION_KEY=<min 16 chars>
PRODUCTIVE_STORE_PATH=/data/store.json
PRODUCTIVE_PUBLIC_BASE_URL=https://productive.example.com
# PRODUCTIVE_API_TOKEN deliberately unset
```

The flow:

1. The caller runs `productive_connect` and gets a **single-use link, valid 10 minutes**, bound to
   their identity.
2. They open it and paste a token they created in Productive under **Settings → API integrations**.
   The token goes from their browser straight to the server, so it never enters the conversation
   transcript — a Productive token is bearer-equivalent to their whole account, and, as measured
   below, commonly reaches more than one organization.
3. Before storing it, the server calls `GET /users` **with that token and this organization's id**.
   One call proves three things: the token is valid, it can reach *this* organization, and who it
   belongs to. The page then confirms which account was linked.
4. Tokens are encrypted at rest with AES-256-GCM, one row per verified identity.

Sharp edges:

- **Identity comes only from the gateway.** `X-MCP-User` is read only when
  `PRODUCTIVE_TRUST_FORWARDED_USER=true`, never from anything the MCP client controls. Enable it
  only behind a gateway that sets the header from a validated token *and strips a client-supplied
  copy* — otherwise a caller can name any identity and act as them. The HTTP transport refuses
  to start with this on unless `MCP_HTTP_TOKEN` is set too.
- **No fallback.** An un-enrolled caller gets `NOT_CONNECTED`, never the shared token, even if
  `PRODUCTIVE_API_TOKEN` happens to be set. A fallback would hand them borrowed rights, which is
  the failure this mode exists to remove.
- **`/productive/enroll` must be reachable by the user's browser**, bypassing the MCP gateway — a
  browser cannot carry the gateway's bearer token. Route `/productive/*` on
  `PRODUCTIVE_PUBLIC_BASE_URL` straight to the container. Its security is the single-use,
  identity-bound state token.
- **Persist `PRODUCTIVE_STORE_PATH`** on a volume, and keep `PRODUCTIVE_ENCRYPTION_KEY` stable —
  change it and every stored token becomes undecryptable.
- If a token's own Productive email differs from the caller's directory address, that is reported
  loudly on the page and in `productive_status`, and connected anyway. Set
  `PRODUCTIVE_REQUIRE_EMAIL_MATCH=true` to refuse instead. It is off by default because whoever
  pastes another person's token already holds it, so refusing buys little security, while a
  Productive account under a different address is entirely plausible.
- Per-user auth separates **permissions and attribution, not organizations**. The organization pin
  still applies to everyone.

### Shared token

Set `PRODUCTIVE_API_TOKEN` to one token. Simple, and right for stdio or a single operator — but
every caller then acts as **that token's owner**, with their permissions, and Productive's activity
log credits every change to them.

`PRODUCTIVE_TRUST_FORWARDED_USER` still helps here: person-shaped writes (a time entry, a booking)
default to the resolved caller rather than the token's owner, and the server refuses to guess when
the address matches nobody or more than one person. `productive_check_connection` names the token's
owner either way, so the attribution is never a surprise.

## Multi-organization

One instance serves exactly one organization. `X-Organization-Id` comes from the environment and is
never a tool argument, so no code path — including the generic tools — can reach another tenant.
Run a second instance for a second organization; the image is the same.

This is not theoretical. A single token routinely reaches several organizations: on the account this
was developed against, `GET /organizations` returned three, and switching only the header moved
between them (the other two answered `403 subscription_expired`, not "not found"). The header is the
whole boundary, which is why it is pinned rather than passed in — and why an enrolled per-user token
is verified against *this* organization before it is stored.

## Configuration

See `.env.example`. The two required variables are `PRODUCTIVE_API_TOKEN` (Settings → API
integrations in Productive; it inherits the creating user's permissions) and
`PRODUCTIVE_ORGANIZATION_ID` (the numeric id in your Productive URL).

`PRODUCTIVE_TIMEOUT_MS` must be a plain integer; an invalid value stops the server at startup.

### HTTP transport

| Variable | Default | Meaning |
|---|---|---|
| `MCP_HTTP_HOST` / `HOST` | `127.0.0.1` | Bind address. |
| `PORT` | `3000` | Listen port. |
| `MCP_HTTP_TOKEN` | – | Bearer token required on `/mcp`. At least 32 printable ASCII characters, e.g. `openssl rand -hex 32`. Required for any non-loopback bind and with `MCP_ALLOW_ANY_ORIGIN=true`. |
| `MCP_HTTP_ALLOW_UNAUTHENTICATED` | `false` | Serve a non-loopback bind without a token (only when access is restricted by other means). |
| `MCP_ALLOWED_ORIGINS` | localhost origins | Comma-separated exact `Origin` values allowed. Requests without `Origin` (server-to-server) are allowed. |
| `MCP_ALLOW_ANY_ORIGIN` | `false` | Allow every origin (requires `MCP_HTTP_TOKEN`). |
| `MCP_ALLOWED_HOSTS` | – | Comma-separated host names accepted in the `Host` header. Without it, a loopback bind only accepts localhost names and no check is done on other binds. |
| `MCP_MAX_BODY_BYTES` | `10485760` | Maximum request body. |
| `MCP_AUTH_FAILURE_LIMIT` | `20` | Failed authentication attempts per client address and window before further failures get 429; `0` disables. Valid tokens are never throttled. |
| `MCP_AUTH_FAILURE_WINDOW_MS` | `60000` | Window for the limit above. |

`GET /healthz` answers `{"ok":true,"perUserAuth":<true|false>}` without authentication. 401 responses carry
`WWW-Authenticate: Bearer`; invalid JSON gets 400. The server shuts down gracefully on SIGTERM/SIGINT.

`/healthz` and `/productive/enroll` are served without the bearer token (the enrollment page is
reached by a browser and protected by its single-use state token). The `Host` check applies to
`/mcp` only. `PRODUCTIVE_TRUST_FORWARDED_USER=true` always requires `MCP_HTTP_TOKEN`, also with
`MCP_HTTP_ALLOW_UNAUTHENTICATED=true`.

Set `PRODUCTIVE_AUDIT_LOG` to append one JSON line per mutation attempt, including the ones policy
refused. Request bodies are deliberately not recorded: they carry salaries, rates and personal
data, and an audit trail that must be guarded as closely as the source system tends not to get
read.

## Embedding (`./gateway`)

`mcp-server-productive/gateway` lets a host application run a narrow set of
tools in-process instead of over MCP, in the same shape as
`mcp-server-template`. One process can run several gateway instances, for
example one per tenant.

```ts
import { createProductiveGateway, productiveToolCatalog } from 'mcp-server-productive/gateway';

const gateway = createProductiveGateway({
  apiToken: tenant.productiveToken,
  organizationId: tenant.productiveOrganizationId,
  policy: { enableWrites: true, audit: record => log(record) },
});
const result = await gateway.callTool('list_tasks', { projectId: '701', open: true }, { caller: 'user-1' });
```

The module exports:

- `createProductiveGateway({ apiToken, organizationId, baseUrl?, fetchImpl?, timeoutMs?, policy? })`.
  `apiToken` and `organizationId` are required and never read from the
  environment. `baseUrl` defaults to `https://api.productive.io/api/v2`
  (`PRODUCTIVE_DEFAULT_BASE_URL`) and must be `https://`; `timeoutMs`
  defaults to 30 seconds (1-600000). The gateway reads no `PRODUCTIVE_*`
  variable at all: not the credentials, the base URL, the timeout, nor any
  policy, per-user or audit variable. It has no per-user tokens, no caller
  header (`X-MCP-User`) and no prepare/commit step: every call acts with the
  instance's token in the instance's organization. The only person a call can
  be made for is the host's `actAs` (below).
- **Acting as a person (`actAs`).** A host that verified the person a call is
  made for passes `actAs: { email }` in the call context
  (`gateway.callTool(name, input, { caller, actAs })`, `src/act-as.ts`, the
  template's shared shape). Every **change** (the write tools) then first
  finds exactly one active team member whose email is that address
  (`GET /people?filter[email]=…&filter[person_type]=1` as the token's owner,
  compared case-insensitively, the whole result read) and is made for them:
  - `track_time` logs the time with their `person_id`. `personId` may be left
    out; one that names anyone else is refused before anything is written
    (time is logged only for the person).
  - `create_task`, `update_task` and `add_comment` are made only when the
    person exists. Productive has no author field to set, so its activity log
    and a comment's creator still show the token's owner.
  - No such person, an inactive one, more than one, or a result that may be
    cut short (a full page of 200, or a total above what was read): nothing
    is sent, and the result is an error with `actAsRefused: 'no_user'`.
  - Productive answering the lookup with 403 (the token may not see people):
    `actAsRefused: 'not_permitted'`.
  - A malformed `actAs` (`null` included): `actAsRefused: 'invalid'`, before
    anything is sent.
  - **Reads run as the token's owner**, with or without `actAs`: the host
    decides who may read what.
  - The server adds the email to no audit record, text or field of its own
    (an audit error code is `act_as_<refusal>`). Productive's own data is
    passed on as it is.

  Without `actAs` every call runs as before, and `track_time` needs
  `personId`. The token's user needs to see all team members and to log time
  for others (in practice an administrator) for `actAs` to work for everyone.
- `gateway.tools` (the tools enabled on the instance) and
  `gateway.callTool(name, input, { caller, requestId, actAs })`. Names are accepted
  with or without the `productive_` prefix. Input (`GatewayJsonObject`) is
  validated with the tool's strict zod schema before anything is sent, and
  unknown fields are refused. The audit records of the call hold `caller`
  only as an HMAC pseudonym (a per-process key), the input only as a SHA-256
  hash, and a request id of the server's own, the same for every record of
  the call; the host's `requestId` is not written. An error is recorded as a
  fixed code (`http_<status>`, `timeout`, `act_as_<refusal>`, `network` or `error`), never as its
  message.
- `productiveGatewayTools`: the definitions (`name` without prefix, `title`,
  `description`, `riskLevel`, `enabledByDefault`, `inputSchema` as JSON
  Schema derived from the zod schema the call is validated with).
- `productiveToolCatalog`: the same tools, deeply frozen, with `upstream`
  (method and path template of every Productive request the tool may make)
  and `broad` (false for every tool: each reads a fixed resource). Hosts can
  build their own permission model from it without creating an instance.
- `GatewayConfigError`, `PRODUCTIVE_DEFAULT_BASE_URL` and the types
  (`ProductiveGatewayOptions`, `ProductiveGateway`, `InstancePolicy`,
  `AuditSink`, `GatewayToolDefinition`, `GatewayToolCatalogEntry`,
  `GatewayUpstreamOperation`, `GatewayToolResult`, `GatewayCallContext` and
  the JSON types).

| Tool | Risk | Input | Productive requests |
|---|---|---|---|
| `search_capabilities` | read | `query`, `limit?` | none |
| `check_connection` | read | none | `GET /users`, `GET /organizations` |
| `list_projects` | read | `query?`, `archived?`, `companyId?`, `page?`, `pageSize?` | `GET /projects` |
| `get_project` | read | `projectId` | `GET /projects/{projectId}` |
| `list_tasks` | read | `projectId?`, `assigneeId?`, `open?`, `query?`, `page?`, `pageSize?` | `GET /tasks` |
| `get_task` | read | `taskId` | `GET /tasks/{taskId}`, `GET /comments` |
| `list_people` | read | `query?`, `page?`, `pageSize?` | `GET /people` |
| `list_companies` | read | `query?`, `archived?`, `page?`, `pageSize?` | `GET /companies` |
| `list_budgets` | read | `projectId?`, `companyId?`, `open?`, `page?`, `pageSize?` | `GET /deals` |
| `get_budget` | read | `budgetId` | `GET /deals/{budgetId}` |
| `list_services` | read | `budgetId?`, `projectId?`, `page?`, `pageSize?` | `GET /services` |
| `list_time_entries` | read | `after`, `before`, `personId?`, `projectId?`, `serviceId?`, `taskId?`, `page?`, `pageSize?` | `GET /time_entries` |
| `time_report` | read | `after`, `before`, `groupBy`, `projectId?`, `personId?`, `page?` | `GET /reports/time_reports` |
| `create_task` | write | `projectId`, `taskListId?`, `title`, `description?`, `assigneeId?`, `dueDate?` | `GET /task_lists`, `POST /tasks` |
| `update_task` | write | `taskId`, `title?`, `description?`, `assigneeId?`, `dueDate?`, `workflowStatusId?` | `PATCH /tasks/{taskId}` |
| `add_comment` | write | `taskId`, `body` | `POST /comments` |
| `track_time` | write | `personId`, `date`, `minutes?` or `hours?`, `taskId?`, `serviceId?`, `note?`, `billableMinutes?` | `GET /tasks/{taskId}`, `POST /time_entries` |

Ids are strings of digits; dates are `YYYY-MM-DD`; a time read
(`after`/`before`) spans at most one year. Every result is a fixed
projection, not the record as Productive sends it: people are name, title,
mail and active flag; `check_connection` names only the token owner and the
instance's organization; budgets, services, time entries and reports leave
out cost, profit, margin, revenue and price (they derive from salaries and
rates). Time is in minutes; a budget's total and used amounts are in the
currency's minor units. `track_time` needs `personId`: the gateway never
guesses the person. Without `serviceId` the service is taken from the task.

The gateway never deletes, never runs an action, never stages a change, and
never writes a financial or administrative resource, whatever the policy: it
has no tool that could, and the resource policy it hands the shared logic
has financial, admin and delete writes off and allows only the resources
above.

**Instance policy.** With `policy: { enableWrites, disabledTools, audit }`
the host decides the instance's policy: writes run only with
`enableWrites: true`; disabled tools are left out of `tools` (and out of
`search_capabilities`) and refused when called; audit records go to `audit`
(none without it). `disabledTools` must name gateway tools. Each call writes
a start record before anything is sent to Productive, and a sink that throws
on it refuses the call. Without `policy` the instance has no writes, no
disabled tools and no audit records. Every call runs in a call scope of its
own (AsyncLocalStorage), so a call made from inside another instance's call
never inherits its policy, sink, redactor or caller.

**Results.** A successful result has `structuredContent` and one text block:
a short English summary, a blank line, and the same data as compact JSON.
The data is redacted twice against the instance's secrets before it is
serialised: the API token (exact value, URL- and JSON-encoded forms and any
piece of 6 characters or more, in strings, object keys and the string form
of numbers) and the organization id (as a whole number in text, not inside
a longer number, a date or a decimal). Credential-shaped text and
credential-named fields are masked as well.

**Errors.** The text of an error result is our own English, never Productive's
response body, message or request id, nor the request's address. An HTTP
failure starts with `Productive API request failed with HTTP <status>.`,
followed by our own hint for 400, 401 (`The API token was refused.`), 403,
404, 422, 429 (with `Retry after N seconds.` when Productive sends a numeric
`Retry-After`) and 5xx, so a host can map it by status. Other errors are
`Invalid input for <tool>: …`, `Unsupported Productive gateway tool.`,
`The tool <tool> is disabled on this instance.`,
`The tool <tool> changes data, and writes are disabled on this instance.`,
`The audit record could not be written, so the call was not run.`,
`Productive API request timed out.`, `Network error calling the Productive API.`,
`Productive sent an answer this server cannot read.` or a refusal of the
input in our own words (for example `No budget with this id.`).

**Failure metadata.** When Productive answered with an HTTP error (or a redirect,
which is not followed), the error
result also has `failure: { httpStatus, requestId? }`: the status, and
Productive's request id from a response header (`REQUEST_ID_HEADERS` in
`src/errors.ts`, `x-request-id` first) only when it is a hex id of 8 to 64
characters (one run of hex digits, or groups of four or more joined by single
hyphens, as in a UUID) and does not hold the shape of a personal number. It is
checked again after redaction. A host can count failures from it without
reading their text. Never the response body, Productive's error code or
message.

**Credential admission and the sink check.** A gateway accepts only an API
token of printable ASCII (0x21-0x7E) of at least 16 characters that shares
no piece of 6 characters with a string literal in `src/`
(`src/fixed-corpus.generated.ts`, kept up to date by a test), with the fixed
fallbacks (`src/fallbacks.ts`) or with the tool list, and an organization id
of digits only. A refused value throws `GatewayConfigError` when the gateway
is created, before anything is built or sent; the refusal is a fixed text
that holds no piece of the token, and every error a gateway throws has no
`cause` and a `stack` of only `name: message`. As the very last step, every
output (the tool list, each result as a whole, each audit record) is checked
in its final form, and one that still holds a piece of the token is
replaced by a fixed fallback. Residual risk: Productive echoing the token
otherwise transformed (split into pieces shorter than 6 characters,
reversed, hashed) is not recognised; such data reaches only the tenant whose
token it is.

## Security model

- With per-user authentication each caller acts with their own enrolled Productive token, so
  Productive applies that person's permissions. With a shared `PRODUCTIVE_API_TOKEN` every caller
  acts as that token's owner.
- Deciding who may reach this server, and asserting who the caller is (`X-MCP-User`), belongs in an
  identity-aware gateway in front of it. `MCP_HTTP_TOKEN` only authenticates that gateway.
- Tool access is not data access: the policy switches limit which tools and resources can be used,
  not what the underlying token can read.
- The HTTP server does not terminate TLS. Run it on a private network or behind a TLS-terminating
  proxy; the enrollment page in particular must only be exposed over HTTPS.
- Upstream redirects are never followed, so `X-Auth-Token` is only sent to `PRODUCTIVE_BASE_URL`.
  Error bodies are read up to 64 KB, tokens are redacted before error text is truncated, and error
  URLs omit query strings.

## Install

```bash
npx mcp-server-productive
```

Runs the stdio server from npm. Configure it with the environment variables in `.env.example`.

## Run

```bash
npm install
npm run dev          # stdio
npm run dev:http     # streamable HTTP on :3000/mcp (stateless), /healthz open
npm test
npm run smoke:live   # reads a real organization; stages one write, commits nothing
```

Docker images: `ghcr.io/borgels/mcp-server-productive` (published on push to `main`).

## License

The code is source-available under the [Functional Source License, Version 1.1, ALv2 Future License](LICENSE) (FSL-1.1-ALv2).

In plain words:

- **Allowed:** reading the code, running it, changing it, using it inside your own organisation (also commercially), using it for non-commercial education and research, and contributing changes back.
- **Not allowed:** making it, or something built from it, available to others as a commercial product or service that competes with it, for example a hosted service with the same functionality.
- **Becomes Apache-2.0:** each version is also licensed under the Apache License 2.0 from two years after it is released.
- **Earlier versions:** versions released before 0.6.0 were licensed under Apache-2.0 and remain so.

The terms in [LICENSE](LICENSE) are what apply; this summary does not replace them. See also [NOTICE](NOTICE).
