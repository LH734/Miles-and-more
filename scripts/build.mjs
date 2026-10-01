// Baut die statische Seite nach _site/ (wird von GitHub Pages veröffentlicht).

import { cpSync, rmSync, mkdirSync } from 'node:fs';
import { join } from 'node:path';
import { PATHS, readJson, writeJson } from './lib/io.mjs';
import { todayIn } from './lib/dates.mjs';
import { buildSiteData } from './lib/enrich.mjs';

const config = readJson(PATHS.config);
const today = todayIn(config.timezone);

const data = buildSiteData({
  offers: readJson(PATHS.offers).offers,
  sources: readJson(PATHS.sources).sources,
  meta: readJson(PATHS.meta, {}),
  awardChart: readJson(PATHS.awardChart, null),
  config,
  today,
  builtAt: new Date().toISOString(),
});

rmSync(PATHS.out, { recursive: true, force: true });
mkdirSync(PATHS.out, { recursive: true });
cpSync(PATHS.site, PATHS.out, { recursive: true });
writeJson(join(PATHS.out, 'data.json'), data);

console.log(`Seite gebaut: ${data.offers.length} buchbare Angebote` +
  `${data.hiddenInvalid ? `, ${data.hiddenInvalid} ungültige ausgeblendet` : ''} → _site/`);
