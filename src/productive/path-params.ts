/**
 * Guard for caller-supplied values that end up as a URL path segment.
 *
 * encodeURIComponent alone leaves `.` and `..` untouched, and some servers and
 * proxies decode `%2f`/`%2e` before routing, so a value is refused outright
 * when it could address anything but the single record it names.
 */
export function assertSafePathSegment(value: unknown, name = 'id'): string {
  if (typeof value !== 'string' && typeof value !== 'number') {
    throw new Error(`Invalid ${name}: expected a string or number.`);
  }
  const text = String(value);
  if (
    text === '' ||
    text === '.' ||
    text === '..' ||
    /[/\\?#]/.test(text) ||
    /%2e|%2f|%5c/i.test(text) ||
    // eslint-disable-next-line no-control-regex
    /[\u0000-\u001f\u007f]/.test(text)
  ) {
    throw new Error(
      `Invalid ${name} "${text}": a path parameter may not be empty, "." or "..", or contain /, \\, ?, # or encoded dots/slashes.`,
    );
  }
  return text;
}

/** assertSafePathSegment, then percent-encode for use in a path. */
export function encodePathSegment(value: unknown, name = 'id'): string {
  return encodeURIComponent(assertSafePathSegment(value, name));
}
