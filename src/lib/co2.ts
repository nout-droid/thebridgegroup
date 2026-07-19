// Vuistregels voor de CO2-indicatie: bedoeld als bewustwording (orde van grootte),
// niet als exacte meting — precieze afstanden/vluchtroutes worden niet bijgehouden.
export const FLIGHT_CO2_KG = 200; // gemiddelde retourvlucht per passagier, kort/middellange afstand
export const KM_CO2_KG_PER_KM = 0.2; // gemiddeld wegtransport (bus/vrachtwagen), per km

export interface Co2Total {
  flightKg: number;
  kmKg: number;
  quoteKg: number;
  totalKg: number;
}

export function computeCo2Total(flightCount: number, totalKm: number, totalQuoteKg: number): Co2Total {
  const flightKg = flightCount * FLIGHT_CO2_KG;
  const kmKg = totalKm * KM_CO2_KG_PER_KM;
  return { flightKg, kmKg, quoteKg: totalQuoteKg, totalKg: flightKg + kmKg + totalQuoteKg };
}
