import type { IncomingMessage } from 'node:http';
import { describe, expect, it } from 'vitest';
import {
  assertAuthorized,
  assertSafeHttpStartup,
  tokenMatches,
  type HttpConfig,
} from '../src/transports/http-helpers.js';

const config = (httpToken?: string): HttpConfig => ({
  host: '127.0.0.1',
  port: 0,
  maxBodyBytes: 1024,
  httpToken,
});

const request = (authorization?: string) =>
  ({ headers: authorization === undefined ? {} : { authorization } }) as IncomingMessage;

describe('MCP_HTTP_TOKEN check', () => {
  it('accepts only the exact bearer token', () => {
    expect(() => assertAuthorized(request('Bearer s3cret'), config('s3cret'))).not.toThrow();
    for (const header of [undefined, '', 'Bearer s3cre', 'Bearer s3cret ', 'bearer s3cret', 's3cret']) {
      expect(() => assertAuthorized(request(header), config('s3cret'))).toThrow(/Unauthorized/);
    }
  });

  it('compares in constant time over digests of both sides', () => {
    expect(tokenMatches('abc', 'abc')).toBe(true);
    expect(tokenMatches('abc', 'abcd')).toBe(false);
    expect(tokenMatches(undefined, '')).toBe(false);
  });
});

describe('HTTP startup', () => {
  it('refuses a trusted forwarded user without MCP_HTTP_TOKEN', () => {
    expect(() =>
      assertSafeHttpStartup(config(undefined), { PRODUCTIVE_TRUST_FORWARDED_USER: 'true' }),
    ).toThrow(/requires MCP_HTTP_TOKEN/);
  });

  it('starts when the token is set, or when the header is not trusted', () => {
    expect(() =>
      assertSafeHttpStartup(config('t'), { PRODUCTIVE_TRUST_FORWARDED_USER: 'true' }),
    ).not.toThrow();
    expect(() => assertSafeHttpStartup(config(undefined), {})).not.toThrow();
  });
});
