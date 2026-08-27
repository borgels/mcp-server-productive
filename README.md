# mcp-server-productive

MCP server for the [Productive.io](https://developer.productive.io) API v2 — projects, tasks,
time tracking, resource planning, financials, CRM and reports for one organization.

Productive exposes about 650 operations over 132 resources. Turning those into 650 MCP tools
would swamp any client's tool list, so this server is **twelve tools driven by a generated
registry**: the tools are generic, and the registry knows what each resource really accepts.

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

Everything with a wider blast radius is **staged**: the tool returns the exact request plus a hash
and sends nothing, and `productive_commit_operation` runs it only if the operation comes back
unaltered. That covers the financial and admin tiers, every delete, anything that leaves the
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
  copy* — otherwise a caller can name any identity and act as them.
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

Set `PRODUCTIVE_AUDIT_LOG` to append one JSON line per mutation attempt, including the ones policy
refused. Request bodies are deliberately not recorded: they carry salaries, rates and personal
data, and an audit trail that must be guarded as closely as the source system tends not to get
read.

## Run

```bash
npm install
npm run dev          # stdio
npm run dev:http     # streamable HTTP on :3000/mcp (stateless), /healthz open
npm test
npm run smoke:live   # reads a real organization; stages one write, commits nothing
```

Docker images: `ghcr.io/borgels/mcp-server-productive` (published on push to `main`).

## Licence

Apache-2.0.
