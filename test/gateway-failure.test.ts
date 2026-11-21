// Failure metadata on gateway error results: Productive's HTTP status and its request id (a UUID or hex id only),
// for a host that counts failures without reading their text. Never the body, Productive's code or message.
import { describe, expect, it } from 'vitest';
import { failureMetadata, ProductiveHttpError, requestIdFrom, vendorRequestId } from '../src/errors.js';
import { createProductiveGateway } from '../src/gateway.js';
import { BASE, fakeProductive, jsonApi, ORG_A, TOKEN_A } from './gateway-helpers.js';

const UUID = '3f2b8c1e-9a4d-4e6f-8b7a-1c2d3e4f5a6b';
const BODY = { errors: [{ status: '404', code: 'E_NOPE', detail: 'Customer Jane Doe not found', title: 'Leak me' }] };

function gatewayAnswering(status: number, headers: Record<string, string>, body: unknown = BODY, apiToken = TOKEN_A) {
  const fake = fakeProductive(() => jsonApi(body, status, headers));
  return createProductiveGateway({ apiToken, organizationId: ORG_A, baseUrl: BASE, fetchImpl: fake.fetchImpl });
}

describe('vendorRequestId', () => {
  it('keeps a UUID and a hex id', () => {
    expect(vendorRequestId(UUID)).toBe(UUID);
    expect(vendorRequestId(` ${UUID} `)).toBe(UUID);
    expect(vendorRequestId('a1b2c3d4e5f60718')).toBe('a1b2c3d4e5f60718');
    expect(vendorRequestId('ABCDEF12-3456')).toBe('ABCDEF12-3456');
    expect(vendorRequestId('f'.repeat(64))).toBe('f'.repeat(64));
  });

  it('drops anything that could be text, and the shape of a personal number', () => {
    for (const value of [
      undefined,
      null,
      '',
      'abc123',
      'Jane Doe',
      'jane@example.com',
      'req_8f3a9c2d1e',
      'req-abc-123',
      'deadbeef deadbeef',
      '0101901234',
      'ab-010190-1234-cd',
      'f'.repeat(65),
      '-abcdef12',
      'abcdef12-',
      'a-------',
      'abc--def',
      'abcd--ef12',
      'abcdef12-ab',
      'abcdef1',
      'abcdef12-'.repeat(8),
    ]) {
      expect(vendorRequestId(value)).toBeUndefined();
    }
  });

  it('reads the first header that has an id in the right form', () => {
    expect(requestIdFrom(new Headers({ 'x-request-id': 'not an id', 'request-id': UUID }))).toBe(UUID);
    expect(requestIdFrom(new Headers({ 'x-correlation-id': 'deadbeefcafe' }))).toBe('deadbeefcafe');
    expect(requestIdFrom(new Headers({ 'x-vendor-id': UUID }))).toBeUndefined();
    expect(requestIdFrom(new Headers({ 'x-vendor-id': UUID }), ['x-vendor-id'])).toBe(UUID);
  });

  it('gives metadata for an HTTP error only', () => {
    const http = (failureRequestId?: string) =>
      new ProductiveHttpError({ status: 404, method: 'GET', url: `${BASE}/projects/1`, failureRequestId });
    expect(failureMetadata(http(UUID))).toEqual({ httpStatus: 404, requestId: UUID });
    expect(failureMetadata(http('Jane Doe'))).toEqual({ httpStatus: 404 });
    expect(failureMetadata(new Error('boom'))).toBeUndefined();
    expect(failureMetadata('boom')).toBeUndefined();
  });
});

describe('gateway error results', () => {
  it('carry the HTTP status and the request id, never the body', async () => {
    const result = await gatewayAnswering(404, { 'x-request-id': UUID }).callTool('get_project', { projectId: '701' });
    expect(result.isError).toBe(true);
    expect(result.failure).toEqual({ httpStatus: 404, requestId: UUID });
    const serialised = JSON.stringify(result);
    expect(serialised).not.toContain('Jane Doe');
    expect(serialised).not.toContain('E_NOPE');
    expect(serialised).not.toContain('Leak me');
  });

  it('carry the status alone when the request id is not in the form of one', async () => {
    const result = await gatewayAnswering(422, { 'x-request-id': 'Jane Doe <jane@example.com>' }).callTool('get_project', {
      projectId: '701',
    });
    expect(result.failure).toEqual({ httpStatus: 422 });
    expect(JSON.stringify(result)).not.toContain('jane@example.com');
  });

  it('drop a request id that holds a piece of the token', async () => {
    // The token's own hex-looking piece as the id: redaction changes it, and the changed value is no id.
    const result = await gatewayAnswering(500, { 'x-request-id': 'deadbeef00112233' }, {}, 'deadbeef00112233-tok-0').callTool(
      'get_project',
      { projectId: '701' },
    );
    expect(result.isError).toBe(true);
    expect(result.failure).toEqual({ httpStatus: 500 });
    expect(JSON.stringify(result)).not.toContain('deadbeef0011');
  });

  it('have no metadata when the cause is not Productive answering with an HTTP error', async () => {
    const gw = gatewayAnswering(200, {});
    expect((await gw.callTool('get_project', {})).failure).toBeUndefined();
    expect((await gw.callTool('no_such_tool', {})).failure).toBeUndefined();
    const offline = createProductiveGateway({
      apiToken: TOKEN_A,
      organizationId: ORG_A,
      baseUrl: BASE,
      fetchImpl: (async () => {
        throw new TypeError('fetch failed');
      }) as typeof fetch,
    });
    const result = await offline.callTool('get_project', { projectId: '701' });
    expect(result.isError).toBe(true);
    expect(result.failure).toBeUndefined();
  });

  it('are absent on a successful result', async () => {
    const result = await gatewayAnswering(200, { 'x-request-id': UUID }, { data: { id: '701', type: 'projects', attributes: {} } }).callTool(
      'get_project',
      { projectId: '701' },
    );
    expect(result.isError).toBeUndefined();
    expect(result.failure).toBeUndefined();
  });
});
