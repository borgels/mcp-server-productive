# Changelog

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
