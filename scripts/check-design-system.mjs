import { readdir, readFile } from 'node:fs/promises';
import path from 'node:path';

const SOURCE_ROOT = path.resolve('src');
const SOURCE_EXTENSIONS = new Set(['.js', '.jsx', '.ts', '.tsx', '.css']);
const ROLE_SPECIFIC_UTILITY =
  /\b(?:bg|text|border|from|via|to|shadow)-(?:slate|gray|zinc|red|green|yellow|blue|orange|amber|emerald|teal|cyan|sky|indigo|violet|purple|fuchsia|pink|rose)-\d{2,3}(?:\/\d+)?\b/g;
const HISTORICAL_THEME_ALIAS = /(?:--color-jw-|\b(?:bg|text|border)-jw-)/g;

async function sourceFiles(directory) {
  const entries = await readdir(directory, { withFileTypes: true });
  const nested = await Promise.all(
    entries.map(async (entry) => {
      const target = path.join(directory, entry.name);
      if (entry.isDirectory()) return sourceFiles(target);
      return SOURCE_EXTENSIONS.has(path.extname(entry.name)) ? [target] : [];
    })
  );
  return nested.flat();
}

async function main() {
  const violations = [];
  for (const file of await sourceFiles(SOURCE_ROOT)) {
    const source = await readFile(file, 'utf8');
    const lines = source.split('\n');
    lines.forEach((line, index) => {
      const matches = [
        ...(line.match(ROLE_SPECIFIC_UTILITY) || []),
        ...(line.match(HISTORICAL_THEME_ALIAS) || []),
      ];
      if (matches.length) {
        violations.push(
          `${path.relative(process.cwd(), file)}:${index + 1}: ${matches.join(', ')}`
        );
      }
    });
  }

  if (violations.length) {
    throw new Error(
      `Use semantic design-system roles instead of palette-specific UI utilities:\n${violations.join('\n')}`
    );
  }

  console.log('Design-system contract verified: UI roles use semantic tokens.');
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
