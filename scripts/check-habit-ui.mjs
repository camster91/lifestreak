/* global document */
import { spawn } from 'node:child_process';
import { chromium } from 'playwright';

const port = 4175;
const origin = `http://127.0.0.1:${port}`;
const viewports = [
  { name: 'small-phone', width: 320, height: 568 },
  { name: 'phone', width: 390, height: 844 },
  { name: 'tablet', width: 768, height: 1024 },
  { name: 'desktop', width: 1440, height: 900 },
];

const server = spawn(
  process.execPath,
  ['node_modules/vite/bin/vite.js', 'preview', '--host', '127.0.0.1', '--port', String(port)],
  { stdio: ['ignore', 'pipe', 'pipe'] }
);

let serverOutput = '';
server.stdout.on('data', (chunk) => {
  serverOutput += chunk;
});
server.stderr.on('data', (chunk) => {
  serverOutput += chunk;
});

async function waitForServer() {
  for (let attempt = 0; attempt < 50; attempt += 1) {
    try {
      const response = await fetch(origin);
      if (response.ok) return;
    } catch {
      // The preview process is still starting.
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
    await backupPage.getByRole('button', { name: 'Settings', exact: true }).click();
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
    server.kill('SIGTERM');
  }
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
