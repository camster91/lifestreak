import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const resolve = (...segments) => path.join(root, ...segments);
const read = (file) => fs.readFileSync(resolve(file), 'utf8');
const write = (file, content) => {
  fs.mkdirSync(path.dirname(resolve(file)), { recursive: true });
  fs.writeFileSync(resolve(file), content.endsWith('\n') ? content : `${content}\n`, 'utf8');
};
const appendSection = (file, marker, section) => {
  if (!fs.existsSync(resolve(file))) return;
  const content = read(file);
  if (!content.includes(marker)) write(file, `${content.trimEnd()}\n\n${section.trim()}\n`);
};

const originalAppPath = 'src/App.jsx';
const legacyAppPath = 'src/LegacyApp.jsx';
const habitAppPath = 'src/App.habit-first.jsx';

if (!fs.existsSync(resolve(originalAppPath))) {
  throw new Error('src/App.jsx was not found; refusing to integrate against an unknown application shell.');
}
if (!fs.existsSync(resolve(habitAppPath))) {
  throw new Error('src/App.habit-first.jsx was not found.');
}
if (!fs.existsSync(resolve(legacyAppPath))) {
  fs.copyFileSync(resolve(originalAppPath), resolve(legacyAppPath));
}
fs.copyFileSync(resolve(habitAppPath), resolve(originalAppPath));

// A weekly target remains due on the completion date that satisfies the target.
const enginePath = 'src/habitTracker/engine.js';
let engine = read(enginePath);
engine = engine.replace(
  `      const completions = (logs || []).filter((log) => {\n        if (log.habitId !== habit.id || log.date < weekStart || log.date > weekEnd) return false;\n        return dailyResult(habit, log, log.date).status === 'completed';\n      }).length;\n      return completions < schedule.timesPerWeek;`,
  `      const completionDates = Array.from(\n        new Set(\n          (logs || [])\n            .filter((log) => {\n              if (log.habitId !== habit.id || log.date < weekStart || log.date > weekEnd) return false;\n              return dailyResult(habit, log, log.date).status === 'completed';\n            })\n            .map((log) => log.date),\n        ),\n      ).sort();\n      const completionIndex = completionDates.indexOf(dateKey);\n      if (completionIndex >= 0) return completionIndex < schedule.timesPerWeek;\n      return completionDates.filter((completedDate) => completedDate < dateKey).length < schedule.timesPerWeek;`,
);
write(enginePath, engine);

// A non-undoable preference must not leave an unrelated older action behind the Undo button.
const storePath = 'src/habitTracker/store.js';
let store = read(storePath);
store = store.replace(
  '    if (undoable) undoSnapshot = serializable(previous);',
  '    undoSnapshot = undoable ? serializable(previous) : null;',
);
write(storePath, store);

const packagePath = 'package.json';
if (fs.existsSync(resolve(packagePath))) {
  const packageJson = JSON.parse(read(packagePath));
  packageJson.description =
    'A private, local-first habit and routine tracker with optional specialist collections.';
  packageJson.keywords = Array.from(
    new Set([...(packageJson.keywords || []), 'habits', 'routines', 'streaks', 'local-first']),
  );
  write(packagePath, `${JSON.stringify(packageJson, null, 2)}\n`);
}

