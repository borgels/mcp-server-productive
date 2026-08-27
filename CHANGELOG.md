# Changelog

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
