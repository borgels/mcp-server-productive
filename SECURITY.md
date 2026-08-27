# Security Policy

## Reporting A Vulnerability

Report suspected vulnerabilities privately to <security@borgels.com>.

Do not include API keys, access tokens, personal data, accounting data, vendor
data, or other secrets in public GitHub issues. Include a concise description,
affected package/version, reproduction steps, and impact where possible.

## Supported Versions

Security fixes are targeted at the latest `main` branch and the latest published
release, when one exists.

## Credential Handling

This MCP server reads provider credentials only from the server environment and
does not accept credentials as tool arguments. If you believe credentials were
exposed, rotate them with the upstream provider immediately.

## Scope And Defaults

Every write is off by default, and the tiers are gated independently: ordinary
project work, financial operations, and administrative operations each need
their own switch, and deletes need a fourth. See the README for what each
covers.

Authentication endpoints, password changes, Productive's own subscription
billing, and the unauthenticated public share links are absent from the resource
registry entirely rather than gated, so a policy change cannot re-expose them.

`X-Organization-Id` is read only from the environment, never from a tool
argument, so no code path can reach another tenant.

## Forwarded Identity

`PRODUCTIVE_TRUST_FORWARDED_USER` makes the server read `X-MCP-User` and act on
whose name it carries. Enable it only behind a gateway that sets that header
from a validated token and strips any client-supplied copy. Without both, an MCP
client can name any identity.
