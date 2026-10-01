import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { countToolCall, resetRunState } from '../scripts/lib/run-state.mjs';
import { compareRuns, formatComparison } from '../scripts/compare.mjs';
import { offer } from './helpers.mjs';

test('Suchzähler sperrt ab der Obergrenze', () => {
  const file = join(mkdtempSync(join(tmpdir(), 'guard-')), 'state.json');
  resetRunState(file);
  const limits = { maxSearches: 3, maxFetches: 1 };
  for (let i = 0; i < 3; i++) assert.equal(countToolCall('WebSearch', limits, file).allowed, true);
  const blocked = countToolCall('WebSearch', limits, file);
  assert.equal(blocked.allowed, false);
  assert.equal(blocked.state.searches, 3);
  assert.equal(countToolCall('WebFetch', limits, file).allowed, true);
  assert.equal(countToolCall('WebFetch', limits, file).allowed, false);
  assert.equal(countToolCall('Read', limits, file).allowed, true);
});

test('Modellvergleich findet fehlende und abweichende Angebote', () => {
  const a = { model: 'sonnet', offers: [offer(), offer({ cabin: 'business' })], searchesUsed: 10 };
  const b = { model: 'haiku', offers: [offer({ miles: 50000 })], searchesUsed: 20 };
  const c = compareRuns(a, b);
  assert.equal(c.onlyA.length, 1);
  assert.equal(c.onlyB.length, 0);
  assert.deepEqual(c.diffs.map((d) => d.field), ['Meilen']);
  assert.match(formatComparison(c), /Modellvergleich: sonnet vs. haiku/);
});
