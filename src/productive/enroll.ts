import type { ProductiveClient } from './client.js';
import { CredentialStore, STATE_TTL_MS, type UserCredentials } from './store.js';
import { requireEmailMatch } from './policy.js';
import { tokenOwner } from './resources.js';

/**
 * Enrollment: a person hands this server their own Productive token, without
 * that token ever passing through the conversation.
 *
 * The flow is deliberately the same as the sibling Snipe-IT and Hevy
 * connectors. `productive_connect` mints a single-use, identity-bound link;
 * the person opens it and pastes the token into a form served by this
 * container; the server verifies the token against Productive before storing
 * it, and reports which account it turned out to belong to.
 */

export interface ConnectInstructions {
  status: 'enrollment_required' | 'already_connected';
  enrollUrl?: string;
  expiresInMinutes?: number;
  connectedAs?: Record<string, unknown>;
  instructions: string[];
}

export function connectInstructions(
  store: CredentialStore,
  user: string,
  publicBaseUrl: string | undefined,
  options: { force?: boolean } = {},
): ConnectInstructions {
  const existing = store.get(user);
  if (existing && !options.force) {
    return {
      status: 'already_connected',
      connectedAs: describeCredentials(existing),
      instructions: [
        'This caller already has a Productive token stored. Pass force=true to replace it, or use productive_disconnect to remove it.',
      ],
    };
  }

  const state = store.createState(user);
  const base = (publicBaseUrl ?? process.env.PRODUCTIVE_PUBLIC_BASE_URL ?? '').replace(/\/+$/, '');
  const path = `/productive/enroll?state=${encodeURIComponent(state)}`;

  return {
    status: 'enrollment_required',
    enrollUrl: base ? `${base}${path}` : path,
    expiresInMinutes: Math.round(STATE_TTL_MS / 60_000),
    instructions: [
      base
        ? `Open this link in a browser: ${base}${path}`
        : `Open ${path} on this server in a browser (PRODUCTIVE_PUBLIC_BASE_URL is unset, so only the path can be given).`,
      'In Productive, go to Settings → API integrations and create a token. It carries your own permissions.',
      'Paste it into the form. The link is single-use and expires in 10 minutes.',
      'Do not paste the token into this conversation: a Productive token is equivalent to your whole account and would stay in the transcript.',
    ],
  };
}

export function statusFor(store: CredentialStore, user: string): Record<string, unknown> {
  const credentials = store.get(user);
  if (!credentials) {
    return {
      connected: false,
      caller: user,
      next: 'Call productive_connect to get an enrollment link.',
    };
  }
  return { connected: true, caller: user, ...describeCredentials(credentials) };
}

export function disconnect(store: CredentialStore, user: string): Record<string, unknown> {
  const removed = store.delete(user);
  return {
    disconnected: removed,
    caller: user,
    note: removed
      ? 'The stored token was deleted from this server. It is still valid in Productive — revoke it there under Settings → API integrations if that is what you intended.'
      : 'Nothing was stored for this caller.',
  };
}

export interface EnrollResult {
  ok: boolean
  message: string;
  owner?: Record<string, unknown>;
  emailMismatch?: { gatewayIdentity: string; productiveEmail: string };
}

/**
 * Verify a pasted token and store it.
 *
 * Verification calls `GET /users` with the candidate token and the pinned
 * organization id. That single call proves three things at once: the token is
 * valid, it can reach *this* organization, and who it belongs to. Storing an
 * unverified token would mean the failure surfaced later, on an unrelated tool
 * call, as a confusing 401.
 */
export async function verifyAndStore(
  baseClient: ProductiveClient,
  store: CredentialStore,
  user: string,
  apiToken: string,
): Promise<EnrollResult> {
  const token = apiToken.trim();
  if (!token) {
    return { ok: false, message: 'No token was submitted.' };
  }

  let owner: Record<string, unknown> | undefined;
  try {
    owner = await tokenOwner(baseClient.withToken(token));
  } catch (error) {
    return {
      ok: false,
      message: `Productive rejected that token: ${
        error instanceof Error ? error.message : String(error)
      }`,
    };
  }

  if (!owner) {
    return {
      ok: false,
      message:
        'The token was accepted but Productive returned no user for it, so the account could not be identified. Nothing was stored.',
    };
  }

  const productiveEmail = typeof owner.email === 'string' ? owner.email : undefined;
  const mismatch =
    productiveEmail && productiveEmail.toLowerCase() !== user.toLowerCase()
      ? { gatewayIdentity: user, productiveEmail }
      : undefined;

  if (mismatch && requireEmailMatch()) {
    return {
      ok: false,
      message:
        `That token belongs to ${productiveEmail}, but you are signed in as ${user}. ` +
        'This server is configured to refuse a mismatch (PRODUCTIVE_REQUIRE_EMAIL_MATCH). Nothing was stored.',
      emailMismatch: mismatch,
    };
  }

  const credentials: UserCredentials = {
    apiToken: token,
    connectedAt: Date.now(),
    productiveUserId: typeof owner.userId === 'string' ? owner.userId : undefined,
    productiveEmail,
    productiveName: typeof owner.name === 'string' ? owner.name : undefined,
  };
  store.set(user, credentials);

  return {
    ok: true,
    message: mismatch
      ? `Connected — but note the token belongs to ${productiveEmail}, not ${user}. Everything you do will be recorded in Productive as ${productiveEmail}.`
      : `Connected as ${owner.name ?? productiveEmail ?? 'your Productive account'}.`,
    owner,
    emailMismatch: mismatch,
  };
}

function describeCredentials(credentials: UserCredentials): Record<string, unknown> {
  return {
    productiveUserId: credentials.productiveUserId,
    productiveEmail: credentials.productiveEmail,
    productiveName: credentials.productiveName,
    connectedAt: new Date(credentials.connectedAt).toISOString(),
  };
}
