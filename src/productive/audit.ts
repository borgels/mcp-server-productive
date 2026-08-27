import { appendFile } from 'node:fs/promises';
import { randomUUID } from 'node:crypto';

export interface AuditEvent {
  tool: string;
  resource?: string;
  operation?: string;
  method?: string;
  path?: string;
  tier?: string;
  /** The caller, when the gateway forwards one — see identity.ts. */
  user?: string;
  organizationId?: string;
  allowed?: boolean;
  reason?: string;
  operationHash?: string;
  /** Productive's request id, so a line here can be matched to their logs. */
  requestId?: string;
  status?: string;
  error?: string;
}

/**
 * Append one JSON line per mutation attempt when PRODUCTIVE_AUDIT_LOG names a
 * file — including the ones policy refused, which are the interesting ones.
 *
 * Request bodies are deliberately not written. They carry salaries, rates and
 * personal data, and an audit trail that has to be access-controlled as
 * tightly as the source system tends not to get read at all. What is recorded
 * is who asked for what, whether it was allowed, and the hash of the staged
 * operation, which is enough to tie a line back to a prepared change.
 */
export async function writeAuditEvent(event: AuditEvent): Promise<void> {
  const auditPath = process.env.PRODUCTIVE_AUDIT_LOG;
  if (!auditPath) return;

  const record = {
    timestamp: new Date().toISOString(),
    requestId: event.requestId ?? randomUUID(),
    ...event,
  };

  try {
    await appendFile(auditPath, `${JSON.stringify(record)}\n`, 'utf8');
  } catch (error) {
    // A full disk or a read-only volume must not turn a working tool call into
    // a failure; the operator sees it on stderr instead.
    console.error('productive: failed to write audit event', error);
  }
}

/** Run a mutation with an audit line either way. */
export async function audited<T>(
  event: AuditEvent,
  call: () => Promise<T>,
): Promise<T> {
  try {
    const result = await call();
    await writeAuditEvent({ ...event, status: 'ok' });
    return result;
  } catch (error) {
    await writeAuditEvent({
      ...event,
      status: 'error',
      error: error instanceof Error ? error.message : String(error),
    });
    throw error;
  }
}
