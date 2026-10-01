import { test } from 'node:test';
import assert from 'node:assert/strict';
import { valuePerMile } from '../scripts/lib/value.mjs';
import { relevance } from '../scripts/lib/relevance.mjs';
import { config, offer, TODAY } from './helpers.mjs';

test('Wert pro Meile = (Barpreis − Zuzahlung) / Meilen', () => {
  const v = valuePerMile(offer(), config);
  assert.equal(v.value, Math.round(((900 - 300) / 42000) * 10000) / 10000);
  assert.equal(v.approx, true);
  assert.equal(v.implausible, false);
});

test('fehlender Barpreis → unbekannt, keine Schätzung', () => {
  const v = valuePerMile(offer({ cashPrice: null }), config);
  assert.equal(v.value, null);
  assert.match(v.reason, /Barpreis/);
});

test('fehlende Zuzahlung → unbekannt', () => {
  assert.equal(valuePerMile(offer({ copay: null }), config).value, null);
});

test('Barpreis für andere Reiseart oder Klasse → unbekannt', () => {
  const o = offer();
  o.cashPrice = { ...o.cashPrice, tripType: 'oneway' };
  assert.equal(valuePerMile(o, config).value, null);
  const o2 = offer();
  o2.cashPrice = { ...o2.cashPrice, cabin: 'business' };
  assert.equal(valuePerMile(o2, config).value, null);
});

test('fremde Währung → unbekannt', () => {
  const o = offer();
  o.cashPrice = { ...o.cashPrice, currency: 'USD' };
  assert.equal(valuePerMile(o, config).value, null);
});

test('Werte über 0,15 €/Meile werden markiert', () => {
  const o = offer({ miles: 10000 });
  o.cashPrice = { ...o.cashPrice, amount: 2000 };
  const v = valuePerMile(o, config);
  assert.equal(v.value, 0.17);
  assert.equal(v.implausible, true);
});

test('Relevanz liegt immer zwischen 1 und 5', () => {
  for (const miles of [1000, 20000, 60000, 300000]) {
    const o = offer({ miles });
    const r = relevance(o, valuePerMile(o, config), TODAY, config);
    assert.ok(r.score >= 1 && r.score <= 5, `Score ${r.score}`);
  }
});

test('Relevanz: hoher Wert, niedrige Zuzahlung, lange Restlaufzeit → 5', () => {
  const o = offer({ miles: 20000 });
  o.copay = { ...o.copay, amount: 20 };
  o.cashPrice = { ...o.cashPrice, amount: 1500 };
  const r = relevance(o, valuePerMile(o, config), TODAY, config);
  assert.equal(r.score, 5);
});

test('Relevanz: unbekannter Wert und letzter Buchungstag → niedrig', () => {
  const o = offer({ cashPrice: null, bookingPeriod: { from: '2026-10-01', to: TODAY } });
  o.copay = { ...o.copay, amount: 800 };
  const r = relevance(o, valuePerMile(o, config), TODAY, config);
  assert.equal(r.parts.remainingDays, 1);
  assert.ok(r.score <= 2);
});
