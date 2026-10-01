// Täglicher Lauf ohne KI: abgelaufene Angebote entfernen und Laufdatum vermerken.
// Danach baut scripts/build.mjs die Seite neu.

import { PATHS, readJson, writeJson } from './lib/io.mjs';
import { todayIn } from './lib/dates.mjs';
import { pruneExpired } from './lib/merge.mjs';

const KEEP_EXPIRED = 300;

const config = readJson(PATHS.config);
const today = todayIn(config.timezone);
const offersDoc = readJson(PATHS.offers);
const meta = readJson(PATHS.meta, {});

const { kept, expired } = pruneExpired(offersDoc.offers, today);
if (expired.length) {
  const archive = readJson(PATHS.expired, { offers: [] });
  const stamped = expired.map((o) => ({ ...o, removedOn: today }));
  archive.offers = [...stamped, ...archive.offers].slice(0, KEEP_EXPIRED);
  writeJson(PATHS.expired, archive);
  offersDoc.offers = kept;
  writeJson(PATHS.offers, offersDoc);
}

meta.lastDailyRun = { at: new Date().toISOString(), removedExpired: expired.length };
writeJson(PATHS.meta, meta);

console.log(`Täglicher Lauf ${today}: ${expired.length} abgelaufene Angebote entfernt, ${kept.length} verbleiben.`);
for (const o of expired) console.log(`  entfernt: ${o.id} (buchbar bis ${o.bookingPeriod.to})`);
