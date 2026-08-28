/* global document, window */
import { spawn } from 'node:child_process';
import { readFile } from 'node:fs/promises';
import { createServer } from 'node:net';
import { chromium } from 'playwright';

let port;
let origin;
let server;
let serverOutput = '';
const viewports = [
  { name: 'small-phone', width: 320, height: 568 },
  { name: 'phone', width: 390, height: 844 },
  { name: 'tablet', width: 768, height: 1024 },
  { name: 'desktop', width: 1440, height: 900 },
];

async function availablePort() {
  return new Promise((resolve, reject) => {
    const probe = createServer();
    probe.once('error', reject);
    probe.listen(0, '127.0.0.1', () => {
      const address = probe.address();
      const selected = typeof address === 'object' && address ? address.port : null;
      probe.close((error) => (error || !selected ? reject(error) : resolve(selected)));
    });
  });
}

function startPreview(selectedPort) {
  const child = spawn(
    process.execPath,
    [
      'node_modules/vite/bin/vite.js',
      'preview',
      '--host',
      '127.0.0.1',
      '--port',
      String(selectedPort),
      '--strictPort',
    ],
    { stdio: ['ignore', 'pipe', 'pipe'] }
  );
  child.stdout.on('data', (chunk) => {
    serverOutput += chunk;
  });
  child.stderr.on('data', (chunk) => {
    serverOutput += chunk;
  });
  return child;
}

async function waitForServer() {
  for (let attempt = 0; attempt < 50; attempt += 1) {
    if (server.exitCode !== null) {
      throw new Error(`Vite preview exited before verification.\n${serverOutput}`);
    }
    let response;
    try {
      response = await fetch(origin);
    } catch {
      // The preview process is still starting.
    }
    if (response?.ok) {
      const html = await response.text();
      if (html.includes('<title>LifeStreak — Habit Tracker</title>')) return;
      throw new Error(`Port ${port} is serving a different application.`);
    }
    await new Promise((resolve) => setTimeout(resolve, 100));
  }
  throw new Error(`Vite preview did not start.\n${serverOutput}`);
}

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

async function inspectPage(page, viewportName, stateName) {
  const result = await page.evaluate(() => {
    const interactive = [
      ...document.querySelectorAll('button, a[href], input, select, textarea'),
    ].filter((element) => {
      const rect = element.getBoundingClientRect();
      return rect.width > 0 && rect.height > 0;
    });
    const unnamed = interactive.filter((element) => {
      if (element.matches('input, select, textarea') && element.closest('label')) return false;
      return !(element.getAttribute('aria-label') || element.textContent || element.title)?.trim();
    });
    const undersized = interactive.filter((element) => {
      if (
        element.matches('input[type="checkbox"], input[type="radio"], input[type="file"]') &&
        element.closest('label')
      ) {
        return false;
      }
      const rect = element.getBoundingClientRect();
      return rect.width < 44 || rect.height < 44;
    });
    return {
      viewport: document.documentElement.clientWidth,
      content: document.documentElement.scrollWidth,
      unnamed: unnamed.map((element) => element.outerHTML.slice(0, 160)),
      undersized: undersized.map((element) => {
        const rect = element.getBoundingClientRect();
        return `${element.tagName} ${(element.getAttribute('aria-label') || element.textContent || '').trim().slice(0, 50)} (${Math.round(rect.width)}x${Math.round(rect.height)})`;
      }),
    };
  });

  assert(
    result.content <= result.viewport,
    `${viewportName}/${stateName}: horizontal overflow (${result.content} > ${result.viewport}).`
  );
  assert(
    !result.unnamed.length,
    `${viewportName}/${stateName}: unnamed controls: ${result.unnamed}`
  );
  assert(
    !result.undersized.length,
    `${viewportName}/${stateName}: controls smaller than 44 CSS px: ${result.undersized.join(', ')}`
  );
}

