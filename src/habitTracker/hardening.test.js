import { describe, expect, it } from 'vitest';
import { sanitizeImportedState } from './hardening';

function validState(overrides = {}) {
  return {
    version: 1,
    habits: [
      {
        id: 'habit-1',
        name: 'Move',
        description: 'Move for twenty minutes.',
        category: 'Health',
        colour: '#123abc',
        timeOfDay: 'afternoon',
        startDate: '2026-08-17',
        schedule: { type: 'daily', anchorDate: '2026-08-17' },
        tracking: { type: 'duration', target: 20, unit: 'min' },
        reminderTime: null,
        lifecycleState: 'active',
        lifecycleHistory: [],
        revisions: [],
        sourceTemplateId: null,
        order: 0,
        createdAt: '2026-08-17T12:00:00.000Z',
        updatedAt: '2026-08-17T12:00:00.000Z',
      },
    ],
    logs: [],
    preferences: {
      weekStartsOn: 1,
      completedPlacement: 'bottom',
      showHabitNamesInNotifications: false,
    },
    onboarding: { completed: true, dismissedAt: null },
    legacy: { detectedKeys: [], scannedAt: null, quarantinedRecords: [] },
    operation: null,
    updatedAt: '2026-08-17T12:00:00.000Z',
    ...overrides,
  };
}

describe('habit import hardening', () => {
  it('returns only the supported schema and normalizes unsafe display values', () => {
    const input = validState();
    input.habits[0].colour = 'url(javascript:alert(1))';
    input.unexpected = { retained: false };

    const result = sanitizeImportedState(input);

    expect(result.habits[0].colour).toBe('#4f46e5');
    expect(result).not.toHaveProperty('unexpected');
    expect(result.operation).toBeNull();
  });

  it('rejects more than one log for the same habit and date', () => {
    const input = validState({
      logs: [
        {
          id: 'log-1',
          habitId: 'habit-1',
          date: '2026-08-17',
          explicitStatus: 'completed',
          entries: [],
        },
        {
          id: 'log-2',
          habitId: 'habit-1',
          date: '2026-08-17',
          explicitStatus: 'completed',
          entries: [],
        },
      ],
    });

    expect(() => sanitizeImportedState(input)).toThrow(/more than one log/i);
  });

  it('rejects logs that reference an unknown habit', () => {
    const input = validState({
      logs: [
        {
          id: 'log-1',
          habitId: 'habit-missing',
          date: '2026-08-17',
          explicitStatus: 'completed',
          entries: [],
        },
      ],
    });

    expect(() => sanitizeImportedState(input)).toThrow(/unknown habit/i);
  });

  it('does not copy prototype-style properties from a parsed backup', () => {
    const input = JSON.parse(JSON.stringify(validState()).replace(/}$/, ',"__proto__":{"polluted":true}}'));
    const result = sanitizeImportedState(input);

    expect(Object.prototype.polluted).toBeUndefined();
    expect(Object.prototype.hasOwnProperty.call(result, '__proto__')).toBe(false);
  });
});
