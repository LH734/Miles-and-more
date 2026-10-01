// Oberfläche des Meilen-Einlöse-Trackers. Liest data.json und rendert Tabelle, Filter und Status.
// Alle Inhalte werden per textContent gesetzt (Daten stammen aus dem Web und gelten als unsicher).

const CABIN = { economy: 'Economy', premium_economy: 'Premium Economy', business: 'Business', first: 'First' };
const CABIN_ORDER = Object.keys(CABIN);
const TRIP = { roundtrip: 'Hin & zurück', oneway: 'Einfach' };
const OFFER_TYPE = { meilenschnaeppchen: 'Meilenschnäppchen', 'award-favorit': 'Award Favorit', aktion: 'Aktion', standard: 'Standard' };
const STATUS = { ok: 'OK', error: 'Fehler', blocked: 'gesperrt', 'not-checked': 'noch nicht abgefragt' };

const eur = new Intl.NumberFormat('de-DE', { style: 'currency', currency: 'EUR', maximumFractionDigits: 0 });
const num = new Intl.NumberFormat('de-DE');
const cent = new Intl.NumberFormat('de-DE', { minimumFractionDigits: 3, maximumFractionDigits: 3 });

const $ = (sel) => document.querySelector(sel);

function el(tag, attrs = {}, ...children) {
  const node = document.createElement(tag);
  for (const [k, v] of Object.entries(attrs)) {
    if (v === null || v === undefined || v === false) continue;
    if (k === 'class') node.className = v;
    else node.setAttribute(k, v);
  }
  for (const c of children.flat()) {
    if (c === null || c === undefined || c === false) continue;
    node.append(c instanceof Node ? c : document.createTextNode(String(c)));
  }
  return node;
}

