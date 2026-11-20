# Changelog

## Unreleased

## 0.4.0

### Embedding (`./gateway`)

- New package export `mcp-server-productive/gateway` in the shape of `mcp-server-template`:
  `createProductiveGateway({ apiToken, organizationId, baseUrl?, fetchImpl?, timeoutMs?, policy? })`,
  `productiveGatewayTools` and the deeply frozen `productiveToolCatalog` (with `upstream` and
  `broad`). See README, "Embedding".
- Credentials only from the host: the gateway reads no `PRODUCTIVE_*` variable. The token passes key
  admission (printable ASCII, 16 characters or more, no piece shared with our own texts); the
  organization id must be digits.
- Host policy (`enableWrites`, `disabledTools`, `audit`), with no writes, no disabled tools and no
  audit by default. Every call runs in its own call scope; audit records carry the caller as an HMAC
  pseudonym, and the start record is written before anything is sent.
- Narrow tools only: reads of projects, tasks (with comments), people, companies, budgets, services,
  time entries and time reports, and four writes (`create_task`, `update_task`, `add_comment`,
  `track_time`). No delete, action, prepare/commit, per-user auth or financial/admin write is
  reachable through the gateway. Results are fixed projections without salary-derived figures.
- Results are redacted twice per instance (token and organization id) and sink-checked; errors are
  our own text, starting with `Productive API request failed with HTTP <status>`.

### Other changes

- Published to npm and the MCP Registry from tagged releases.
- `ProductiveClient` takes `fromEnvironment: false` (used by the gateway); the MCP server is unchanged.
  A redirect is thrown as `ProductiveRedirectError`.
- The build names its entries, so `dist/stdio.js` and `dist/http.js` stay where they were, next to
  the new `dist/gateway.js`.

## 0.3.0

### Upgrade notes

- The HTTP server refuses to start on a non-loopback bind (`MCP_HTTP_HOST`/`HOST` other than
  127.0.0.1/localhost/::1), or with `MCP_ALLOW_ANY_ORIGIN=true`, unless `MCP_HTTP_TOKEN` is set.
  `MCP_HTTP_ALLOW_UNAUTHENTICATED=true` is an explicit escape hatch for networks restricted by
  other means. `PRODUCTIVE_TRUST_FORWARDED_USER=true` still always requires the token.
- `MCP_HTTP_TOKEN` must be at least 32 printable ASCII characters (e.g. `openssl rand -hex 32`).
  The `Bearer` scheme is now matched case-insensitively.
- `PORT`, `MCP_MAX_BODY_BYTES`, `PRODUCTIVE_TIMEOUT_MS` and the boolean `MCP_*` flags are
  validated; invalid values stop the server at startup instead of becoming NaN.
- New optional variables: `MCP_HTTP_ALLOW_UNAUTHENTICATED`, `MCP_ALLOWED_HOSTS`,
  `MCP_AUTH_FAILURE_LIMIT`, `MCP_AUTH_FAILURE_WINDOW_MS`.
- `/healthz` and `/productive/enroll` are unchanged and remain reachable without the token.

### Changes

- HTTP: 401 responses carry `WWW-Authenticate: Bearer`; invalid JSON gets 400 (JSON-RPC parse
  error) instead of 500; oversized bodies get 413 before the body is read when `Content-Length`
  is too large (also on the enrollment form).
- HTTP: failed authentication on `/mcp` is counted per client address; after the limit further
  failures get 429 with `Retry-After`. Valid tokens are never throttled.
- HTTP: `Host` header check on `/mcp` for loopback binds; graceful shutdown on SIGTERM/SIGINT;
  one log line per rejected request (without query strings).
- Productive client: redirects are never followed, so `X-Auth-Token` is only sent to
  `PRODUCTIVE_BASE_URL`. Error bodies are read up to 64 KB; configured and enrolled tokens are
  redacted by value before error text is truncated.
- The server reports the package version.
- Dependencies updated within their ranges; `fast-uri` and `@hono/node-server` overrides moved to
  the patched lines declared by their dependents. Container images are published only after CI
  passes, with SBOM and provenance attestations; Dependabot configuration added.

## 0.2.0

Per-user authentication.

- `productive_connect`, `productive_status`, `productive_disconnect`, behind
  `PRODUCTIVE_PER_USER_AUTH`. Each person links their own Productive token through a single-use,
  identity-bound browser form, so it never enters the conversation transcript. Tokens are
  encrypted at rest with AES-256-GCM. There is no fallback to a shared token: an un-enrolled
  caller is refused rather than handed borrowed rights.
- A submitted token is verified with `GET /users` against the pinned organization before being
  stored, which proves in one call that it is valid, that it reaches *this* organization, and who
  it belongs to. A token belonging to a different account than the caller is reported loudly and
  connected anyway; `PRODUCTIVE_REQUIRE_EMAIL_MATCH=true` refuses instead.
- The HTTP surface moved into `transports/http-app.ts` with injected dependencies, so the
  enrollment flow is testable without binding a port.

Fixed: `productive_check_connection` reported the token's owner from the first row of
`/organization_memberships`. That collection is not scoped to the pinned organization — it lists
the caller's memberships across every organization they belong to — so the row count was not a
headcount and the owner was right only by accident. It now uses `GET /users`, and additionally
reports every organization the token can reach, with the pinned one marked.

## 0.1.0

First release.

- Twelve MCP tools over the Productive.io API v2, driven by a resource registry generated from
  Productive's published OpenAPI document (132 resources, 2,138 filter fields, 150 named actions).
- Four independent permission tiers — writes, financials, admin, deletes — all off by default.
- Consequential writes are staged and hashed, and committed only when restated unchanged: the
  financial and admin tiers, every delete, every outward-facing operation, and every bulk verb.
- JSON:API responses are flattened, with included records inlined and paging position reported.
- Forwarded caller identity (`X-MCP-User`, opt-in) resolves to a Productive person so time and
  bookings land on the caller rather than the token's owner.
- Behaviour verified against a live organization; the findings that differ from the published spec
  are recorded in the README and encoded in the server.
