import type { ProductiveClient } from './client.js';
import { flattenCollection, type FlatRecord } from './jsonapi.js';

/**
 * Who is asking.
 *
 * Productive attributes work to people: a time entry belongs to a `person_id`,
 * a booking to a person, an activity to whoever's token made the change. This
 * server holds one organization-wide token, so every change Productive records
 * is credited to that token's owner no matter who asked — the same attribution
 * problem a shared token creates anywhere.
 *
 * It cannot be fixed from here without per-user tokens, but it can be narrowed.
 * When a gateway in front of this server has authenticated the caller and
 * forwards their address, that address is resolved to a Productive person, and
 * anything person-shaped defaults to *them* rather than to the token owner. So
 * "log two hours on this task" books against the right person even though the
 * change is signed by the service account.
 *
 * The header is read only when PRODUCTIVE_TRUST_FORWARDED_USER is set, because
 * an MCP client can send any header it likes. Behind a gateway that sets the
 * value from a validated token *and strips a client-supplied copy*, it is
 * trustworthy; anywhere else it is an invitation to act as somebody else.
 */

export interface CallerIdentity {
  /** Address as the gateway reported it. */
  email: string;
  /** Productive person id, once resolved. */
  personId?: string;
  name?: string;
  resolved: boolean;
  note?: string;
}

export function trustForwardedUser(): boolean {
  return process.env.PRODUCTIVE_TRUST_FORWARDED_USER === 'true';
}

/** The caller's address, or undefined when not forwarded or not trusted. */
export function forwardedUser(headerValue: string | undefined): string | undefined {
  if (!trustForwardedUser()) return undefined;
  const value = headerValue?.trim();
  return value ? value.toLowerCase() : undefined;
}

/**
 * Resolve an address to a Productive person.
 *
 * Cached for the process lifetime: the mapping changes when somebody joins or
 * leaves, and a lookup on every tool call would spend a request from a rate
 * limit Productive does not document.
 */
const cache = new Map<string, CallerIdentity>();

export async function resolveIdentity(
  client: ProductiveClient,
  email: string | undefined,
): Promise<CallerIdentity | undefined> {
  if (!email) return undefined;
  const cached = cache.get(email);
  if (cached) return cached;

  let identity: CallerIdentity;
  try {
    const response = await client.request({
      path: '/people',
      filters: { email: { eq: email } },
      page: { size: 2 },
    });
    const matches = flattenCollection(response).records;
    identity = buildIdentity(email, matches);
  } catch (error) {
    // A failed lookup must not break an otherwise valid read. The caller is
    // reported unresolved, and person-shaped writes then insist on an explicit
    // person_id rather than guessing.
    identity = {
      email,
      resolved: false,
      note: `Could not look this caller up in Productive: ${
        error instanceof Error ? error.message : String(error)
      }`,
    };
  }

  cache.set(email, identity);
  return identity;
}

function buildIdentity(email: string, matches: FlatRecord[]): CallerIdentity {
  if (matches.length === 0) {
    return {
      email,
      resolved: false,
      note: `No Productive person has the email ${email}. Person-specific writes need an explicit person_id.`,
    };
  }
  if (matches.length > 1) {
    // Productive allows the same address on more than one person record (an
    // archived one and a current one, typically). Guessing would book time
    // against the wrong record, which is worse than asking.
    return {
      email,
      resolved: false,
      note: `More than one Productive person has the email ${email}, so the caller is ambiguous. Pass person_id explicitly.`,
    };
  }

  const person = matches[0] as FlatRecord;
  const name = [person.first_name, person.last_name]
    .filter((part): part is string => typeof part === 'string' && part.length > 0)
    .join(' ');
  return { email, personId: person.id, name: name || undefined, resolved: true };
}

/** Clear the resolution cache (used by tests). */
export function resetIdentityCache(): void {
  cache.clear();
}
