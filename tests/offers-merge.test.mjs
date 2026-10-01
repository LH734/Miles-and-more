import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  validateOffer, blogRuleVerdict, isBookable, startsAbroad, offerId,
} from '../scripts/lib/offers.mjs';
import { mergeUpdate, pruneExpired } from '../scripts/lib/merge.mjs';
import { buildSiteData } from '../scripts/lib/enrich.mjs';
import { offer, blogOnly, SOURCES, TODAY, config } from './helpers.mjs';

test('gültiges Angebot hat keine Fehler', () => {
  assert.deepEqual(validateOffer(offer()), []);
});

test('Preis ohne Quelle oder Abrufdatum ist ungültig', () => {
  const o = offer();
  o.cashPrice = { ...o.cashPrice, source: null, retrievedAt: null };
  const errors = validateOffer(o);
  assert.ok(errors.some((e) => e.includes('cashPrice.source.url')));
  assert.ok(errors.some((e) => e.includes('cashPrice.retrievedAt')));
});

test('Datenmodell kennt spätere Kategorien', () => {
  assert.deepEqual(validateOffer(offer({ category: 'hotel', airline: undefined })).filter((e) => e.includes('category')), []);
  assert.ok(validateOffer(offer({ category: 'kreuzfahrt' })).some((e) => e.includes('category')));
});

test('Blog-Regel: nur Blog, unbestätigt, ohne eindeutiges Enddatum → verwerfen', () => {
  const o = blogOnly({ bookingPeriod: { from: '2026-10-01', to: '2026-10-31', toExplicit: false } });
  assert.equal(blogRuleVerdict(o, TODAY).keep, false);
});

test('Blog-Regel: an Primärquelle bestätigt → behalten', () => {
  const o = blogOnly({ verification: { primaryConfirmed: true, primaryUrl: 'https://www.miles-and-more.com/x', checkedAt: '2026-10-01' } });
  assert.equal(blogRuleVerdict(o, TODAY).keep, true);
});

test('Blog-Regel: bestätigt ohne Primär-URL zählt nicht', () => {
  const o = blogOnly({
    verification: { primaryConfirmed: true, checkedAt: '2026-10-01' },
    bookingPeriod: { from: '2026-10-01', to: '2026-10-31', toExplicit: false },
  });
  assert.equal(blogRuleVerdict(o, TODAY).keep, false);
});

test('Blog-Regel: eindeutiges, gültiges Enddatum → behalten; abgelaufenes → verwerfen', () => {
  assert.equal(blogRuleVerdict(blogOnly(), TODAY).keep, true);
  const old = blogOnly({ bookingPeriod: { from: '2026-09-01', to: '2026-09-30', toExplicit: true } });
  assert.equal(blogRuleVerdict(old, TODAY).keep, false);
});

test('Buchungszeitraum: nur laufende Angebote sind buchbar', () => {
  assert.equal(isBookable(offer(), TODAY), true);
  assert.equal(isBookable(offer({ bookingPeriod: { from: '2026-11-01', to: '2026-11-30' } }), TODAY), false);
  assert.equal(isBookable(offer({ bookingPeriod: { from: '2026-09-01', to: '2026-10-09' } }), TODAY), false);
  assert.equal(isBookable(offer({ bookingPeriod: { from: '2026-09-01', to: TODAY } }), TODAY), true);
  assert.equal(isBookable(offer({ bookingPeriod: { from: '2026-09-01', to: null } }), TODAY), true);
});

test('Start im Ausland wird erkannt', () => {
  assert.equal(startsAbroad(offer()), false);
  assert.equal(startsAbroad(offer({ origin: { iata: 'BRU', city: 'Brüssel', country: 'BE' } })), true);
  assert.equal(startsAbroad(offer({ origin: { iata: 'MUC' } })), false);
  assert.equal(startsAbroad(offer({ origin: { iata: 'ZRH' } })), true);
});

