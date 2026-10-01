import { readFileSync, writeFileSync, existsSync, mkdirSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

export const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..', '..');

export const PATHS = {
  config: join(ROOT, 'config', 'settings.json'),
  offers: join(ROOT, 'data', 'offers.json'),
  sources: join(ROOT, 'data', 'sources.json'),
  meta: join(ROOT, 'data', 'meta.json'),
  awardChart: join(ROOT, 'data', 'award-chart.json'),
  expired: join(ROOT, 'data', 'expired.json'),
  lastRunReport: join(ROOT, 'data', 'last-ai-run.json'),
  site: join(ROOT, 'site'),
  out: join(ROOT, '_site'),
  runState: join(ROOT, '.ai-run', 'state.json'),
};

export function readJson(path, fallback) {
  if (!existsSync(path)) {
    if (fallback !== undefined) return structuredClone(fallback);
    throw new Error(`Datei fehlt: ${path}`);
  }
  return JSON.parse(readFileSync(path, 'utf8'));
}

export function writeJson(path, data) {
  mkdirSync(dirname(path), { recursive: true });
  writeFileSync(path, JSON.stringify(data, null, 2) + '\n');
}
