/* global document, window */
import { spawn } from 'node:child_process';
import { readFile } from 'node:fs/promises';
import { createServer } from 'node:net';
import { chromium } from 'playwright';
import AxeBuilder from '@axe-core/playwright';

let port;
let origin;
let server;
let serverOutput = '';
const viewports = [
  { name: 'small-phone', width: 320, height: 568 },
  { name: 'phone', width: 390, height: 844 },
  { name: 'phone-landscape', width: 844, height: 390 },
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

  const axeResults = await new AxeBuilder({ page })
    .withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa'])
    .analyze();
  const blockingViolations = axeResults.violations.filter(({ impact }) =>
    ['serious', 'critical'].includes(impact)
  );
  assert(
    !blockingViolations.length,
    `${viewportName}/${stateName}: serious accessibility violations: ${blockingViolations
      .map(
        ({ id, nodes }) =>
          `${id} (${nodes
            .map(({ target }) => target.join(' '))
            .slice(0, 3)
            .join(', ')})`
      )
      .join('; ')}`
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
      const advancedOptions = dialog.locator('details.habit-advanced-options');
      assert(
        (await advancedOptions.getAttribute('open')) === null,
        `${viewport.name}: blank habit exposed advanced options by default.`
      );
      assert(
        !(await page.getByLabel('Frequency').isVisible()),
        `${viewport.name}: hidden advanced schedule controls remained visible.`
      );
      await advancedOptions.locator('summary').click();
      assert(
        await page.getByLabel('Frequency').isVisible(),
        `${viewport.name}: advanced options could not be expanded.`
      );
      await inspectPage(page, viewport.name, 'create-dialog-advanced');

      if (viewport.name === 'phone') {
        await page.getByLabel(/Name/).focus();
        await page.setViewportSize({ width: viewport.width, height: 420 });
        const primaryAction = page.getByRole('button', { name: 'Create habit' });
        await primaryAction.scrollIntoViewIfNeeded();
        const actionRect = await primaryAction.boundingBox();
        assert(
          actionRect && actionRect.y >= 0 && actionRect.y + actionRect.height <= 420,
          'phone/virtual-keyboard: primary form action could not be brought above the keyboard viewport.'
        );
        await inspectPage(page, viewport.name, 'virtual-keyboard-dialog');
        await page.setViewportSize({ width: viewport.width, height: viewport.height });
      }

      await page.keyboard.press('Shift+Tab');
      assert(
        await dialog.evaluate((element) => element.contains(document.activeElement)),
        `${viewport.name}: reverse Tab escaped the dialog.`
      );
      await page.getByLabel(/Name/).fill('Unsaved browser fixture');
      let discardPrompts = 0;
      page.on('dialog', async (browserDialog) => {
        assert(
          browserDialog.message() === 'Discard the unsaved habit changes?',
          `${viewport.name}: unsaved-change prompt used unexpected copy.`
        );
        discardPrompts += 1;
        if (discardPrompts === 1) await browserDialog.dismiss();
        else await browserDialog.accept();
      });
      await page.keyboard.press('Escape');
      assert(
        await dialog.isVisible(),
        `${viewport.name}: rejected discard still closed the dialog.`
      );
      await page.keyboard.press('Escape');
      await dialog.waitFor({ state: 'detached' });
      assert(
        discardPrompts === 2,
        `${viewport.name}: unsaved changes did not require rejection and confirmation.`
      );
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

    const activationContext = await browser.newContext({
      viewport: { width: 390, height: 844 },
      serviceWorkers: 'block',
    });
    const activationPage = await activationContext.newPage();
    await activationPage.goto(origin, { waitUntil: 'networkidle' });
    await activationPage.getByRole('button', { name: 'Dismiss suggestions' }).click();
    await activationPage.getByRole('button', { name: 'Show starter suggestions' }).click();
    const movementTemplate = activationPage
      .locator('article')
      .filter({ has: activationPage.getByRole('heading', { name: 'Move / workout' }) });
    await movementTemplate.getByRole('button', { name: 'Customize first' }).click();
    const templateDialog = activationPage.getByRole('dialog', { name: 'Create a habit' });
    await templateDialog.waitFor();
    assert(
      await templateDialog.getByLabel('Frequency').isVisible(),
      'Template customization hid the schedule and tracking values being copied.'
    );
    await templateDialog.getByLabel(/Name/).fill('Customized movement');
    await templateDialog.getByRole('button', { name: 'Create habit' }).click();
    const firstCheckInDialog = activationPage.getByRole('dialog', {
      name: 'Customized movement',
    });
    await firstCheckInDialog.getByText('Your habit is ready').waitFor();
    await firstCheckInDialog.getByLabel('First value in min').fill('20');
    await firstCheckInDialog.getByRole('button', { name: 'Save first check-in' }).click();
    await firstCheckInDialog.locator('.habit-status', { hasText: 'Completed' }).waitFor();
    const activationBeforeReload = await activationPage.evaluate(() =>
      localStorage.getItem('lifestreak-habit-tracker-v1')
    );
    await firstCheckInDialog.getByRole('button', { name: 'Close dialog' }).click();
    await activationPage.reload({ waitUntil: 'networkidle' });
    await activationPage.getByRole('heading', { name: 'Customized movement' }).waitFor();
    const activationAfterReload = await activationPage.evaluate(() =>
      localStorage.getItem('lifestreak-habit-tracker-v1')
    );
    assert(
      activationAfterReload === activationBeforeReload,
      'Reload changed the customized first-check-in database.'
    );
    const activationDatabase = JSON.parse(activationAfterReload);
    assert(
      activationDatabase.habits.length === 1 &&
        activationDatabase.habits[0].sourceTemplateId === 'move-workout' &&
        activationDatabase.habits[0].name === 'Customized movement' &&
        activationDatabase.logs.length === 1 &&
        activationDatabase.logs[0].habitId === activationDatabase.habits[0].id &&
        activationDatabase.logs[0].entries.length === 1 &&
        activationDatabase.logs[0].entries[0].value === 20 &&
        activationDatabase.logs[0].entries[0].unit === 'min',
      'Customized template activation did not preserve one stable habit and source log.'
    );
    await inspectPage(activationPage, 'phone', 'first-check-in-reloaded');
    await activationContext.close();

    const zoomContext = await browser.newContext({
      viewport: { width: 640, height: 450 },
      screen: { width: 1280, height: 900 },
      deviceScaleFactor: 2,
      forcedColors: 'active',
      reducedMotion: 'reduce',
      serviceWorkers: 'block',
    });
    await zoomContext.addInitScript(() => {
      const now = new Date();
      const today = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(
        now.getDate()
      ).padStart(2, '0')}`;
      const timestamp = now.toISOString();
      const longName =
        'A deliberately long translated habit name that must wrap without hiding its actions or status';
      localStorage.setItem(
        'lifestreak-habit-tracker-v1',
        JSON.stringify({
          version: 1,
          habits: [
            {
              id: 'habit-long-label',
              name: longName,
              description:
                'Long supporting copy verifies that populated cards reflow safely in high contrast and constrained zoom-equivalent layouts.',
              category: 'Learning and personal development',
              icon: '✓',
              colour: '#4f46e5',
              timeOfDay: 'morning',
              startDate: today,
              schedule: { type: 'daily', anchorDate: today },
              tracking: { type: 'binary', target: 1, unit: 'completion', anyAmountCounts: true },
              reminderTime: null,
              lifecycleState: 'active',
              lifecycleHistory: [],
              revisions: [],
              sourceTemplateId: null,
              order: 0,
              createdAt: timestamp,
              updatedAt: timestamp,
            },
            {
              id: 'habit-measured-label',
              name: 'Measured progress with a long custom unit label',
              description: '',
              category: 'Health',
              icon: '↗',
              colour: '#0f766e',
              timeOfDay: 'anytime',
              startDate: today,
              schedule: { type: 'daily', anchorDate: today },
              tracking: {
                type: 'custom',
                target: 12.5,
                stretchTarget: 20,
                unit: 'mindful repetitions',
                anyAmountCounts: false,
              },
              reminderTime: null,
              lifecycleState: 'active',
              lifecycleHistory: [],
              revisions: [],
              sourceTemplateId: null,
              order: 1,
              createdAt: timestamp,
              updatedAt: timestamp,
            },
          ],
          logs: [],
          preferences: {
            weekStartsOn: 1,
            completedPlacement: 'bottom',
            showHabitNamesInNotifications: false,
            timeGroupOrder: ['morning', 'afternoon', 'evening', 'anytime'],
            weeklyReviewDismissals: {},
          },
          onboarding: { completed: true, dismissedAt: null },
          legacy: {
            detectedKeys: [],
            scannedAt: null,
            quarantinedRecords: [],
            migrationRecords: [],
          },
          operation: null,
          updatedAt: timestamp,
        })
      );
    });
    const zoomPage = await zoomContext.newPage();
    await zoomPage.goto(origin, { waitUntil: 'networkidle' });
    await inspectPage(zoomPage, 'zoom-200-forced-colours', 'populated-today');
    await zoomPage.getByRole('button', { name: 'More' }).first().click();
    await inspectPage(zoomPage, 'zoom-200-forced-colours', 'expanded-long-actions');
    for (const destination of ['Habits', 'Insights', 'Settings']) {
      await zoomPage.getByRole('button', { name: destination, exact: true }).click();
      await inspectPage(
        zoomPage,
        'zoom-200-forced-colours',
        `populated-${destination.toLowerCase()}`
      );
    }
    await zoomContext.close();

    const dailyWorkflowContext = await browser.newContext({
      viewport: { width: 390, height: 844 },
      serviceWorkers: 'block',
    });
    await dailyWorkflowContext.addInitScript(() => {
      const now = new Date();
      const today = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(
        now.getDate()
      ).padStart(2, '0')}`;
      const timestamp = now.toISOString();
      const habit = (id, name, tracking, order, schedule = null) => ({
        id,
        name,
        description: '',
        category: 'Browser fixtures',
        icon: '✓',
        colour: '#4f46e5',
        timeOfDay: 'anytime',
        startDate: today,
        schedule: schedule || { type: 'daily', anchorDate: today },
        tracking,
        reminderTime: null,
        lifecycleState: 'active',
        lifecycleHistory: [],
        revisions: [],
        sourceTemplateId: null,
        order,
        createdAt: timestamp,
        updatedAt: timestamp,
      });
      localStorage.setItem(
        'lifestreak-habit-tracker-v1',
        JSON.stringify({
          version: 1,
          habits: [
            habit(
              'habit-browser-binary',
              'Binary browser workflow',
              { type: 'binary', target: 1, unit: 'completion', anyAmountCounts: true },
              0
            ),
            habit(
              'habit-browser-count',
              'Quantitative browser workflow',
              {
                type: 'count',
                target: 10,
                stretchTarget: null,
                unit: 'reps',
                anyAmountCounts: false,
              },
              1
            ),
            habit(
              'habit-browser-flexible',
              'Flexible weekly browser workflow',
              { type: 'binary', target: 1, unit: 'completion', anyAmountCounts: true },
              2,
              { type: 'timesPerWeek', timesPerWeek: 2, anchorDate: today }
            ),
          ],
          logs: [],
          preferences: {
            weekStartsOn: 1,
            completedPlacement: 'bottom',
            showHabitNamesInNotifications: false,
            timeGroupOrder: ['morning', 'afternoon', 'evening', 'anytime'],
            weeklyReviewDismissals: {},
          },
          onboarding: { completed: true, dismissedAt: null },
          legacy: {
            detectedKeys: [],
            scannedAt: null,
            quarantinedRecords: [],
            migrationRecords: [],
          },
          operation: null,
          updatedAt: timestamp,
        })
      );
    });
    const dailyWorkflowPage = await dailyWorkflowContext.newPage();
    await dailyWorkflowPage.goto(origin, { waitUntil: 'networkidle' });
    const nextDay = dailyWorkflowPage.getByRole('button', { name: 'Next day' });
    assert(await nextDay.isDisabled(), 'Today allowed navigation into a future date.');
    await dailyWorkflowPage.getByRole('button', { name: 'Previous day' }).click();
    assert(
      !(await nextDay.isDisabled()),
      'A historical date did not allow navigation toward today.'
    );
    await dailyWorkflowPage.getByRole('button', { name: 'Return to today' }).click();
    assert(await nextDay.isDisabled(), 'Returning to today did not restore the future safeguard.');
    const binaryCard = dailyWorkflowPage
      .locator('article.habit-today-card')
      .filter({ hasText: 'Binary browser workflow' });
    await binaryCard.getByRole('button', { name: 'Complete', exact: true }).click();
    await binaryCard.getByText('Completed', { exact: true }).waitFor();
    await dailyWorkflowPage.getByRole('button', { name: 'Undo' }).click();
    await binaryCard.getByText('Due', { exact: true }).waitFor();
    await binaryCard.getByRole('button', { name: 'More' }).click();
    await binaryCard.getByRole('button', { name: 'Skip intentionally' }).click();
    await binaryCard.getByText('Intentionally skipped', { exact: true }).waitFor();

    const flexibleCard = dailyWorkflowPage
      .locator('article.habit-today-card')
      .filter({ hasText: 'Flexible weekly browser workflow' });
    await flexibleCard
      .getByText(/0 of 2 this week · 2 remaining across \d+ available days?/)
      .waitFor();
    await flexibleCard.getByRole('button', { name: 'Complete', exact: true }).click();
    await flexibleCard
      .getByText(/1 of 2 this week · 1 remaining across \d+ available days?/)
      .waitFor();

    const quantitativeCard = dailyWorkflowPage
      .locator('article.habit-today-card')
      .filter({ hasText: 'Quantitative browser workflow' });
    const valueInput = quantitativeCard.getByRole('spinbutton', {
      name: 'Add reps for Quantitative browser workflow',
    });
    await valueInput.fill('4.5');
    await quantitativeCard.getByRole('button', { name: 'Add', exact: true }).click();
    await quantitativeCard.getByText('Partially completed', { exact: true }).waitFor();
    await valueInput.fill('6');
    await quantitativeCard.getByRole('button', { name: 'Add', exact: true }).click();
    await quantitativeCard.getByText('Completed', { exact: true }).waitFor();
    assert(
      (await quantitativeCard.locator('.habit-value-summary strong').textContent())?.trim() ===
        '10.5 reps',
      'Today did not aggregate quantitative source entries deterministically.'
    );
    await inspectPage(dailyWorkflowPage, 'phone', 'mixed-daily-results');

    await dailyWorkflowPage.getByRole('button', { name: 'Habits', exact: true }).click();
    const managedQuantitative = dailyWorkflowPage
      .locator('article.habit-management-card')
      .filter({ hasText: 'Quantitative browser workflow' });
    await managedQuantitative.getByRole('button', { name: 'History' }).click();
    const historyDialog = dailyWorkflowPage.getByRole('dialog', {
      name: 'Quantitative browser workflow',
    });
    const entries = historyDialog.locator('.habit-entry-list li');
    await entries.first().getByRole('button', { name: 'Correct' }).click();
    await entries.first().getByRole('spinbutton', { name: 'Correct value in reps' }).fill('5');
    await entries.first().getByRole('button', { name: 'Save correction' }).click();
    dailyWorkflowPage.once('dialog', (browserDialog) => browserDialog.accept());
    await entries.nth(1).getByRole('button', { name: 'Remove' }).click();
    await entries.nth(1).waitFor({ state: 'detached' });
    await historyDialog.getByRole('button', { name: 'Close dialog' }).click();

    await dailyWorkflowPage.getByRole('button', { name: 'Today', exact: true }).click();
    await quantitativeCard.getByText('Partially completed', { exact: true }).waitFor();
    assert(
      (await quantitativeCard.locator('.habit-value-summary strong').textContent())?.trim() ===
        '5 reps',
      'Today did not reflect corrected and removed source entries.'
    );
    await dailyWorkflowPage.getByRole('button', { name: 'Insights', exact: true }).click();
    await dailyWorkflowPage
      .getByRole('combobox', { name: 'Habit' })
      .selectOption('habit-browser-count');
    const loggedMetric = dailyWorkflowPage.locator('article').filter({ hasText: 'Logged reps' });
    await loggedMetric.getByText('5', { exact: true }).waitFor();
    await inspectPage(dailyWorkflowPage, 'phone', 'corrected-quantitative-insights');
    await dailyWorkflowContext.close();

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
              {
                id: 3,
                title: 'Invalid date fixture',
                type: 'book',
                totalUnits: 10,
                completedUnits: 10,
                unitLabel: 'chapters',
                startedDate: '2026-02-30',
                notes: 'preserved',
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
    const dashboardProgressValue = await dashboardProgress.getAttribute('aria-valuenow');
    assert(
      dashboardProgressValue === '70',
      `Reading dashboard did not average only valid persisted item percentages (${dashboardProgressValue}).`
    );
    await readingPage.goto(`${origin}/reading?legacy=1`, { waitUntil: 'networkidle' });
    await readingPage.getByText(/1 invalid or duplicate reading record is preserved/).waitFor();
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

    const serviceContext = await browser.newContext({
      viewport: { width: 390, height: 844 },
      serviceWorkers: 'block',
    });
    await serviceContext.addInitScript(() => {
      const localKey = (date) =>
        `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(
          date.getDate()
        ).padStart(2, '0')}`;
      const now = new Date();
      const tomorrow = new Date(now);
      tomorrow.setDate(tomorrow.getDate() + 1);
      localStorage.setItem(
        'ls-service-storage',
        JSON.stringify({
          state: {
            entries: [
              { id: 1, date: localKey(now), hours: 2, type: 'field', notes: '' },
              { id: 2, date: localKey(tomorrow), hours: 20, type: 'field', notes: '' },
              { id: 3, date: '2026-02-30', hours: 30, type: 'field', notes: 'preserved' },
            ],
            quarantinedEntries: [],
            weeklyGoal: 4,
            monthlyGoal: 16,
          },
          version: 1,
        })
      );
    });
    const servicePage = await serviceContext.newPage();
    await servicePage.goto(`${origin}/service?legacy=1`, { waitUntil: 'networkidle' });
    await servicePage.getByText(/1 invalid or duplicate service record is preserved/).waitFor();
    await servicePage.getByText(/1 future-dated entry is preserved/).waitFor();
    const weeklyServiceTotal = await servicePage
      .locator('.card')
      .filter({ hasText: 'This Week' })
      .locator('.text-2xl')
      .textContent();
    const monthlyServiceTotal = await servicePage
      .locator('.card')
      .filter({ hasText: 'This Month' })
      .locator('.text-2xl')
      .textContent();
    assert(
      weeklyServiceTotal === '2.0h' && monthlyServiceTotal === '2.0h',
      `Service totals included a future-dated or quarantined record (${weeklyServiceTotal}, ${monthlyServiceTotal}).`
    );
    await serviceContext.close();

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
    const beforeInterruptedImport = await backupPage.evaluate(() => {
      const keys = [
        'lifestreak-habit-tracker-v1',
        'ls-progress-storage',
        'ls-progress-settings',
        'ls-gamification-storage',
        'ls-goals-storage',
        'ls-memories-storage',
        'ls-service-storage',
        'ls-reading-storage',
      ];
      const habitDatabase = JSON.parse(localStorage.getItem('lifestreak-habit-tracker-v1'));
      habitDatabase.preferences.weekStartsOn = 0;
      localStorage.setItem('lifestreak-habit-tracker-v1', JSON.stringify(habitDatabase));
      localStorage.setItem(
        'ls-service-storage',
        JSON.stringify({ state: { entries: [], weeklyGoal: 99, monthlyGoal: 199 }, version: 1 })
      );
      const originalSetItem = Storage.prototype.setItem;
      window.__lifestreakImportFailureTriggered = false;
      Storage.prototype.setItem = function setItemWithInterruptedImport(key, value) {
        if (key === 'ls-service-storage' && !window.__lifestreakImportFailureTriggered) {
          window.__lifestreakImportFailureTriggered = true;
          throw new DOMException('Controlled interrupted portable import', 'QuotaExceededError');
        }
        return originalSetItem.call(this, key, value);
      };
      return Object.fromEntries(keys.map((key) => [key, localStorage.getItem(key)]));
    });
    await backupPage.getByLabel('Import LifeStreak JSON').setInputFiles(backupPath);
    await backupPage
      .getByRole('heading', { name: 'Replace with validated complete backup?' })
      .waitFor();
    await backupPage.getByRole('button', { name: 'Restore complete backup' }).click();
    await backupPage.getByText(/Import failed and every original store was restored/).waitFor();
    const afterInterruptedImport = await backupPage.evaluate(() => {
      const keys = [
        'lifestreak-habit-tracker-v1',
        'ls-progress-storage',
        'ls-progress-settings',
        'ls-gamification-storage',
        'ls-goals-storage',
        'ls-memories-storage',
        'ls-service-storage',
        'ls-reading-storage',
      ];
      return Object.fromEntries(keys.map((key) => [key, localStorage.getItem(key)]));
    });
    assert(
      JSON.stringify(afterInterruptedImport) === JSON.stringify(beforeInterruptedImport),
      'Interrupted portable import did not restore every original store byte-for-byte.'
    );
    await backupPage.getByRole('button', { name: 'Cancel import' }).click();
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

    const storageFailureContext = await browser.newContext({
      viewport: { width: 390, height: 844 },
      serviceWorkers: 'block',
    });
    const storageFailurePage = await storageFailureContext.newPage();
    await storageFailurePage.goto(origin, { waitUntil: 'networkidle' });
    await storageFailurePage.getByRole('button', { name: 'Create my own' }).click();
    const beforeFailedCreate = await storageFailurePage.evaluate(() =>
      localStorage.getItem('lifestreak-habit-tracker-v1')
    );
    await storageFailurePage.evaluate(() => {
      const originalSetItem = Storage.prototype.setItem;
      window.__lifestreakStorageFailure = true;
      Storage.prototype.setItem = function setItemWithControlledFailure(key, value) {
        if (window.__lifestreakStorageFailure && key === 'lifestreak-habit-tracker-v1') {
          throw new DOMException('Controlled browser quota exhaustion', 'QuotaExceededError');
        }
        return originalSetItem.call(this, key, value);
      };
    });
    await storageFailurePage.getByLabel(/Name/).fill('Quota recovery fixture');
    await storageFailurePage.getByRole('button', { name: 'Create habit' }).click();
    await storageFailurePage
      .getByRole('alert')
      .getByText('The habit was not saved. Review the message above and try again.')
      .waitFor();
    const failedCreateDialog = storageFailurePage.getByRole('dialog', { name: 'Create a habit' });
    await failedCreateDialog.getByRole('button', { name: 'Retry save' }).waitFor();
    const afterFailedCreate = await storageFailurePage.evaluate(() =>
      localStorage.getItem('lifestreak-habit-tracker-v1')
    );
    assert(
      afterFailedCreate === beforeFailedCreate,
      'A browser storage failure published a partial habit database.'
    );
    await storageFailurePage.evaluate(() => {
      window.__lifestreakStorageFailure = false;
    });
    await failedCreateDialog.getByRole('button', { name: 'Retry save' }).click();
    await storageFailurePage.getByRole('dialog', { name: 'Quota recovery fixture' }).waitFor();
    const recoveredDatabase = await storageFailurePage.evaluate(() =>
      JSON.parse(localStorage.getItem('lifestreak-habit-tracker-v1'))
    );
    assert(
      recoveredDatabase.habits.filter(({ name }) => name === 'Quota recovery fixture').length === 1,
      'Browser storage recovery did not persist the exact failed create once.'
    );
    await storageFailurePage
      .getByRole('dialog', { name: 'Quota recovery fixture' })
      .getByRole('button', { name: 'Close dialog' })
      .click();
    await inspectPage(storageFailurePage, 'phone', 'storage-failure-recovered');
    await storageFailureContext.close();

    const blockedStorageContext = await browser.newContext({
      viewport: { width: 390, height: 844 },
      serviceWorkers: 'block',
    });
    await blockedStorageContext.addInitScript(() => {
      const availableStorage = window.localStorage;
      window.__lifestreakStorageBlocked = window.name !== 'lifestreak-storage-recovered';
      Object.defineProperty(window, 'localStorage', {
        configurable: true,
        get() {
          if (window.__lifestreakStorageBlocked) {
            throw new DOMException('Blocked by browser privacy mode', 'SecurityError');
          }
          return availableStorage;
        },
      });
    });
    const blockedStoragePage = await blockedStorageContext.newPage();
    await blockedStoragePage.goto(origin, { waitUntil: 'networkidle' });
    await blockedStoragePage
      .getByText(/Habit storage is unavailable.*leave private browsing, then retry/)
      .waitFor();
    assert(
      (await blockedStoragePage.getByRole('button', { name: 'Dismiss message' }).count()) === 0,
      'A startup storage-denial warning could be dismissed without recovery.'
    );
    await inspectPage(blockedStoragePage, 'phone', 'storage-access-blocked');
    await blockedStoragePage.evaluate(() => {
      window.name = 'lifestreak-storage-recovered';
      window.__lifestreakStorageBlocked = false;
    });
    await blockedStoragePage.getByRole('button', { name: 'Retry after enabling storage' }).click();
    await blockedStoragePage.getByRole('button', { name: 'Create my own' }).waitFor();
    assert(
      (await blockedStoragePage.getByText(/Habit storage is unavailable/).count()) === 0,
      'Storage recovery reload retained the stale blocked state.'
    );
    await blockedStorageContext.close();

    const specialistFailureContext = await browser.newContext({
      viewport: { width: 390, height: 844 },
      serviceWorkers: 'block',
    });
    const specialistFailurePage = await specialistFailureContext.newPage();
    await specialistFailurePage.goto(`${origin}/service?legacy=1`, { waitUntil: 'networkidle' });
    const beforeFailedServiceWrite = await specialistFailurePage.evaluate(() => {
      const key = 'ls-service-storage';
      const before = localStorage.getItem(key);
      const originalSetItem = Storage.prototype.setItem;
      window.__lifestreakSpecialistFailureKey = key;
      Storage.prototype.setItem = function setItemWithSpecialistFailure(storageKey, value) {
        if (storageKey === window.__lifestreakSpecialistFailureKey) {
          throw new DOMException('Controlled specialist quota exhaustion', 'QuotaExceededError');
        }
        return originalSetItem.call(this, storageKey, value);
      };
      return before;
    });
    await specialistFailurePage.getByLabel('Service hours').fill('1.25');
    await specialistFailurePage
      .getByLabel('Service notes (optional)')
      .fill('Service retry fixture');
    await specialistFailurePage.getByRole('button', { name: 'Add Entry' }).click();
    await specialistFailurePage.getByText('LifeStreak could not safely save local data.').waitFor();
    assert(
      (await specialistFailurePage.getByRole('button', { name: 'Dismiss' }).count()) === 0,
      'A failed specialist write could be dismissed before recovery.'
    );
    assert(
      (await specialistFailurePage.evaluate(() => localStorage.getItem('ls-service-storage'))) ===
        beforeFailedServiceWrite,
      'A failed service write changed persistent data.'
    );
    await specialistFailurePage.evaluate(() => {
      window.__lifestreakSpecialistFailureKey = null;
    });
    await specialistFailurePage.getByRole('button', { name: 'Retry save' }).click();
    await specialistFailurePage.getByText('LifeStreak could not safely save local data.').waitFor({
      state: 'detached',
    });
    await specialistFailurePage.reload({ waitUntil: 'networkidle' });
    await specialistFailurePage.getByText('Service retry fixture').waitFor();
    const recoveredServiceEntries = await specialistFailurePage.evaluate(
      () =>
        JSON.parse(localStorage.getItem('ls-service-storage')).state.entries.filter(
          ({ notes }) => notes === 'Service retry fixture'
        ).length
    );
    assert(recoveredServiceEntries === 1, 'Service Retry did not persist exactly one entry.');

    await specialistFailurePage.goto(`${origin}/reading?legacy=1`, { waitUntil: 'networkidle' });
    const beforeFailedReadingWrite = await specialistFailurePage.evaluate(() => {
      const key = 'ls-reading-storage';
      const before = localStorage.getItem(key);
      const originalSetItem = Storage.prototype.setItem;
      window.__lifestreakSpecialistFailureKey = key;
      Storage.prototype.setItem = function setItemWithSpecialistFailure(storageKey, value) {
        if (storageKey === window.__lifestreakSpecialistFailureKey) {
          throw new DOMException('Controlled specialist quota exhaustion', 'QuotaExceededError');
        }
        return originalSetItem.call(this, storageKey, value);
      };
      return before;
    });
    await specialistFailurePage.getByLabel('Reading title').fill('Reading retry fixture');
    await specialistFailurePage.getByLabel('Total reading units').fill('12');
    await specialistFailurePage.getByRole('button', { name: 'Add', exact: true }).click();
    await specialistFailurePage.getByText('LifeStreak could not safely save local data.').waitFor();
    assert(
      (await specialistFailurePage.evaluate(() => localStorage.getItem('ls-reading-storage'))) ===
        beforeFailedReadingWrite,
      'A failed reading write changed persistent data.'
    );
    await specialistFailurePage.evaluate(() => {
      window.__lifestreakSpecialistFailureKey = null;
    });
    await specialistFailurePage.getByRole('button', { name: 'Retry save' }).click();
    await specialistFailurePage.getByText('LifeStreak could not safely save local data.').waitFor({
      state: 'detached',
    });
    await specialistFailurePage.reload({ waitUntil: 'networkidle' });
    await specialistFailurePage.getByText('Reading retry fixture').waitFor();
    const recoveredReadingItems = await specialistFailurePage.evaluate(
      () =>
        JSON.parse(localStorage.getItem('ls-reading-storage')).state.items.filter(
          ({ title }) => title === 'Reading retry fixture'
        ).length
    );
    assert(recoveredReadingItems === 1, 'Reading Retry did not persist exactly one item.');
    await inspectPage(specialistFailurePage, 'phone', 'specialist-storage-recovered');
    await specialistFailureContext.close();

    const capacityContext = await browser.newContext({
      viewport: { width: 390, height: 844 },
      serviceWorkers: 'block',
    });
    const capacityPage = await capacityContext.newPage();
    await capacityPage.goto(`${origin}/service?legacy=1`, { waitUntil: 'networkidle' });
    const capacitySetup = await capacityPage.evaluate(() => {
      const serviceKey = 'ls-service-storage';
      const fillerPrefix = 'lifestreak-capacity-fixture-';
      const before = localStorage.getItem(serviceKey);
      let nextKey = 0;
      let quotaFailures = 0;
      for (const chunkSize of [262144, 65536, 16384, 4096, 1024, 256, 64, 16]) {
        while (nextKey < 512) {
          try {
            localStorage.setItem(`${fillerPrefix}${nextKey}`, 'x'.repeat(chunkSize));
            nextKey += 1;
          } catch (error) {
            if (error instanceof DOMException && error.name === 'QuotaExceededError') {
              quotaFailures += 1;
              break;
            }
            throw error;
          }
        }
      }
      return { before, fillerPrefix, quotaFailures };
    });
    assert(
      capacitySetup.quotaFailures > 0,
      'The real Chromium localStorage quota was not reached.'
    );
    await capacityPage.getByLabel('Service hours').fill('2.5');
    await capacityPage.getByLabel('Service notes (optional)').fill('Real capacity retry fixture');
    await capacityPage.getByRole('button', { name: 'Add Entry' }).click();
    await capacityPage.getByText('LifeStreak could not safely save local data.').waitFor();
    assert(
      (await capacityPage.evaluate(() => localStorage.getItem('ls-service-storage'))) ===
        capacitySetup.before,
      'Actual quota exhaustion changed the service database.'
    );
    await capacityPage.evaluate((fillerPrefix) => {
      Object.keys(localStorage)
        .filter((key) => key.startsWith(fillerPrefix))
        .forEach((key) => localStorage.removeItem(key));
    }, capacitySetup.fillerPrefix);
    await capacityPage.getByRole('button', { name: 'Retry save' }).click();
    await capacityPage.getByText('LifeStreak could not safely save local data.').waitFor({
      state: 'detached',
    });
    await capacityPage.reload({ waitUntil: 'networkidle' });
    await capacityPage.getByText('Real capacity retry fixture').waitFor();
    const recoveredCapacityEntries = await capacityPage.evaluate(
      () =>
        JSON.parse(localStorage.getItem('ls-service-storage')).state.entries.filter(
          ({ notes }) => notes === 'Real capacity retry fixture'
        ).length
    );
    assert(
      recoveredCapacityEntries === 1,
      'Actual-capacity Retry did not persist exactly one service entry.'
    );
    await capacityContext.close();

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

    const pwaUpgradeContext = await browser.newContext({
      viewport: { width: 390, height: 844 },
    });
    await pwaUpgradeContext.addInitScript(() => {
      if (localStorage.getItem('jw-progress-storage') === null) {
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
      }
    });
    const pwaUpgradePage = await pwaUpgradeContext.newPage();
    await pwaUpgradePage.goto(origin, { waitUntil: 'networkidle' });
    await pwaUpgradePage.evaluate(() => navigator.serviceWorker.ready);
    if (!(await pwaUpgradePage.evaluate(() => Boolean(navigator.serviceWorker.controller)))) {
      await pwaUpgradePage.reload({ waitUntil: 'networkidle' });
    }
    assert(
      await pwaUpgradePage.evaluate(() => Boolean(navigator.serviceWorker.controller)),
      'Historical upgrade fixture was not running under the production service worker.'
    );
    await pwaUpgradePage.getByRole('button', { name: 'Settings', exact: true }).click();
    await pwaUpgradePage.getByRole('button', { name: 'Scan for preserved stores' }).click();
    await pwaUpgradePage.getByRole('button', { name: 'Preserve and migrate' }).click();
    await pwaUpgradePage.getByLabel('Daily Text').check();
    await pwaUpgradePage.getByRole('button', { name: 'Map selected completion history' }).click();
    const preReloadUpgradeState = await pwaUpgradePage.evaluate(() => ({
      source: localStorage.getItem('jw-progress-storage'),
      habitDatabase: localStorage.getItem('lifestreak-habit-tracker-v1'),
    }));
    await pwaUpgradePage.reload({ waitUntil: 'networkidle' });
    const reloadedUpgradeState = await pwaUpgradePage.evaluate(() => ({
      source: localStorage.getItem('jw-progress-storage'),
      successor: localStorage.getItem('ls-progress-storage'),
      habitDatabase: localStorage.getItem('lifestreak-habit-tracker-v1'),
      recoveryRawValues: Array.from({ length: localStorage.length }, (_, index) =>
        localStorage.key(index)
      )
        .filter((key) => key?.startsWith('lifestreak-legacy-backup-jw-progress-storage-'))
        .map((key) => JSON.parse(localStorage.getItem(key)).rawValue),
    }));
    assert(
      reloadedUpgradeState.source === preReloadUpgradeState.source &&
        reloadedUpgradeState.recoveryRawValues.length === 1 &&
        reloadedUpgradeState.recoveryRawValues[0] === preReloadUpgradeState.source,
      'A production PWA reload changed the byte-exact historical source or recovery copy.'
    );
    const upgradedSuccessor = JSON.parse(reloadedUpgradeState.successor);
    assert(
      upgradedSuccessor.version === 2 &&
        upgradedSuccessor.state.dailyTexts['2024-02-29']?.readScripture === true,
      'The live successor did not upgrade to v2 while preserving the historical completion.'
    );
    const reloadedHabitDatabase = JSON.parse(reloadedUpgradeState.habitDatabase);
    assert(
      reloadedUpgradeState.habitDatabase === preReloadUpgradeState.habitDatabase &&
        reloadedHabitDatabase.habits.filter(
          (habit) => habit.sourceTemplateId === 'legacy:ls-progress-storage:daily-text'
        ).length === 1 &&
        reloadedHabitDatabase.logs.filter(
          (log) => log.date === '2024-02-29' && log.explicitStatus === 'completed'
        ).length === 1,
      'A production PWA reload duplicated or changed the mapped habit history.'
    );
    await pwaUpgradeContext.close();

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

    console.log(
      `LifeStreak UI contract verified across ${viewports.length} responsive viewports plus populated 200%-equivalent forced-colour coverage.`
    );
  } finally {
    await browser?.close();
    server?.kill('SIGTERM');
  }
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
