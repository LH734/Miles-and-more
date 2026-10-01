// Wert pro Meile = (Barpreis − Zuzahlung) / Meilen.
// Es wird nie geschätzt: Fehlt eine Angabe oder passt sie nicht zusammen, ist der Wert "unbekannt" (null).

export function valuePerMile(offer, config) {
  const currency = config?.value?.currency ?? 'EUR';
  const { cashPrice, copay, miles } = offer;

  if (!Number.isFinite(miles) || miles <= 0) return unknown('Meilenpreis fehlt');
  if (!cashPrice || !Number.isFinite(cashPrice.amount)) return unknown('Barpreis fehlt');
  if (!copay || !Number.isFinite(copay.amount)) return unknown('Zuzahlung fehlt');
  if (cashPrice.currency !== currency || copay.currency !== currency) {
    return unknown(`Währung ist nicht ${currency}`);
  }
  if (cashPrice.tripType && offer.tripType && cashPrice.tripType !== offer.tripType) {
    return unknown('Barpreis gilt für eine andere Reiseart (Hin/Rück vs. einfach)');
  }
  if (cashPrice.cabin && offer.cabin && cashPrice.cabin !== offer.cabin) {
    return unknown('Barpreis gilt für eine andere Klasse');
  }

  const value = (cashPrice.amount - copay.amount) / miles;
  const max = config?.value?.plausibilityMax ?? 0.15;
  return {
    value: Math.round(value * 10000) / 10000,
    approx: Boolean(cashPrice.approx),
    implausible: value > max,
    reason: null,
  };
}

function unknown(reason) {
  return { value: null, approx: false, implausible: false, reason };
}
