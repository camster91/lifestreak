import { execFileSync } from 'node:child_process';
import { pathToFileURL } from 'node:url';
import { describe, expect, it } from 'vitest';

const engineUrl = pathToFileURL(`${process.cwd()}/src/habitTracker/engine.js`).href;

function runInTimezone(timezone) {
  const program = `
    const engine = await import(${JSON.stringify(engineUrl)});
    const habit = {
      id: 'habit-1', name: 'Walk', startDate: '2026-01-01', timeOfDay: 'anytime',
      schedule: { type: 'daily', anchorDate: '2026-01-01' },
      tracking: { type: 'binary' }, lifecycleState: 'active', lifecycleHistory: [], revisions: []
    };
    const log = { id: 'log-1', habitId: 'habit-1', date: '2026-12-31', explicitStatus: 'completed', entries: [] };
    console.log(JSON.stringify({
      leap: engine.addDays('2024-02-28', 1),
      springDst: engine.addDays('2026-03-07', 1),
      autumnDst: engine.addDays('2026-10-31', 1),
      year: engine.addDays('2026-12-31', 1),
      localDate: engine.toLocalDate(new Date(2026, 11, 31, 23, 30)),
      status: engine.getDayState(habit, [log], '2026-12-31', { today: '2026-12-31' }).status
    }));
  `;
  return JSON.parse(
    execFileSync(process.execPath, ['--input-type=module', '--eval', program], {
      encoding: 'utf8',
      env: { ...process.env, TZ: timezone },
    })
  );
}

describe('schedule timezone matrix', () => {
  it.each(['Etc/GMT+12', 'Pacific/Kiritimati', 'America/Toronto', 'Europe/Berlin'])(
    'keeps local calendar rules deterministic in %s',
    (timezone) => {
      expect(runInTimezone(timezone)).toEqual({
        leap: '2024-02-29',
        springDst: '2026-03-08',
        autumnDst: '2026-11-01',
        year: '2027-01-01',
        localDate: '2026-12-31',
        status: 'completed',
      });
    }
  );
});
