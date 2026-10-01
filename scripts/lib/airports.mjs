// Deutsche Verkehrsflughäfen (IATA). Alles andere gilt als "Start im Ausland".
export const GERMAN_AIRPORTS = {
  BER: 'Berlin', BRE: 'Bremen', CGN: 'Köln/Bonn', DRS: 'Dresden', DTM: 'Dortmund',
  DUS: 'Düsseldorf', ERF: 'Erfurt', FDH: 'Friedrichshafen', FKB: 'Karlsruhe/Baden-Baden',
  FMM: 'Memmingen', FMO: 'Münster/Osnabrück', FRA: 'Frankfurt', GWT: 'Sylt',
  HAJ: 'Hannover', HAM: 'Hamburg', HDF: 'Heringsdorf', HHN: 'Frankfurt-Hahn',
  KSF: 'Kassel', LBC: 'Lübeck', LEJ: 'Leipzig/Halle', MUC: 'München', NRN: 'Weeze',
  NUE: 'Nürnberg', PAD: 'Paderborn/Lippstadt', RLG: 'Rostock', SCN: 'Saarbrücken',
  STR: 'Stuttgart',
};

// Das Land aus den Daten hat Vorrang; nur ohne Land wird über die IATA-Liste entschieden.
export function isGermanAirport(iata, country) {
  if (country) return country.toUpperCase() === 'DE';
  return Boolean(iata && GERMAN_AIRPORTS[iata.toUpperCase()]);
}
