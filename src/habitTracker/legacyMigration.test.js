import { describe, expect, it } from 'vitest';
import { classifyLegacyRecord } from './store';

const envelope = JSON.stringify({ state: { records: [] }, version: 1 });

describe('legacy storage classification', () => {
  it('preserves a valid current specialist store', () => {
    expect(classifyLegacyRecord('ls-service-storage', envelope)).toMatchObject({
      status: 'preserved',
      successor: null,
    });
  });

  it('offers a valid historical store only when its successor is absent', () => {
    expect(classifyLegacyRecord('jw-progress-storage', envelope, [])).toMatchObject({
      status: 'migration-candidate',
      successor: 'ls-progress-storage',
    });
    expect(
      classifyLegacyRecord('jw-progress-storage', envelope, ['ls-progress-storage'])
    ).toMatchObject({ status: 'conflict' });
  });

  it.each([
    ['ls-reading-storage', '[object Object]', 'unsafe object-to-string'],
    ['ls-reading-storage', '{broken', 'not valid JSON'],
    ['ls-reading-storage', JSON.stringify({ items: [] }), 'state envelope'],
    ['mystery-progress', envelope, 'no verified schema'],
  ])('quarantines unsafe %s values', (key, raw, reason) => {
    const result = classifyLegacyRecord(key, raw);
    expect(result.status).toBe('quarantined');
    expect(result.reason).toContain(reason);
  });

  it('keeps auxiliary preferences outside personal-history migration', () => {
    expect(classifyLegacyRecord('dailyReminderTime', '{"hour":7,"minute":0}')).toMatchObject({
      status: 'operational',
    });
    expect(
      classifyLegacyRecord('installPromptDismissed', '2026-09-04T12:00:00.000Z')
    ).toMatchObject({ status: 'operational' });
  });
});
