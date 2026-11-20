// The sink check (src/key-admission.ts): nothing that leaves a gateway instance holds a piece of its API token, and
// the organization id is not repeated in text, whatever Productive answers.
import { afterEach, describe, expect, it } from 'vitest';
import { fixedOutputs, RESULT_WITHHELD } from '../src/fallbacks.js';
import { createProductiveGateway, type GatewayJsonObject } from '../src/gateway.js';
import { admitsKey, visibleTexts } from '../src/key-admission.js';
import { BASE, defaultAnswer, fakeProductive, ORG_A, pieces, sink, TOKEN_A, type RecordedRequest } from './gateway-helpers.js';

afterEach(() => {
  delete process.env.PRODUCTIVE_AUDIT_LOG;
});

function leaked(secret: string, outputs: unknown[]): string[] {
  const texts = outputs.flatMap(output => (typeof output === 'string' ? [output] : visibleTexts(output)));
  return pieces(secret).filter(piece => texts.some(text => text.includes(piece)));
}

/** A gateway whose Productive answers every project read with `project` as the record's attributes. */
function echoing(attributes: unknown, policy: Parameters<typeof createProductiveGateway>[0]['policy'] = {}) {
  const fake = fakeProductive((request: RecordedRequest) =>
    request.path === '/projects/701' ? { data: { id: '701', type: 'projects', attributes } } : defaultAnswer(request),
  );
  return createProductiveGateway({ apiToken: TOKEN_A, organizationId: ORG_A, baseUrl: BASE, fetchImpl: fake.fetchImpl, policy });
}

describe('the sink check', () => {
  it('admits the test token, and no fixed fallback holds a piece of it', () => {
    expect(admitsKey(TOKEN_A)).toBe(true);
    expect(leaked(TOKEN_A, fixedOutputs())).toEqual([]);
  });

  it('masks the token Productive echoes in any form, in structuredContent and in the text block', async () => {
    const variants = [
      TOKEN_A,
      `before ${TOKEN_A.slice(2, 12)} after`,
      encodeURIComponent(`${TOKEN_A}/`),
      JSON.stringify({ nested: TOKEN_A }),
      `X-Auth-Token: ${TOKEN_A}`,
      `Bearer ${TOKEN_A.slice(0, 10)}`,
    ];
    for (const name of variants) {
      const result = await echoing({ name, project_number: name }).callTool('get_project', { projectId: '701' });
      expect(result.isError, name).toBeUndefined();
      expect(leaked(TOKEN_A, [result]), name).toEqual([]);
    }
  });

  it('withholds a whole result that still holds a piece, and never passes on what it cannot check', async () => {
    // Productive answers a list read with the token as an object key: the projection drops unknown keys, but a
    // projected field may still hold it.
    const fake = fakeProductive(request =>
      request.path === '/companies'
        ? { data: [{ id: TOKEN_A, type: 'companies', attributes: { name: 'x' } }], meta: {} }
        : defaultAnswer(request),
    );
    const gateway = createProductiveGateway({ apiToken: TOKEN_A, organizationId: ORG_A, baseUrl: BASE, fetchImpl: fake.fetchImpl });
    const result = await gateway.callTool('list_companies', {});
    expect(leaked(TOKEN_A, [result])).toEqual([]);
    expect(JSON.stringify(result)).toContain('‹redacted›');
  });

  it('refuses an answer that is not a JSON:API document instead of passing it on as empty', async () => {
    const fake = fakeProductive(() => new Response(`<html>${TOKEN_A}</html>`, { status: 200 }));
    const gateway = createProductiveGateway({ apiToken: TOKEN_A, organizationId: ORG_A, baseUrl: BASE, fetchImpl: fake.fetchImpl });
    for (const [name, input] of [
      ['list_tasks', {}],
      ['get_project', { projectId: '701' }],
    ] as const) {
      const result = await gateway.callTool(name, input as GatewayJsonObject);
      expect(result).toEqual({ isError: true, content: [{ type: 'text', text: 'Productive sent an answer this server cannot read.' }] });
    }
  });

  it('keeps the token and the host text out of every audit record, through a failing call too', async () => {
    const audit = sink();
    process.env.PRODUCTIVE_AUDIT_LOG = 'must-not-be-written.jsonl';
    const gateway = echoing({ name: TOKEN_A }, { audit: audit.audit, enableWrites: true });
    await gateway.callTool('get_project', { projectId: '701' }, { caller: `user ${TOKEN_A}` });
    await gateway.callTool(`get_${TOKEN_A}`, { [TOKEN_A]: 1 });
    await gateway.callTool('get_project', { projectId: TOKEN_A });
    expect(audit.records.length).toBeGreaterThanOrEqual(4);
    expect(leaked(TOKEN_A, audit.records)).toEqual([]);
    expect(audit.records.find(record => record.action === 'rejected' && record.reason === 'unsupported tool')?.tool).toBe('unknown_tool');
  });

  it('never repeats the token in an input error', async () => {
    const gateway = echoing({});
    const result = await gateway.callTool('list_projects', { query: TOKEN_A, [`x${TOKEN_A}`]: true });
    expect(result.isError).toBe(true);
    expect(leaked(TOKEN_A, [result])).toEqual([]);
  });

  it('replaces credential-named fields whole, though no projection lets one through today', async () => {
    const { redactDeep, SecretRedactor } = await import('../src/redaction.js');
    const redactor = new SecretRedactor().addSecret(TOKEN_A).addWholeNumber(ORG_A);
    expect(
      redactDeep({ ical_token: 'abc', 'X-Auth-Token': ['a'], note: `org ${ORG_A}, ${ORG_A}0, 1.${ORG_A}`, minutes: Number(ORG_A) }, redactor),
    ).toEqual({ ical_token: '‹redacted›', 'X-Auth-Token': '‹redacted›', note: `org ‹redacted›, ${ORG_A}0, 1.${ORG_A}`, minutes: Number(ORG_A) });
  });

  it('withholds with a fixed text', () => {
    expect(RESULT_WITHHELD).toBe('Withheld: the answer held text that matches a credential of this instance.');
  });
});
