/**
 * Secrets of one gateway instance, and the redaction every gateway output
 * passes through.
 *
 * Each gateway instance owns one SecretRedactor, so a host that runs several
 * tenants in one process never mixes their secrets. It knows two values:
 *
 * - the API token: the credential. Its exact value (raw, URL-encoded and
 *   JSON-escaped) and every piece of FRAGMENT_LENGTH characters of it are
 *   redacted wherever they appear, and the sink check (src/key-admission.ts)
 *   withholds any output that still holds a piece of it.
 * - the organization id: not a credential (it is in every Productive URL a
 *   person opens), but the tenant boundary, so it is not repeated either. It
 *   is a short number, and pieces of it would match ordinary ids and dates,
 *   so it is redacted only as a whole number in text: not next to a digit,
 *   and not inside a date, time or decimal (`2026-11-20`, `12:30`, `1.5`).
 */

/** Configured secrets shorter than this are not redacted by value (too likely to hit normal text). */
export const MIN_SECRET_LENGTH = 8;
/** Any piece of a secret this long or longer is redacted, wherever it appears. */
export const FRAGMENT_LENGTH = 6;
/**
 * What a redacted value is replaced by. Its brackets are not ASCII, so it cannot be a piece of a key, which is
 * printable ASCII.
 */
export const REDACTION_MARKER = '‹redacted›';
/** What a value nested too deep is replaced by. */
export const TOO_DEEP = '[nested too deep]';
/** Values nested deeper than this are replaced, never passed on. */
export const MAX_REDACT_DEPTH = 64;

export class SecretRedactor {
  private readonly secrets = new Set<string>();
  private readonly fragments = new Set<string>();
  private readonly numbers: RegExp[] = [];

  /** Redact this value and every piece of it. Values shorter than MIN_SECRET_LENGTH are ignored. */
  addSecret(value: string | undefined): this {
    if (!value || value.length < MIN_SECRET_LENGTH) {
      return this;
    }
    let encoded = value;
    try {
      encoded = encodeURIComponent(value);
    } catch {
      // A lone surrogate has no URL-encoded form; the other forms are still added.
    }
    for (const form of new Set([value, encoded, JSON.stringify(value).slice(1, -1)])) {
      this.secrets.add(form);
      for (let i = 0; i + FRAGMENT_LENGTH <= form.length; i += 1) {
        this.fragments.add(form.slice(i, i + FRAGMENT_LENGTH));
      }
    }
    return this;
  }

  /** Redact this number (digits only) wherever it stands alone in text; see the module comment. */
  addWholeNumber(value: string | undefined): this {
    if (!value || !/^\d+$/.test(value)) {
      return this;
    }
    this.numbers.push(new RegExp(`(?<![0-9]|[0-9][.,:-])${value}(?![0-9]|[.,:-][0-9])`, 'g'));
    return this;
  }

  /** Whether the text contains the token in any form, or any FRAGMENT_LENGTH-character piece of it. */
  matches(text: string): boolean {
    for (const secret of this.secrets) {
      if (text.includes(secret)) return true;
    }
    if (this.fragments.size === 0) return false;
    for (let i = 0; i + FRAGMENT_LENGTH <= text.length; i += 1) {
      if (this.fragments.has(text.slice(i, i + FRAGMENT_LENGTH))) return true;
    }
    return false;
  }

  /** The token, every run of text covered by a piece of it, and the organization id replaced with ‹redacted›. */
  redact(value: string): string {
    let result = value;
    for (const secret of this.secrets) {
      result = result.split(secret).join(REDACTION_MARKER);
    }
    result = this.redactFragments(result);
    for (const number of this.numbers) {
      result = result.replace(number, REDACTION_MARKER);
    }
    return result;
  }

  private redactFragments(text: string): string {
    if (this.fragments.size === 0 || text.length < FRAGMENT_LENGTH) {
      return text;
    }
    let covered: Uint8Array | undefined;
    for (let i = 0; i + FRAGMENT_LENGTH <= text.length; i += 1) {
      if (this.fragments.has(text.slice(i, i + FRAGMENT_LENGTH))) {
        covered ??= new Uint8Array(text.length);
        covered.fill(1, i, i + FRAGMENT_LENGTH);
      }
    }
    if (!covered) {
      return text;
    }
    let out = '';
    let i = 0;
    while (i < text.length) {
      if (covered[i]) {
        out += REDACTION_MARKER;
        while (i < text.length && covered[i]) i += 1;
      } else {
        out += text[i];
        i += 1;
      }
    }
    return out;
  }
}

