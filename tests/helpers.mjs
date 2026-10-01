import { readJson, PATHS } from '../scripts/lib/io.mjs';

export const config = readJson(PATHS.config);
export const TODAY = '2026-10-10';

// Ein gültiges Beispielangebot; einzelne Felder lassen sich überschreiben.
export function offer(overrides = {}) {
  return {
    category: 'flight',
    offerType: 'meilenschnaeppchen',
    sourceId: 'mm-meilenschnaeppchen',
    airline: { code: 'SN', name: 'Brussels Airlines' },
    origin: { iata: 'FRA', city: 'Frankfurt', country: 'DE' },
    destination: { iata: 'JFK', city: 'New York', country: 'US', countryName: 'USA', region: 'Nordamerika' },
    tripType: 'roundtrip',
    cabin: 'economy',
    miles: 42000,
    copay: { amount: 300, currency: 'EUR', source: { name: 'M&M', url: 'https://example.org/c' }, retrievedAt: '2026-10-01' },
    cashPrice: {
      amount: 900, currency: 'EUR', approx: true, tripType: 'roundtrip', cabin: 'economy',
      source: { name: 'Websuche', url: 'https://example.org/p' }, retrievedAt: '2026-10-01',
    },
    bookingPeriod: { from: '2026-10-01', to: '2026-10-31', toExplicit: true },
    travelPeriod: { from: '2026-11-01', to: '2026-12-15' },
    sources: [{ type: 'primary', name: 'Miles & More', url: 'https://www.miles-and-more.com/x', retrievedAt: '2026-10-01' }],
    verification: { primaryConfirmed: true, primaryUrl: 'https://www.miles-and-more.com/x', checkedAt: '2026-10-01' },
    ...overrides,
  };
}

export const blogOnly = (overrides = {}) => offer({
  sourceId: 'blog-reisetopia',
  sources: [{ type: 'blog', name: 'reisetopia', url: 'https://reisetopia.de/x', retrievedAt: '2026-10-01' }],
  verification: { primaryConfirmed: false },
  ...overrides,
});

export const SOURCES = [
  { id: 'mm-meilenschnaeppchen', name: 'MM', type: 'primary', url: 'https://www.miles-and-more.com/x', status: 'ok', lastSuccess: '2026-09-01T00:00:00Z' },
  { id: 'blog-reisetopia', name: 'reisetopia', type: 'blog', url: 'https://reisetopia.de/x', status: 'ok', lastSuccess: '2026-09-01T00:00:00Z' },
];
