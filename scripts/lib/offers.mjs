// Datenmodell, Prüfung und Regeln für Angebote.
// Die Regeln stecken bewusst hier im Code (nicht in der KI):
//  - nur Angebote mit laufendem Buchungszeitraum
//  - Blog-Angebote nur mit Bestätigung an der Primärquelle oder eindeutigem Enddatum
//  - Quelle ausgefallen → alte Daten bleiben stehen

import { isIsoDate } from './dates.mjs';
import { isGermanAirport } from './airports.mjs';

// Kategorien sind für spätere Erweiterungen vorbereitet; angezeigt werden vorerst nur Flüge.
export const CATEGORIES = ['flight', 'upgrade', 'hotel', 'sachpraemie'];
export const CABINS = ['economy', 'premium_economy', 'business', 'first'];
export const TRIP_TYPES = ['roundtrip', 'oneway'];
export const OFFER_TYPES = ['meilenschnaeppchen', 'award-favorit', 'aktion', 'standard'];
export const REGIONS = [
  'Deutschland', 'Europa', 'Nordafrika', 'Naher Osten', 'Afrika', 'Nordamerika',
  'Mittelamerika & Karibik', 'Südamerika', 'Asien', 'Indischer Subkontinent', 'Ozeanien',
];

export function offerId(o) {
  const parts = [
    o.sourceId, o.category, o.airline?.code, o.origin?.iata ?? `${o.origin?.country ?? '-'}*`, o.destination?.iata,
    o.cabin, o.tripType, o.bookingPeriod?.to ?? 'offen',
  ];
  return parts.map((p) => String(p ?? '-').toLowerCase()).join(':');
}

const isUrl = (u) => typeof u === 'string' && /^https?:\/\//.test(u);

function checkPrice(errors, label, price, { needsApproxFlag }) {
  if (price === null || price === undefined) return;
  if (!Number.isFinite(price.amount) || price.amount < 0) errors.push(`${label}.amount ungültig`);
  if (typeof price.currency !== 'string' || price.currency.length !== 3) errors.push(`${label}.currency fehlt`);
  if (!price.source || !isUrl(price.source.url)) errors.push(`${label}.source.url fehlt`);
  if (!isIsoDate(price.retrievedAt)) errors.push(`${label}.retrievedAt fehlt (Abrufdatum)`);
  if (needsApproxFlag && typeof price.approx !== 'boolean') errors.push(`${label}.approx fehlt`);
}

// Liefert eine Liste von Fehlern (leer = gültig).
export function validateOffer(o) {
  const errors = [];
  if (!CATEGORIES.includes(o.category)) errors.push(`category ungültig: ${o.category}`);
  if (typeof o.sourceId !== 'string' || !o.sourceId) errors.push('sourceId fehlt');
  if (!Number.isFinite(o.miles) || o.miles <= 0) errors.push('miles fehlt');
  if (!Array.isArray(o.sources) || o.sources.length === 0) errors.push('sources fehlt');
  else o.sources.forEach((s, i) => {
    if (!['primary', 'blog'].includes(s.type)) errors.push(`sources[${i}].type ungültig`);
    if (!isUrl(s.url)) errors.push(`sources[${i}].url fehlt`);
  });

  const bp = o.bookingPeriod;
  if (!bp) errors.push('bookingPeriod fehlt');
  else {
    if (bp.from != null && !isIsoDate(bp.from)) errors.push('bookingPeriod.from ungültig');
    if (bp.to != null && !isIsoDate(bp.to)) errors.push('bookingPeriod.to ungültig');
  }
  const tp = o.travelPeriod;
  if (tp) {
    if (tp.from != null && !isIsoDate(tp.from)) errors.push('travelPeriod.from ungültig');
    if (tp.to != null && !isIsoDate(tp.to)) errors.push('travelPeriod.to ungültig');
  }

  if (o.category === 'flight') {
    if (!o.airline?.name) errors.push('airline.name fehlt');
    // Ein Abflughafen (iata) oder eine Abflugregion wie „alle Eurowings-Flughäfen in Deutschland“ (label + country)
    if (!o.origin?.iata && !(o.origin?.label && o.origin?.country)) errors.push('origin.iata oder origin.label+country fehlt');
    if (!o.destination?.iata) errors.push('destination.iata fehlt');
    if (o.destination?.region && !REGIONS.includes(o.destination.region)) {
      errors.push(`destination.region unbekannt: ${o.destination.region}`);
    }
    if (!CABINS.includes(o.cabin)) errors.push(`cabin ungültig: ${o.cabin}`);
    if (!TRIP_TYPES.includes(o.tripType)) errors.push(`tripType ungültig: ${o.tripType}`);
    if (o.offerType && !OFFER_TYPES.includes(o.offerType)) errors.push(`offerType ungültig: ${o.offerType}`);
  }

  checkPrice(errors, 'cashPrice', o.cashPrice, { needsApproxFlag: true });
  checkPrice(errors, 'copay', o.copay, { needsApproxFlag: false });
  return errors;
}

export function hasPrimarySource(o) {
  return o.sources?.some((s) => s.type === 'primary') ?? false;
}

// Blog-Regel: Ein Angebot, das nur aus Blogs stammt, bleibt nur, wenn
// (a) Buchungszeitraum und Meilenpreis an der Primärquelle bestätigt sind, oder
// (b) ein eindeutiges, noch nicht abgelaufenes Buchungs-Enddatum vorliegt.
export function blogRuleVerdict(o, today) {
  if (hasPrimarySource(o)) return { keep: true, reason: null };
  const v = o.verification ?? {};
  if (v.primaryConfirmed === true && isUrl(v.primaryUrl) && isIsoDate(v.checkedAt)) {
    return { keep: true, reason: null };
  }
  const to = o.bookingPeriod?.to;
  if (o.bookingPeriod?.toExplicit === true && isIsoDate(to) && to >= today) {
    return { keep: true, reason: null };
  }
  return {
    keep: false,
    reason: 'Nur aus Blog, weder an der Primärquelle bestätigt noch mit eindeutigem gültigem Enddatum',
  };
}

// Buchungszeitraum läuft heute?
export function isBookable(o, today) {
  const { from, to } = o.bookingPeriod ?? {};
  if (from && from > today) return false;
  if (to && to < today) return false;
  return true;
}

export function isExpired(o, today) {
  const to = o.bookingPeriod?.to;
  return Boolean(to && to < today);
}

export function startsAbroad(o) {
  if (!o.origin) return false;
  return !isGermanAirport(o.origin.iata, o.origin.country);
}

// Vergleicht zwei Fassungen eines Angebots auf die Felder, die für den Nutzer zählen.
export function offerChanged(a, b) {
  const pick = (o) => JSON.stringify([
    o.miles, o.copay?.amount, o.bookingPeriod, o.travelPeriod, o.standardMiles,
  ]);
  return pick(a) !== pick(b);
}