async function main() {
  let browser;
  try {
    port = await availablePort();
    origin = `http://127.0.0.1:${port}`;
    server = startPreview(port);
    await waitForServer();
    browser = await chromium.launch({ headless: true });

    for (const viewport of viewports) {
      const context = await browser.newContext({
        viewport,
        reducedMotion: 'reduce',
        serviceWorkers: 'block',
      });
      const page = await context.newPage();
      await page.goto(origin, { waitUntil: 'networkidle' });
      await inspectPage(page, viewport.name, 'onboarding');

      const opener = page.getByRole('button', { name: 'Create my own' });
      await opener.click();
      const dialog = page.getByRole('dialog', { name: 'Create a habit' });
      await dialog.waitFor();
      assert(
        await page
          .getByRole('button', { name: 'Close dialog' })
          .evaluate((element) => element.matches(':focus')),
        `${viewport.name}: dialog did not receive predictable initial focus.`
      );
      await inspectPage(page, viewport.name, 'create-dialog');

      await page.keyboard.press('Shift+Tab');
      assert(
        await dialog.evaluate((element) => element.contains(document.activeElement)),
        `${viewport.name}: reverse Tab escaped the dialog.`
      );
      await page.keyboard.press('Escape');
      await dialog.waitFor({ state: 'detached' });
      await page
        .waitForFunction((element) => element?.matches(':focus'), await opener.elementHandle(), {
          timeout: 1000,
        })
        .catch(() => {
          throw new Error(`${viewport.name}: dialog close did not restore focus to its opener.`);
        });

      await page.getByRole('button', { name: 'Dismiss suggestions' }).click();
      await inspectPage(page, viewport.name, 'empty-today');
      for (const destination of ['Habits', 'Insights', 'Settings']) {
        await page.getByRole('button', { name: destination, exact: true }).click();
        await inspectPage(page, viewport.name, destination.toLowerCase());
      }
      await context.close();
    }

    const privacyContext = await browser.newContext({
      viewport: { width: 390, height: 844 },
      serviceWorkers: 'block',
    });
    const privacyPage = await privacyContext.newPage();
    const aiRequests = [];
    await privacyPage.route('https://ollama.com/api/chat', async (route) => {
      aiRequests.push({
        body: route.request().postDataJSON(),
        authorization: await route.request().headerValue('authorization'),
      });
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: '{"message":{"content":"OK"}}',
      });
    });
    await privacyPage.goto(`${origin}/settings?legacy=1`, { waitUntil: 'networkidle' });
    const provider = privacyPage.getByRole('combobox', { name: 'AI provider' });
    await provider.waitFor();
    assert((await provider.inputValue()) === 'none', 'Remote AI was not disabled by default.');
    assert(!aiRequests.length, 'Collections settings sent an AI request before opt-in.');

    await provider.selectOption('ollama');
    const testConnection = privacyPage.getByRole('button', { name: 'Test Connection' });
    assert(await testConnection.isDisabled(), 'AI connection test was enabled before consent.');
    await privacyPage
      .getByRole('textbox', { name: 'API Key', exact: true })
      .fill('session-test-key');
    await privacyPage
      .getByRole('checkbox', { name: /I understand that Test Connection sends/ })
      .check();
    await testConnection.click();
    await privacyPage.waitForResponse('https://ollama.com/api/chat');
    assert(
      aiRequests.length === 1,
      'Explicit AI connection test did not send exactly one request.'
    );
    assert(
      aiRequests[0].body.messages[0].content === 'Say "OK" in one word.',
      'AI test payload drifted from its disclosure.'
    );
    assert(
      aiRequests[0].authorization === 'Bearer session-test-key',
      'Session AI credential was not sent only as the disclosed authorization header.'
    );
    await provider.selectOption('none');
    assert(
      (await privacyPage.evaluate(() => sessionStorage.getItem('ls-ai-api-key-session'))) === null,
      'Disabling remote AI did not clear its session credential.'
    );
    await privacyContext.close();

    const readingContext = await browser.newContext({
      viewport: { width: 390, height: 844 },
      serviceWorkers: 'block',
    });
    await readingContext.addInitScript(() => {
      localStorage.setItem(
        'ls-reading-storage',
        JSON.stringify({
          state: {
            items: [
              {
                id: 1,
                title: 'Chapters fixture',
                type: 'book',
                totalUnits: 10,
                completedUnits: 5,
                unitLabel: 'chapters',
                startedDate: '2026-08-01',
                notes: '',
              },
              {
                id: 2,
                title: 'Minutes fixture',
                type: 'audio',
                totalUnits: 100,
                completedUnits: 90,
                unitLabel: 'minutes',
                startedDate: '2026-08-01',
                notes: '',
              },
            ],
            quarantinedItems: [],
          },
          version: 1,
        })
      );
    });
    const readingPage = await readingContext.newPage();
    await readingPage.goto(`${origin}/?legacy=1`, { waitUntil: 'networkidle' });
    const dashboardProgress = readingPage.getByRole('progressbar', {
      name: 'Average progress across active reading items',
    });
    assert(
      (await dashboardProgress.getAttribute('aria-valuenow')) === '70',
      'Reading dashboard did not average the persisted item percentages.'
    );
    await readingPage.goto(`${origin}/reading?legacy=1`, { waitUntil: 'networkidle' });
    assert(
      (await readingPage
        .getByRole('progressbar', { name: 'Chapters fixture progress' })
        .getAttribute('aria-valuenow')) === '50',
      'Reading detail disagreed with the chapters fixture.'
    );
    assert(
      (await readingPage
        .getByRole('progressbar', { name: 'Minutes fixture progress' })
        .getAttribute('aria-valuenow')) === '90',
      'Reading detail disagreed with the minutes fixture.'
    );
    await readingContext.close();

    const backupContext = await browser.newContext({
      viewport: { width: 390, height: 844 },
      serviceWorkers: 'block',
      acceptDownloads: true,
    });
    const backupPage = await backupContext.newPage();
    await backupPage.goto(origin, { waitUntil: 'networkidle' });
    await backupPage.getByRole('button', { name: 'Create my own' }).click();
    await backupPage.getByLabel(/Name/).fill('Portable fixture');
    await backupPage.getByRole('button', { name: 'Create habit' }).click();
    await backupPage.getByRole('dialog', { name: 'Portable fixture' }).waitFor();
    await backupPage.getByRole('button', { name: 'Close dialog' }).click();
    await backupPage.evaluate(() => {
      localStorage.setItem(
        'ls-service-storage',
        JSON.stringify({ state: { entries: [] }, version: 1 })
      );
    });
    await backupPage.getByRole('button', { name: 'Insights', exact: true }).click();
    await backupPage.getByRole('combobox', { name: 'Date range' }).selectOption('28');
    assert(
      (await backupPage.getByRole('combobox', { name: 'Habit' }).inputValue()) !== '',
      'Insights did not retain a selected habit after filtering.'
    );
    await backupPage.getByRole('button', { name: 'Edit habit' }).click();
    const insightEditDialog = backupPage.getByRole('dialog', { name: 'Edit Portable fixture' });
    await insightEditDialog.waitFor();
    await backupPage.getByRole('button', { name: 'Close dialog' }).click();
    await backupPage.getByRole('button', { name: 'Dismiss suggestion' }).click();
    assert(
      (await backupPage.getByRole('button', { name: 'Dismiss suggestion' }).count()) === 0,
      'Weekly review suggestion was not dismissible.'
    );
    await backupPage.reload({ waitUntil: 'networkidle' });
    await backupPage.getByRole('button', { name: 'Insights', exact: true }).click();
    assert(
      (await backupPage.getByRole('button', { name: 'Dismiss suggestion' }).count()) === 0,
      'Weekly review dismissal did not survive an application reload.'
    );
    await backupPage.getByRole('button', { name: 'Settings', exact: true }).click();
    await backupPage.evaluate(() => {
      const privateError = new Error('Private fixture habit and note');
      privateError.stack = 'Private fixture stack';
      window.dispatchEvent(
        new ErrorEvent('error', { message: privateError.message, error: privateError })
      );
    });
    const diagnosticsDownloadPromise = backupPage.waitForEvent('download');
    await backupPage.getByRole('button', { name: 'Export sanitized diagnostics' }).click();
    const diagnosticsDownload = await diagnosticsDownloadPromise;
    const diagnosticsPath = await diagnosticsDownload.path();
    assert(diagnosticsPath, 'Diagnostics export did not produce a readable file.');
    const diagnosticsRaw = await readFile(diagnosticsPath, 'utf8');
    const diagnostics = JSON.parse(diagnosticsRaw);
    assert(diagnostics.records.length === 1, 'Controlled browser failure was not exported.');
    assert(
      /^[0-9a-f]{40}$/.test(diagnostics.records[0].releaseRevision),
      'Controlled browser failure was not attributed to the full release revision.'
    );
    assert(
      !diagnosticsRaw.includes('Private fixture'),
      'Sanitized diagnostics retained private error content.'
    );
    await backupPage.getByRole('button', { name: 'Delete local diagnostics' }).click();
    assert(
      (await backupPage.evaluate(() => localStorage.getItem('ls-error-logs'))) === null,
      'Diagnostics delete control did not remove the local records.'
    );
    const downloadPromise = backupPage.waitForEvent('download');
    await backupPage.getByRole('button', { name: 'Export complete LifeStreak backup' }).click();
    const backupDownload = await downloadPromise;
    const backupPath = await backupDownload.path();
    assert(backupPath, 'Portable backup download did not produce a readable file.');
    await backupPage.evaluate(() => {
      localStorage.removeItem('lifestreak-habit-tracker-v1');
      localStorage.removeItem('ls-service-storage');
    });
    await backupPage.getByLabel('Import LifeStreak JSON').setInputFiles(backupPath);
    await backupPage
      .getByRole('heading', { name: 'Replace with validated complete backup?' })
      .waitFor();
    await backupPage.getByRole('button', { name: 'Restore complete backup' }).click();
    await backupPage.waitForFunction(
      () =>
        localStorage.getItem('lifestreak-habit-tracker-v1')?.includes('Portable fixture') &&
        localStorage.getItem('ls-service-storage') !== null
    );
    await backupContext.close();

    const unitTransitionContext = await browser.newContext({
      viewport: { width: 390, height: 844 },
      serviceWorkers: 'block',
    });
    await unitTransitionContext.addInitScript(() => {
      const localDate = (date) => {
        const year = date.getFullYear();
        const month = String(date.getMonth() + 1).padStart(2, '0');
        const day = String(date.getDate()).padStart(2, '0');
        return `${year}-${month}-${day}`;
      };
      const now = new Date();
      const today = localDate(now);
      const priorDate = new Date(now);
      priorDate.setDate(priorDate.getDate() - 1);
      const prior = localDate(priorDate);
      const timestamp = now.toISOString();
      localStorage.setItem(
        'lifestreak-habit-tracker-v1',
        JSON.stringify({
          version: 1,
          habits: [
            {
              id: 'habit-unit-transition',
              name: 'Mixed unit history',
              description: '',
              category: 'Health',
              icon: '✓',
              colour: '#4f46e5',
              timeOfDay: 'anytime',
              startDate: prior,
              schedule: { type: 'daily', anchorDate: prior },
              tracking: { type: 'duration', target: 20, unit: 'min' },
              reminderTime: null,
              lifecycleState: 'active',
              lifecycleHistory: [],
              revisions: [
                {
                  id: 'revision-distance',
                  effectiveDate: today,
                  schedule: { type: 'daily', anchorDate: prior },
                  tracking: { type: 'distance', target: 5, unit: 'km' },
                  timeOfDay: 'anytime',
                  createdAt: timestamp,
                },
              ],
              sourceTemplateId: null,
              order: 0,
              createdAt: timestamp,
              updatedAt: timestamp,
            },
          ],
          logs: [
            {
              id: 'log-minutes',
              habitId: 'habit-unit-transition',
              date: prior,
              explicitStatus: null,
              entries: [{ id: 'entry-minutes', value: 30, unit: 'min', createdAt: timestamp }],
              note: '',
              createdAt: timestamp,
              updatedAt: timestamp,
            },
            {
              id: 'log-distance',
              habitId: 'habit-unit-transition',
              date: today,
              explicitStatus: null,
              entries: [{ id: 'entry-distance', value: 6, unit: 'km', createdAt: timestamp }],
              note: '',
              createdAt: timestamp,
              updatedAt: timestamp,
            },
          ],
          preferences: { weekStartsOn: 1 },
          onboarding: { completed: true, dismissedAt: null },
          legacy: { detectedKeys: [], scannedAt: null, migrationRecords: [] },
          updatedAt: timestamp,
        })
      );
    });
    const unitTransitionPage = await unitTransitionContext.newPage();
    await unitTransitionPage.goto(origin, { waitUntil: 'networkidle' });
    await unitTransitionPage.getByRole('button', { name: 'Insights', exact: true }).click();
    const minuteMetric = unitTransitionPage.locator('article').filter({ hasText: 'Logged min' });
    const distanceMetric = unitTransitionPage.locator('article').filter({ hasText: 'Logged km' });
    await minuteMetric.getByText('30', { exact: true }).waitFor();
    await distanceMetric.getByText('6', { exact: true }).waitFor();
    assert(
      (await minuteMetric.textContent()).includes('target 20 min'),
      'Historical minute values were shown under the newer distance target.'
    );
    assert(
      (await distanceMetric.textContent()).includes('target 5 km'),
      'Current distance values were shown under the historical duration target.'
    );
    await unitTransitionContext.close();

    const migrationContext = await browser.newContext({
      viewport: { width: 390, height: 844 },
      serviceWorkers: 'block',
    });
    await migrationContext.addInitScript(() => {
      localStorage.setItem(
        'jw-progress-storage',
        JSON.stringify({
          state: {
            dailyTexts: { '2024-02-29': { readScripture: true, progress: 100 } },
            prayers: {},
            bibleReadings: {},
            weeklyReadings: {},
          },
          version: 1,
        })
      );
    });
    const migrationPage = await migrationContext.newPage();
    await migrationPage.goto(origin, { waitUntil: 'networkidle' });
    await migrationPage.getByRole('button', { name: 'Settings', exact: true }).click();
    await migrationPage.getByRole('button', { name: 'Scan for preserved stores' }).click();
    await migrationPage.getByText(/jw-progress-storage.*migration-candidate/).waitFor();
    await migrationPage.getByRole('button', { name: 'Preserve and migrate' }).click();
    await migrationPage.getByLabel('Daily Text').check();
    await migrationPage.getByRole('button', { name: 'Map selected completion history' }).click();
    const mappedState = await migrationPage.evaluate(() => ({
      source: localStorage.getItem('jw-progress-storage'),
      successor: localStorage.getItem('ls-progress-storage'),
      habitDatabase: JSON.parse(localStorage.getItem('lifestreak-habit-tracker-v1')),
    }));
    assert(
      mappedState.source === mappedState.successor,
      'Selected habit mapping changed the preserved progress source.'
    );
    assert(
      mappedState.habitDatabase.habits.some(
        (habit) => habit.sourceTemplateId === 'legacy:ls-progress-storage:daily-text'
      ) &&
        mappedState.habitDatabase.logs.some(
          (log) => log.date === '2024-02-29' && log.explicitStatus === 'completed'
        ),
      'Selected full-date completion was not mapped into an ordinary habit and log.'
    );
    const cleanupInput = migrationPage.getByLabel(
      'Type REMOVE jw-progress-storage to remove only the historical source'
    );
    await cleanupInput.waitFor();
    const cleanupButton = migrationPage.getByRole('button', {
      name: 'Remove verified historical source',
    });
    assert(await cleanupButton.isDisabled(), 'Historical cleanup did not require typed approval.');
    await cleanupInput.fill('REMOVE jw-progress-storage');
    await cleanupButton.click();
    const migrationState = await migrationPage.evaluate(() => {
      const source = localStorage.getItem('jw-progress-storage');
      const successor = localStorage.getItem('ls-progress-storage');
      const recoveryKeys = Array.from({ length: localStorage.length }, (_, index) =>
        localStorage.key(index)
      ).filter((key) => key?.startsWith('lifestreak-legacy-backup-jw-progress-storage-'));
      return { source, successor, recoveryKeys };
    });
    assert(migrationState.source === null, 'Approved historical source cleanup did not finish.');
    assert(
      migrationState.successor?.includes('2024-02-29'),
      'Historical cleanup changed or removed the verified successor.'
    );
    assert(
      migrationState.recoveryKeys.length === 1,
      'Historical cleanup did not retain its source-specific recovery copy.'
    );
    await migrationContext.close();

    const offlineContext = await browser.newContext({
      viewport: { width: 390, height: 844 },
    });
    const offlinePage = await offlineContext.newPage();
    await offlinePage.goto(origin, { waitUntil: 'networkidle' });
    await offlinePage.evaluate(() => navigator.serviceWorker.ready);
    if (!(await offlinePage.evaluate(() => Boolean(navigator.serviceWorker.controller)))) {
      await offlinePage.reload({ waitUntil: 'networkidle' });
    }
    assert(
      await offlinePage.evaluate(() => Boolean(navigator.serviceWorker.controller)),
      'Production app shell was not controlled by its service worker.'
    );
    await offlinePage.getByRole('button', { name: 'Create my own' }).click();
    await offlinePage.getByLabel(/Name/).fill('Offline continuity');
    await offlinePage.getByRole('button', { name: 'Create habit' }).click();
    await offlinePage.getByRole('dialog', { name: 'Offline continuity' }).waitFor();
    await offlinePage.getByRole('button', { name: 'Close dialog' }).click();
    const beforeOffline = await offlinePage.evaluate(() =>
      localStorage.getItem('lifestreak-habit-tracker-v1')
    );
    assert(beforeOffline?.includes('Offline continuity'), 'Seed habit was not persisted.');

    await offlineContext.setOffline(true);
    await offlinePage.getByText("You're offline", { exact: false }).waitFor();
    await offlinePage.reload({ waitUntil: 'domcontentloaded' });
    await offlinePage.getByRole('heading', { name: 'Offline continuity' }).waitFor();
    const afterOffline = await offlinePage.evaluate(() =>
      localStorage.getItem('lifestreak-habit-tracker-v1')
    );
    assert(afterOffline === beforeOffline, 'Offline restart changed the persisted habit database.');
    await offlineContext.close();

    console.log(`LifeStreak UI contract verified across ${viewports.length} responsive viewports.`);
  } finally {
    await browser?.close();
    server?.kill('SIGTERM');
  }
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