test('Zusammenführen: neue Angebote werden übernommen, Blog-Regel und Ablauf greifen', () => {
  const update = {
    runAt: '2026-10-10T08:00:00Z',
    sources: [{ id: 'mm-meilenschnaeppchen', status: 'ok' }, { id: 'blog-reisetopia', status: 'ok' }],
    offers: [
      offer(),
      blogOnly({ destination: { iata: 'CAI', city: 'Kairo', country: 'EG', region: 'Nordafrika' }, bookingPeriod: { from: '2026-10-01', to: '2026-10-31', toExplicit: false } }),
      offer({ destination: { iata: 'LAX', city: 'Los Angeles', country: 'US', region: 'Nordamerika' }, bookingPeriod: { from: '2026-09-01', to: '2026-09-30' } }),
    ],
  };
  const { offers, report } = mergeUpdate({ offers: [], sources: SOURCES }, update, TODAY);
  assert.equal(offers.length, 1);
  assert.equal(report.added.length, 1);
  assert.equal(report.discarded.length, 2);
});

test('Zusammenführen: ausgefallene Quelle behält ihre alten Daten', () => {
  const old = { ...offer(), id: offerId(offer()), lastConfirmed: '2026-09-01' };
  const update = { sources: [{ id: 'mm-meilenschnaeppchen', status: 'error', message: 'Zeitüberschreitung' }], offers: [] };
  const { offers, sources, report } = mergeUpdate({ offers: [old], sources: SOURCES }, update, TODAY);
  assert.deepEqual(offers, [old]);
  assert.equal(report.removed.length, 0);
  const s = sources.find((x) => x.id === 'mm-meilenschnaeppchen');
  assert.equal(s.status, 'error');
  assert.equal(s.lastSuccess, '2026-09-01T00:00:00Z');
});

test('Zusammenführen: Angebote einer fehlerhaften oder unbekannten Quelle werden abgelehnt', () => {
  const update = {
    sources: [{ id: 'mm-meilenschnaeppchen', status: 'error' }, { id: 'blog-erfunden', status: 'ok' }],
    offers: [offer(), offer({ sourceId: 'blog-erfunden' })],
  };
  const { offers, report } = mergeUpdate({ offers: [], sources: SOURCES }, update, TODAY);
  assert.equal(offers.length, 0);
  assert.equal(report.rejected.length, 3);
});

test('Zusammenführen: erfolgreiche Quelle ohne das Angebot → entfernt; Barpreis wird übernommen', () => {
  const a = { ...offer(), id: offerId(offer()) };
  const bOffer = offer({ destination: { iata: 'IAD', city: 'Washington', country: 'US', region: 'Nordamerika' } });
  const b = { ...bOffer, id: offerId(bOffer) };
  const update = {
    sources: [{ id: 'mm-meilenschnaeppchen', status: 'ok' }],
    offers: [offer({ cashPrice: null })],
  };
  const { offers, report } = mergeUpdate({ offers: [a, b], sources: SOURCES }, update, TODAY);
  assert.equal(offers.length, 1);
  assert.deepEqual(report.removed, [b.id]);
  assert.equal(offers[0].cashPrice.amount, 900);
});

test('Täglicher Lauf entfernt nur abgelaufene Angebote', () => {
  const live = offer();
  const gone = offer({ bookingPeriod: { from: '2026-09-01', to: '2026-10-09' } });
  const { kept, expired } = pruneExpired([live, gone], TODAY);
  assert.deepEqual(kept, [live]);
  assert.deepEqual(expired, [gone]);
});

test('Seitendaten: nur buchbare Flüge, mit Wert, Relevanz und Warnhinweis', () => {
  const failing = SOURCES.map((s) => (s.id === 'mm-meilenschnaeppchen' ? { ...s, status: 'error' } : s));
  const data = buildSiteData({
    offers: [
      offer(),
      offer({ bookingPeriod: { from: '2026-11-01', to: '2026-11-30' } }),
      offer({ category: 'hotel' }),
    ],
    sources: failing, meta: {}, awardChart: null, config, today: TODAY, builtAt: 'x',
  });
  assert.equal(data.offers.length, 1);
  const o = data.offers[0];
  assert.ok(o.value.value > 0);
  assert.ok(o.relevance >= 1 && o.relevance <= 5);
  assert.equal(o.remainingDays, 21);
  assert.equal(o.sourceWarning.status, 'error');
});
