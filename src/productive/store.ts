import { createCipheriv, createDecipheriv, createHash, randomBytes } from 'node:crypto';
import { existsSync, mkdirSync, readFileSync, renameSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';

/**
 * Per-user encrypted Productive API-token store, plus one-time enrollment state.
 *
 * Productive issues long-lived tokens, created by each person under Settings →
 * API integrations. Because the token is long-lived rather than a one-shot code,
 * it is deliberately NOT accepted as a tool argument: it would then sit in the
 * conversation transcript forever, and a Productive token is bearer-equivalent
 * to that person's whole account — and, as this server measured, commonly
 * reaches several organizations. Instead the person pastes it into a
 * short-lived, state-bound browser form served by this container.
 *
 * Tokens are encrypted at rest with AES-256-GCM, one row per gateway-verified
 * identity, so a caller can only ever reach their own row.
 *
 * This is the same shape as the sibling Snipe-IT and Hevy connectors, on
 * purpose: one enrollment flow for people to learn, not three.
 */

export interface UserCredentials {
  apiToken: string;
  connectedAt: number;
  /** Productive user id the token resolved to at enrollment. */
  productiveUserId?: string;
  /** Email on that Productive user — not necessarily the gateway identity. */
  productiveEmail?: string;
  productiveName?: string;
}

interface EnrollState {
  user: string;
  createdAt: number;
}

interface Encrypted {
  iv: string;
  tag: string;
  data: string;
}

export const STATE_TTL_MS = 10 * 60 * 1000;

export class CredentialStore {
  private readonly path: string;
  private readonly key: Buffer;
  private credentials: Record<string, Encrypted> = {};
  private states: Record<string, EnrollState> = {};

  constructor(options: { path?: string; encryptionKey?: string } = {}) {
    this.path = options.path ?? process.env.PRODUCTIVE_STORE_PATH ?? '/data/store.json';
    const secret = options.encryptionKey ?? process.env.PRODUCTIVE_ENCRYPTION_KEY;
    if (!secret || secret.length < 16) {
      throw new Error(
        'Missing or weak PRODUCTIVE_ENCRYPTION_KEY (minimum 16 characters) — required to encrypt per-user API tokens at rest.',
      );
    }
    this.key = createHash('sha256').update(secret).digest();
    this.load();
  }

  private load(): void {
    if (!existsSync(this.path)) return;
    try {
      const raw = JSON.parse(readFileSync(this.path, 'utf8')) as {
        credentials?: Record<string, Encrypted>;
        states?: Record<string, EnrollState>;
      };
      this.credentials = raw.credentials ?? {};
      this.states = raw.states ?? {};
    } catch {
      // A corrupt store must not stop the server from starting; everyone
      // re-enrolls, which is recoverable, whereas a crash loop is not.
      this.credentials = {};
      this.states = {};
    }
  }

  private persist(): void {
    mkdirSync(dirname(this.path), { recursive: true });
    const tmp = join(dirname(this.path), `.store.${randomBytes(6).toString('hex')}.tmp`);
    writeFileSync(tmp, JSON.stringify({ credentials: this.credentials, states: this.states }), {
      mode: 0o600,
    });
    renameSync(tmp, this.path); // atomic replace
  }

  private encrypt(value: UserCredentials): Encrypted {
    const iv = randomBytes(12);
    const cipher = createCipheriv('aes-256-gcm', this.key, iv);
    const data = Buffer.concat([cipher.update(JSON.stringify(value), 'utf8'), cipher.final()]);
    return {
      iv: iv.toString('base64'),
      tag: cipher.getAuthTag().toString('base64'),
      data: data.toString('base64'),
    };
  }

  private decrypt(encrypted: Encrypted): UserCredentials {
    const decipher = createDecipheriv('aes-256-gcm', this.key, Buffer.from(encrypted.iv, 'base64'));
    decipher.setAuthTag(Buffer.from(encrypted.tag, 'base64'));
    const out = Buffer.concat([
      decipher.update(Buffer.from(encrypted.data, 'base64')),
      decipher.final(),
    ]);
    return JSON.parse(out.toString('utf8')) as UserCredentials;
  }

  /** Normalise the verified identity (lowercased email or oid). */
  static userKey(identity: string): string {
    return identity.trim().toLowerCase();
  }

  get(user: string): UserCredentials | undefined {
    const encrypted = this.credentials[CredentialStore.userKey(user)];
    return encrypted ? this.decrypt(encrypted) : undefined;
  }

  set(user: string, credentials: UserCredentials): void {
    this.credentials[CredentialStore.userKey(user)] = this.encrypt(credentials);
    this.persist();
  }

  delete(user: string): boolean {
    const key = CredentialStore.userKey(user);
    if (!this.credentials[key]) return false;
    delete this.credentials[key];
    this.persist();
    return true;
  }

  // --- one-time enrollment state (binds the browser form to one identity) ---

  createState(user: string): string {
    this.gcStates();
    const state = randomBytes(24).toString('base64url');
    this.states[state] = { user: CredentialStore.userKey(user), createdAt: Date.now() };
    this.persist();
    return state;
  }

  /** Look up without consuming — used to render the form before submission. */
  peekState(state: string): string | undefined {
    this.gcStates();
    const entry = this.states[state];
    if (!entry || Date.now() - entry.createdAt > STATE_TTL_MS) return undefined;
    return entry.user;
  }

  consumeState(state: string): string | undefined {
    const user = this.peekState(state);
    if (user !== undefined) {
      delete this.states[state];
      this.persist();
    }
    return user;
  }

  private gcStates(): void {
    const now = Date.now();
    let changed = false;
    for (const [state, entry] of Object.entries(this.states)) {
      if (now - entry.createdAt > STATE_TTL_MS) {
        delete this.states[state];
        changed = true;
      }
    }
    if (changed) this.persist();
  }
}