function safeLink(url, text) {
  if (typeof url !== 'string' || !/^https?:\/\//.test(url)) return document.createTextNode(text);
  return el('a', { href: url, target: '_blank', rel: 'noopener noreferrer nofollow' }, text);
}

function date(iso) {
  if (!iso) return '–';
  const d = iso.length === 10 ? new Date(iso + 'T12:00:00') : new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  return d.toLocaleDateString('de-DE', { day: '2-digit', month: '2-digit', year: 'numeric' });
}

function dateTime(iso) {
  if (!iso) return 'noch nie';
  const d = new Date(iso);
  return d.toLocaleString('de-DE', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' });
}

function money(p) {
  if (!p || !Number.isFinite(p.amount)) return null;
  return p.currency === 'EUR' ? eur.format(p.amount) : `${num.format(p.amount)} ${p.currency}`;
}

// Abflug: einzelner Flughafen oder Abflugregion (z. B. „alle Eurowings-Flughäfen in Deutschland“)
const originKey = (o) => o.origin.iata ?? `${o.origin.country}*`;
const originText = (o) => (o.origin.iata ? `${o.origin.city ?? o.origin.iata} (${o.origin.iata})` : o.origin.label);

let DATA = null;
const sortState = { key: 'relevance', dir: 'desc' };

async function main() {
  try {
    const res = await fetch('data.json', { cache: 'no-store' });
    DATA = await res.json();
  } catch (e) {
    $('#empty').hidden = false;
    $('#empty').textContent = 'Die Daten konnten nicht geladen werden.';
    return;
  }
  renderRuns();
  renderWarnings();
  renderSources();
  fillFilters();
  renderChart();
  bindEvents();
  render();
  $('#built').textContent = `Seite gebaut am ${dateTime(DATA.builtAt)}.`;
}

function renderRuns() {
  const d = DATA;
  const ai = d.lastAiRun;
  const items = [
    ['Täglicher Lauf', d.lastDailyRun ? dateTime(d.lastDailyRun.at) : 'noch nie'],
    ['KI-Lauf', ai ? dateTime(ai.at) : 'noch nie'],
  ];
  if (ai) {
    items.push(['Modell', ai.model ?? '–']);
    items.push(['Websuchen', ai.searchesUsed === null || ai.searchesUsed === undefined ? '–' : `${ai.searchesUsed} von ${ai.searchLimit}`]);
  }
  const dl = $('#runs');
  for (const [k, v] of items) dl.append(el('dt', {}, k), el('dd', {}, v));
}

function renderWarnings() {
  const box = $('#warnings');
  const bad = DATA.sources.filter((s) => s.status === 'error' || s.status === 'blocked');
  if (bad.length) {
    const list = el('ul', {}, ...bad.map((s) => el('li', {},
      el('strong', {}, s.name), ': ',
      s.status === 'blocked' ? 'Abruf nicht erlaubt bzw. gesperrt. ' : 'letzter Abruf fehlgeschlagen. ',
      s.lastSuccess ? `Es gelten weiter die Daten vom ${date(s.lastSuccess.slice(0, 10))}.` : 'Von dieser Quelle gibt es noch keine Daten.')));
    box.append(el('div', { class: 'warning', role: 'alert' },
      el('strong', {}, `Probleme bei ${bad.length} ${bad.length === 1 ? 'Quelle' : 'Quellen'}`),
      ' (Details unter „Status der Quellen“):', list));
  }
  const t = DATA.tokenExpiresInDays;
  if (t !== null && t !== undefined && t <= 30) {
    box.append(el('div', { class: 'warning' },
      el('strong', {}, 'KI-Lauf: '),
      t < 0 ? 'Der Claude-Token ist abgelaufen. ' : `Der Claude-Token läuft in ${t} Tagen ab. `,
      'Bitte mit „claude setup-token“ neu erzeugen (siehe ANLEITUNG.md).'));
  }
  if (DATA.hiddenInvalid) {
    box.append(el('div', { class: 'warning' }, `${DATA.hiddenInvalid} Angebot(e) mit unvollständigen Daten wurden ausgeblendet.`));
  }
}

function renderSources() {
  const tb = $('#sources');
  for (const s of DATA.sources) {
    const robots = s.robots?.allowed === true ? `erlaubt (${date(s.robots.checkedAt)})`
      : s.robots?.allowed === false ? `nicht erlaubt (${date(s.robots.checkedAt)})` : 'ungeprüft';
    tb.append(el('tr', {},
      el('td', {}, safeLink(s.url, s.name)),
      el('td', {}, { primary: 'Primärquelle', blog: 'Blog (Hinweisgeber)', chart: 'Prämientabelle' }[s.type] ?? s.type),
      el('td', { class: `status-${s.status}` }, STATUS[s.status] ?? s.status),
      el('td', {}, s.lastSuccess ? dateTime(s.lastSuccess) : '–'),
      el('td', {}, s.lastAttempt ? dateTime(s.lastAttempt) : '–'),
      el('td', {}, robots),
      el('td', {}, s.message ?? '')));
  }
  if (DATA.sources.some((s) => s.status === 'error' || s.status === 'blocked')) $('#sources-box').open = true;
}

function fillSelect(name, entries) {
  const select = document.forms.filters.elements[name];
  for (const [value, label] of entries) select.append(el('option', { value }, label));
}

function uniqueSorted(values, compare = (a, b) => a[1].localeCompare(b[1], 'de')) {
  const map = new Map();
  for (const [v, l] of values) if (v && !map.has(v)) map.set(v, l);
  return [...map.entries()].sort(compare);
}

function fillFilters() {
  const o = DATA.offers;
  fillSelect('origin', uniqueSorted(o.map((x) => [originKey(x), `${originText(x)}${x.startsAbroad ? ' – Ausland' : ''}`])));
  fillSelect('region', uniqueSorted(o.map((x) => [x.destination.region, x.destination.region])));
  fillSelect('country', uniqueSorted(o.map((x) => [x.destination.country, x.destination.countryName ?? x.destination.country])));
  fillSelect('cabin', uniqueSorted(o.map((x) => [x.cabin, CABIN[x.cabin] ?? x.cabin]),
    (a, b) => CABIN_ORDER.indexOf(a[0]) - CABIN_ORDER.indexOf(b[0])));
  fillSelect('airline', uniqueSorted(o.map((x) => [x.airline.name, x.airline.name])));
  const th = DATA.valueConfig.filterThresholds;
  fillSelect('value', [
    ...th.slice(0, -1).map((t) => [`min:${t}`, `ab ${cent.format(t).replace(/0$/, '')} €`]),
    [`over:${th.at(-1)}`, `über ${cent.format(th.at(-1)).replace(/0$/, '')} €`],
    ['known', 'nur bekannte Werte'],
    ['unknown', 'nur „unbekannt“'],
  ]);
}

function bindEvents() {
  const form = document.forms.filters;
  form.addEventListener('input', render);
  form.addEventListener('reset', () => setTimeout(render, 0));
  form.addEventListener('submit', (e) => e.preventDefault());
  for (const th of document.querySelectorAll('th.sortable')) {
    th.querySelector('button').addEventListener('click', () => {
      const key = th.dataset.sort;
      sortState.dir = sortState.key === key && sortState.dir === 'desc' ? 'asc' : 'desc';
      sortState.key = key;
      for (const other of document.querySelectorAll('th.sortable')) other.setAttribute('aria-sort', 'none');
      th.setAttribute('aria-sort', sortState.dir === 'asc' ? 'ascending' : 'descending');
      render();
    });
  }
}

function matches(o, f) {
  if (f.origin && originKey(o) !== f.origin) return false;
  if (f.abroad === 'de' && o.startsAbroad) return false;
  if (f.abroad === 'abroad' && !o.startsAbroad) return false;
  if (f.region && o.destination.region !== f.region) return false;
  if (f.country && o.destination.country !== f.country) return false;
  if (f.cabin && o.cabin !== f.cabin) return false;
  if (f.airline && o.airline.name !== f.airline) return false;
  if (f.relevance && o.relevance < Number(f.relevance)) return false;
  if (f.value) {
    const v = o.value.value;
    if (f.value === 'known' && v === null) return false;
    if (f.value === 'unknown' && v !== null) return false;
    if (f.value.startsWith('min:') && (v === null || v < Number(f.value.slice(4)))) return false;
    if (f.value.startsWith('over:') && (v === null || v <= Number(f.value.slice(5)))) return false;
  }
  if (f.q) {
    const hay = [
      o.airline.name, o.airline.code, o.origin.iata, o.origin.city, o.origin.label, o.destination.iata, o.destination.city,
      o.destination.countryName, o.destination.region, CABIN[o.cabin], OFFER_TYPE[o.offerType], o.notes,
    ].filter(Boolean).join(' ').toLowerCase();
    if (!f.q.toLowerCase().split(/\s+/).filter(Boolean).every((w) => hay.includes(w))) return false;
  }
  return true;
}

function sortValue(o, key) {
  if (key === 'value') return o.value.value;
  if (key === 'miles') return o.miles;
  return o.relevance;
}

function sorted(list) {
  const { key, dir } = sortState;
  const m = dir === 'asc' ? 1 : -1;
  return [...list].sort((a, b) => {
    const va = sortValue(a, key);
    const vb = sortValue(b, key);
    // "unbekannt" steht immer am Ende
    if (va === null && vb !== null) return 1;
    if (vb === null && va !== null) return -1;
    if (va !== vb) return (va - vb) * m;
    return (b.value.value ?? -1) - (a.value.value ?? -1);
  });
}

function dots(n) {
  return el('span', { class: 'dots', title: `Relevanz ${n} von 5`, 'aria-label': `Relevanz ${n} von 5` },
    el('span', { class: 'on' }, '●'.repeat(n)), el('span', { class: 'off' }, '●'.repeat(5 - n)));
}

function row(o) {
  const v = o.value;
  const valueCell = v.value === null
    ? el('span', { class: 'unknown', title: v.reason ?? '' }, 'unbekannt')
    : el('span', { class: v.implausible ? 'implausible' : null, title: v.implausible ? `Über ${DATA.valueConfig.plausibilityMax} €/Meile – bitte prüfen` : null },
      `${v.approx ? 'ca. ' : ''}${cent.format(v.value)} €`, v.implausible ? ' ⚠' : '');

  const cash = money(o.cashPrice);
  const cashCell = cash
    ? [el('span', {}, `${o.cashPrice.approx ? 'ca. ' : ''}${cash}`),
       el('span', { class: 'small' }, safeLink(o.cashPrice.source?.url, o.cashPrice.source?.name ?? 'Quelle'), `, ${date(o.cashPrice.retrievedAt)}`)]
    : el('span', { class: 'unknown' }, 'unbekannt');

  const copay = money(o.copay);
  const copayCell = copay
    ? [el('span', {}, copay), o.copay.retrievedAt ? el('span', { class: 'small' }, safeLink(o.copay.source?.url, 'Quelle'), `, ${date(o.copay.retrievedAt)}`) : null]
    : el('span', { class: 'unknown' }, 'unbekannt');

  const bp = o.bookingPeriod;
  const tp = o.travelPeriod;
  const sourceCell = o.sources.map((s) => el('span', { class: 'small' },
    safeLink(s.url, s.name ?? (s.type === 'primary' ? 'Miles & More' : 'Blog')),
    s.type === 'blog' ? el('span', { class: 'badge blog' }, 'Blog') : null));
  if (o.verification?.primaryConfirmed && o.verification.primaryUrl && !o.sources.some((s) => s.type === 'primary')) {
    sourceCell.push(el('span', { class: 'small' }, '✓ ', safeLink(o.verification.primaryUrl, 'an Primärquelle bestätigt'), ` (${date(o.verification.checkedAt)})`));
  }
  if (o.sourceWarning) {
    sourceCell.push(el('span', { class: 'small status-error' }, o.sourceWarning.lastSuccess
      ? `⚠ Quelle zuletzt fehlerhaft, Daten vom ${date(o.sourceWarning.lastSuccess.slice(0, 10))}`
      : '⚠ Quelle zuletzt fehlerhaft'));
  }

  return el('tr', { class: o.sourceWarning ? 'row-warn' : null },
    el('td', {}, o.airline.name, el('span', { class: 'small' }, OFFER_TYPE[o.offerType] ?? '')),
    el('td', {},
      `${originText(o)} → ${o.destination.city ?? o.destination.iata} (${o.destination.iata})`,
      el('span', { class: 'small' }, [o.destination.countryName, o.destination.region].filter(Boolean).join(' · ')),
      el('span', { class: 'badge' }, TRIP[o.tripType] ?? o.tripType),
      o.startsAbroad ? el('span', { class: 'badge abroad' }, 'Start im Ausland') : null),
    el('td', {}, CABIN[o.cabin] ?? o.cabin),
    el('td', { class: 'num' }, num.format(o.miles),
      o.standardMiles ? el('span', { class: 'small' }, `statt ${num.format(o.standardMiles)}`) : null),
    el('td', { class: 'num' }, copayCell),
    el('td', { class: 'num' }, cashCell),
    el('td', { class: 'num' }, valueCell),
    el('td', {}, dots(o.relevance)),
    el('td', {}, bp?.to ? date(bp.to) : 'offen',
      o.remainingDays !== null ? el('span', { class: 'small' }, o.remainingDays === 0 ? 'nur noch heute' : `noch ${o.remainingDays} Tage`) : null),
    el('td', {}, tp ? `${date(tp.from)} – ${date(tp.to)}` : '–'),
    el('td', {}, sourceCell));
}

function render() {
  const f = Object.fromEntries(new FormData(document.forms.filters));
  const list = sorted(DATA.offers.filter((o) => matches(o, f)));
  $('#rows').replaceChildren(...list.map(row));
  const empty = $('#empty');
  empty.hidden = list.length > 0;
  empty.textContent = DATA.offers.length === 0
    ? 'Derzeit liegen keine bestätigten, buchbaren Angebote vor.'
    : 'Keine Angebote passen zu den Filtern.';
  $('#count').textContent = `${list.length} von ${DATA.offers.length} buchbaren Angeboten`;
}

function renderChart() {
  const c = DATA.awardChart;
  if (!c || !Array.isArray(c.rows) || c.rows.length === 0) return;
  const box = $('#chart-box');
  box.hidden = false;
  const classes = CABIN_ORDER.filter((k) => c.rows.some((r) => r[k] != null));
  $('#chart').append(
    el('p', {}, `Stand: ${date(c.stand)}. Quelle: `, safeLink(c.source?.url, c.source?.name ?? 'Miles & More'),
      c.tripType ? `. Angaben ${c.tripType === 'oneway' ? 'pro Strecke (einfach)' : 'für Hin- und Rückflug'}.` : '.'),
    el('table', {},
      el('thead', {}, el('tr', {}, el('th', {}, 'Strecke'), ...classes.map((k) => el('th', {}, CABIN[k])))),
      el('tbody', {}, ...c.rows.map((r) => el('tr', {}, el('td', {}, r.route),
        ...classes.map((k) => el('td', {}, r[k] == null ? '–' : num.format(r[k]))))))),
    c.note ? el('p', { class: 'small' }, c.note) : '');
}

main();