const indexPath = 'index.html';
if (fs.existsSync(resolve(indexPath))) {
  let html = read(indexPath);
  html = html.replace(/<title>[^<]*<\/title>/i, '<title>LifeStreak — Habit Tracker</title>');
  html = html.replace(
    /<meta\s+name=["']description["']\s+content=["'][^"']*["']\s*\/?\s*>/i,
    '<meta name="description" content="A private, local-first habit and routine tracker." />',
  );
  write(indexPath, html);
}

const vitePath = 'vite.config.js';
if (fs.existsSync(resolve(vitePath))) {
  let vite = read(vitePath);
  const manifestIndex = vite.indexOf('manifest:');
  if (manifestIndex >= 0) {
    const before = vite.slice(0, manifestIndex);
    let manifestAndAfter = vite.slice(manifestIndex);
    const boundary = Math.min(manifestAndAfter.length, 2200);
    let manifest = manifestAndAfter.slice(0, boundary);
    const after = manifestAndAfter.slice(boundary);
    manifest = manifest
      .replace(/name:\s*['"`][^'"`]*['"`]/, "name: 'LifeStreak — Habit Tracker'")
      .replace(/short_name:\s*['"`][^'"`]*['"`]/, "short_name: 'LifeStreak'")
      .replace(
        /description:\s*['"`][^'"`]*['"`]/,
        "description: 'A private, local-first habit and routine tracker.'",
      );
    vite = `${before}${manifest}${after}`;
  }
  write(vitePath, vite);
}

write(
  'README.md',
  `# LifeStreak\n\nLifeStreak is a private, local-first habit and routine tracker. It is a general-purpose product for health, learning, planning, family, spiritual, and other personal routines. Spiritual habits are optional templates rather than the app's only identity.\n\n## Primary experience\n\n- **Today** shows only habits expected on the selected local date and supports completion, quantitative progress, intentional skip, failure, correction, notes, and undo.\n- **Habits** creates and manages binary or measurable routines with flexible schedules, time-of-day groups, lifecycle controls, and editable starter templates.\n- **Insights** uses schedule-aware denominators and distinguishes completed, partial, failed, skipped, missed, future, paused, archived, and unscheduled states.\n- **Settings** provides explicit reminder permission, private notification copy, export/import, recovery copies, legacy-store inspection, and safe reset controls.\n- **Collections** opens the original specialist LifeStreak interface so existing study, service, reading, goal, memory, and other richer records remain accessible.\n\n## Data and privacy\n\nHabit data is stored locally under a separate, versioned key. Existing specialist stores are not deleted or silently reinterpreted. Schedule, target, unit, and lifecycle changes are effective-dated so edits do not rewrite history. Notification permission is requested only from a deliberate Settings action, and habit names are hidden from notification surfaces by default.\n\nExport a JSON backup before clearing browser or installed-app data. The reset workflow creates a local recovery copy first and does not remove specialist Collections data.\n\n## Development\n\n\`\`\`bash\nnpm ci\nnpm run lint\nnpm test -- --run\nnpm run build\n\`\`\`\n\nThe habit-first architecture, calendar rules, migration policy, representative responsive QA, accessibility checks, and rollback plan are documented in [docs/habit-first-architecture.md](docs/habit-first-architecture.md).\n\n## Implementation branch\n\nThe habit-first transition was developed on \`codex/lifestreak-habit-first\`. The original application shell is retained as \`src/LegacyApp.jsx\`, and the integration can be rolled back without altering either the new habit database or existing specialist storage.\n\n## Licence\n\nMIT.\n`,
);

appendSection(
  'PRIVACY_POLICY.md',
  '## Habit tracker and Collections data',
  `## Habit tracker and Collections data\n\nLifeStreak stores the general habit database locally and separately from existing specialist Collections stores. The app does not silently upload, merge, or reinterpret either data set. Habit names are hidden in notification copy by default. Notification permission is requested only after the user selects the permission control in Settings. JSON export and import are initiated by the user.`,
);

appendSection(
  'APP_STORE_SUBMISSION.md',
  '## Habit-first product correction',
  `## Habit-first product correction\n\nLifeStreak is submitted as a general-purpose, local-first habit and routine tracker. Spiritual routines are optional templates and specialist Collections, not the mandatory default experience. Store screenshots and copy must show Today, Habits, Insights, Settings, optional templates, explicit notification permission, and local backup/recovery. Claims about cloud synchronization, background web reminders, medical outcomes, or automatic migration are not permitted.`,
);

appendSection(
  'APP_STORE_TODO.md',
  '## Habit-first release gate',
  `## Habit-first release gate\n\n- [ ] Capture phone and tablet screenshots of Today, Habits, Insights, Settings, and optional Collections.\n- [ ] Verify the privacy policy and store copy describe local-only habit storage and explicit notification permission.\n- [ ] Run the date/timezone, accessibility, responsive, import/export, recovery, and legacy-record QA matrix in docs/habit-first-architecture.md.\n- [ ] Confirm native background reminders use one valid platform schedule per notification and generic copy by default.\n- [ ] Confirm no existing specialist record is deleted or silently converted during upgrade.`,
);

write(
  '.habit-first-applied',
  `Applied: ${new Date().toISOString()}\nBranch: codex/lifestreak-habit-first\nOriginal shell: src/LegacyApp.jsx\nNew shell: src/App.jsx\n`,
);

console.log('Habit-first integration applied.');
