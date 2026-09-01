import { beforeEach, describe, expect, it } from 'vitest';
import { createDiagnosticsExport, DIAGNOSTICS_KEY, recordDiagnostic } from './diagnostics.js';

describe('privacy-preserving diagnostics', () => {
  beforeEach(() => localStorage.clear());

  it('attributes a failure without retaining private message, stack, query, or user agent', () => {
    window.history.replaceState({}, '', '/settings?habit=Private+habit');
    const privateError = new Error('Private habit name and note');
    privateError.stack = 'Private stack content';
    const record = recordDiagnostic('react_boundary', privateError, {
      now: new Date('2026-08-28T12:00:00.000Z'),
      appVersion: '4.0.0',
      releaseRevision: 'a'.repeat(40),
    });
    expect(record).toMatchObject({
      kind: 'react_boundary',
      errorClass: 'Error',
      route: '/settings',
      platform: 'web',
      appVersion: '4.0.0',
    });
    expect(record.releaseRevision).toMatch(/^[0-9a-f]{40}$/);
    const raw = localStorage.getItem(DIAGNOSTICS_KEY);
    expect(raw).not.toContain('Private habit');
    expect(raw).not.toContain('Private stack');
    expect(raw).not.toContain('userAgent');
    expect(raw).not.toContain('?habit=');
  });

  it('exports only schema-approved records and expires records after 30 days', () => {
    localStorage.setItem(
      DIAGNOSTICS_KEY,
      JSON.stringify([
        { schemaVersion: 1, recordedAt: '2026-01-01T00:00:00.000Z', message: 'old private' },
        {
          schemaVersion: 1,
          recordedAt: '2026-08-27T00:00:00.000Z',
          kind: 'react_boundary',
          errorClass: 'Error',
          fingerprint: '12345678',
          route: '/settings',
          platform: 'web',
          appVersion: '4.0.0',
          releaseRevision: 'a'.repeat(40),
          message: 'recent private extra field',
        },
      ])
    );
    recordDiagnostic('unhandled_rejection', new TypeError('secret'), {
      now: new Date('2026-08-28T12:00:00.000Z'),
      appVersion: '4.0.0',
      releaseRevision: 'a'.repeat(40),
    });
    const exported = createDiagnosticsExport();
    expect(exported.records).toHaveLength(2);
    expect(JSON.stringify(exported)).not.toContain('secret');
    expect(JSON.stringify(exported)).not.toContain('old private');
    expect(JSON.stringify(exported)).not.toContain('recent private');
  });
});
