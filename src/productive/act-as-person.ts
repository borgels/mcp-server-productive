import { ActAsRefusedError } from '../act-as.js';
import { MAX_PAGE_SIZE, type ProductiveClient, type ProductiveResponse } from './client.js';
import { flattenCollection } from './jsonapi.js';
import { currentActAs } from './scope.js';

/**
 * How many people a lookup asks for. A page that comes back full may have left out a second person with the same
 * email (Productive allows an address on more than one person record), so a full page is refused: uniqueness is only
 * accepted when the whole result was read.
 */
export const LOOKUP_LIMIT = MAX_PAGE_SIZE;

/**
 * The Productive person a change is made for (gateway only). Without a person from the host (actAs), undefined: the
 * call runs as before. With one: the id of exactly one active team member (person_type 1, status 1) whose email is
 * that address, compared case-insensitively, in a result Productive gave whole (one page, fewer than LOOKUP_LIMIT
 * people). None, more than one, or a result that may have been cut short is ActAsRefusedError('no_user'); Productive
 * refusing the lookup (403: the token may not see people) is ActAsRefusedError('not_permitted'). Nothing is sent after
 * a refusal, and a change is never made for the token's owner instead.
 *
 * Read as the token's owner, never through the server's X-MCP-User resolution or its cache. The email goes to
 * Productive only as the filter; it is not kept, audited or returned.
 */
export async function personForChange(client: ProductiveClient): Promise<string | undefined> {
  const person = currentActAs();
  if (!person) return undefined;
  let response: unknown;
  try {
    response = await client.request({
      path: '/people',
      filters: { email: person.email, person_type: 1 },
      page: { number: 1, size: LOOKUP_LIMIT },
    });
  } catch (error) {
    if (error instanceof Error && error.name === 'ProductiveHttpError' && (error as { status?: unknown }).status === 403) {
      throw new ActAsRefusedError('not_permitted');
    }
    throw error;
  }
  if (!response || typeof response !== 'object' || !Array.isArray((response as { data?: unknown }).data)) {
    throw new ActAsRefusedError('no_user');
  }
  const collection = flattenCollection(response as ProductiveResponse);
  const whole =
    collection.records.length < LOOKUP_LIMIT &&
    (collection.total === undefined || collection.total <= collection.records.length) &&
    collection.nextPage === undefined;
  if (!whole) throw new ActAsRefusedError('no_user');
  const ids = collection.records
    .filter(record => typeof record.email === 'string' && record.email.trim().toLowerCase() === person.email)
    .filter(record => record.status === 1 || (record.status === undefined && !record.deactivated_at && !record.archived_at))
    .map(record => record.id)
    .filter((id): id is string => typeof id === 'string' && /^[1-9][0-9]{0,18}$/.test(id));
  if (ids.length !== 1) throw new ActAsRefusedError('no_user');
  return ids[0];
}
