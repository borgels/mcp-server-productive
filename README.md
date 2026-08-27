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

## Attribution

A Productive API token belongs to a person, and Productive credits every change to that person.
With one organization-wide token, the activity log will say the service account did everything.

That cannot be fixed from here without per-user tokens, but it can be narrowed. With
`PRODUCTIVE_TRUST_FORWARDED_USER=true`, the `X-MCP-User` header is resolved to a Productive person
and anything person-shaped — a time entry, a booking — defaults to **them** rather than to the
token's owner. If the address matches nobody, or more than one person, the server refuses to guess
and asks for an explicit `person_id`.

Enable it **only** behind a gateway that sets the header from a validated token *and strips any
client-supplied copy*. Otherwise a caller can name anyone and log time as them.

`productive_check_connection` reports the token's owner, so the attribution is never a surprise.

## Multi-organization

One instance serves exactly one organization. `X-Organization-Id` comes from the environment and
is never a tool argument, so no code path — including the generic tools — can reach another
tenant. Run a second instance for a second organization; the image is the same.

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
