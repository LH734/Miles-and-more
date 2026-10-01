// Start eines KI-Laufs: setzt die Zähler zurück und gibt den aktuellen Bestand kompakt aus,
// damit nur neue oder geänderte Angebote recherchiert werden müssen.

import { PATHS, readJson } from './lib/io.mjs';
import { todayIn, daysBetween } from './lib/dates.mjs';
import { resetRunState } from './lib/run-state.mjs';

const config = readJson(PATHS.config);
const today = todayIn(config.timezone);
resetRunState();

const { offers } = readJson(PATHS.offers);
const { sources } = readJson(PATHS.sources);
const maxAge = config.ai.priceMaxAgeDays;

console.log(`KI-Lauf gestartet am ${today}. Grenzen: ${process.env.MAX_SEARCHES ?? config.ai.maxSearchesPerRun} Websuchen, ` +
  `${process.env.MAX_FETCHES ?? config.ai.maxFetchesPerRun} Seitenabrufe.`);
console.log('\nQuellen:');
for (const s of sources) {
  const robotsDue = !s.robots?.checkedAt || daysBetween(s.robots.checkedAt, today) >= config.ai.robotsRecheckDays;
  console.log(`- ${s.id} [${s.type}] ${s.url}`);
  console.log(`    Status: ${s.status}, letzter Erfolg: ${s.lastSuccess ?? 'nie'}, robots.txt: ` +
    `${s.robots?.allowed === null || s.robots?.allowed === undefined ? 'ungeprüft' : s.robots.allowed ? 'erlaubt' : 'NICHT erlaubt'}` +
    `${robotsDue ? ' → robots.txt jetzt prüfen' : ''}`);
}

console.log(`\nBestand: ${offers.length} Angebote. Barpreis neu recherchieren nur, wenn fehlend oder älter als ${maxAge} Tage:`);
for (const o of offers) {
  const age = o.cashPrice?.retrievedAt ? daysBetween(o.cashPrice.retrievedAt, today) : null;
  const priceDue = age === null || age > maxAge;
  console.log(`- ${o.id} | ${o.miles} Meilen | Buchbar bis ${o.bookingPeriod?.to ?? 'offen'} | ` +
    `Barpreis: ${o.cashPrice ? `${o.cashPrice.amount} ${o.cashPrice.currency} vom ${o.cashPrice.retrievedAt}` : 'fehlt'}` +
    `${priceDue ? ' → Preis recherchieren' : ''}`);
}