const SECRET_PATTERNS = [
  /\b(bearer|basic)\s+[^\s"',}]*‹redacted›[^\s"',}]*/gi,
  /Authorization:\s*(Bearer|Basic)\s+[^,\s}]+/gi,
  // A credential-named assignment in text: `X-Auth-Token: S`, `api_key=S`, `"accessToken": "S"`.
  /(PRODUCTIVE_API_TOKEN|(?:x[-_]?)?auth[-_]?token|(?:x[-_]?)?api[-_]?(?:key|token|secret)|client[-_]?secret|(?:access|refresh|id|session|bearer)[-_]?token|accessToken|apiKey|token|password|passwd|secret)["']?\s*[:=]\s*["']?[^"',\s}&]+/gi,
  /\b(Bearer|Basic)\s+(?:[A-Za-z0-9._~+/-]|‹redacted›)+=*/g,
  /\b(bearer|basic)\s+(?:[A-Za-z0-9._~+/-]|‹redacted›){8,}=*/gi,
  // A JSON Web Token anywhere: three base64url segments, the first a JSON header ("eyJ").
  /\beyJ(?:[A-Za-z0-9_-]|‹redacted›)*\.(?:[A-Za-z0-9_-]|‹redacted›)+\.(?:[A-Za-z0-9_-]|‹redacted›)*/g,
];

/**
 * Credential-shaped text replaced by a marker: an Authorization header, a
 * Bearer or Basic value, a JSON Web Token and `token=`/`X-Auth-Token:`-style
 * assignments. Applied to every text a gateway returns, so a credential
 * Productive echoes that is not the instance's own token never leaves it.
 */
export function redactCredentialPatterns(value: string): string {
  return SECRET_PATTERNS.reduce(
    (current, pattern) =>
      current.replace(pattern, match => {
        if (/^eyJ/.test(match)) return REDACTION_MARKER;
        if (/^(Bearer|Basic)\s/i.test(match)) return `${match.split(/\s+/)[0] ?? 'Authorization'} ${REDACTION_MARKER}`;
        if (/^Authorization:/i.test(match)) return `Authorization: ${REDACTION_MARKER}`;
        // The first separator ends the name: everything after it is the value, which may itself hold `:` or `=`.
        const [, key = 'secret', separator = ':'] = /^(.*?)\s*([:=])/.exec(match) ?? [];
        return `${key.trim()}${separator} ${REDACTION_MARKER}`;
      }),
    value,
  );
}

/**
 * One text as a gateway may return it: credential-shaped text masked, then the instance's secrets, then the
 * patterns again (they take the marker as part of a value), until nothing changes.
 */
export function redactText(value: string, redactor: SecretRedactor): string {
  let result = redactCredentialPatterns(value);
  for (let round = 0; round < 4; round += 1) {
    const next = redactCredentialPatterns(redactor.redact(result));
    if (next === result) break;
    result = next;
  }
  return result;
}

/** Field names whose value is a credential whatever it looks like: replaced whole. */
const CREDENTIAL_NAME =
  /^x?(authorization|proxyauthorization|cookie|setcookie|(access|refresh|id|session|bearer|auth|api|private|secret|subscription|ical)(token|key)|token|apisecret|clientsecret|secret|password|passwd|credentials?)$/;

/** Whether a field name names a credential, however it is written (`accessToken`, `X-Auth-Token`, `ical_token`). */
export function isCredentialField(name: string): boolean {
  return CREDENTIAL_NAME.test(name.toLowerCase().replace(/[-_\s.]/g, ''));
}

/**
 * A copy of a JSON value with every string, object keys included, passed
 * through redactText, the value of every credential-named field replaced
 * whole, and every number or boolean whose string form holds a piece of the
 * token replaced by the string "‹redacted›". Anything nested deeper than
 * MAX_REDACT_DEPTH is replaced, never passed on.
 */
export function redactDeep(value: unknown, redactor: SecretRedactor, depth = 0): unknown {
  if (depth > MAX_REDACT_DEPTH) {
    return TOO_DEEP;
  }
  if (typeof value === 'string') {
    return redactText(value, redactor);
  }
  if (typeof value === 'number' || typeof value === 'boolean' || typeof value === 'bigint') {
    // The string form is checked against the token only: a count or a number of minutes that happens to equal the
    // organization id is data, not the id.
    const text = String(value);
    if (redactor.matches(text) || redactCredentialPatterns(text) !== text) return REDACTION_MARKER;
    return typeof value === 'bigint' ? text : value;
  }
  if (typeof value !== 'object' || value === null) {
    return value;
  }
  const json = (value as { toJSON?: unknown }).toJSON;
  if (typeof json === 'function') {
    return redactDeep(json.call(value), redactor, depth + 1);
  }
  if (Array.isArray(value)) {
    return value.map(entry => redactDeep(entry, redactor, depth + 1));
  }
  return Object.fromEntries(
    Object.entries(value).map(([key, entry]) => [
      redactText(key, redactor),
      isCredentialField(key) && entry !== null && entry !== undefined
        ? REDACTION_MARKER
        : redactDeep(entry, redactor, depth + 1),
    ]),
  );
}
