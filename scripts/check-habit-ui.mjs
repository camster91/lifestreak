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
