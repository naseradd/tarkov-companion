// ROI de la ferme à Bitcoins.
//
// Formule communautaire EFT : temps de production d'un Physical Bitcoin =
//   145000 / (1 + (GPUs - 1) * 0.041225)   secondes.
// Solar Power ne change pas la vitesse mais halve la conso de carburant.

const BASE_SECONDS = 145000;
const GPU_COEFF = 0.041225;

export function secondsPerBitcoin(gpus: number): number {
  if (gpus < 1) return Infinity;
  return BASE_SECONDS / (1 + (gpus - 1) * GPU_COEFF);
}

export function bitcoinsPerDay(gpus: number): number {
  const s = secondsPerBitcoin(gpus);
  return s === Infinity ? 0 : 86400 / s;
}

export interface BtcRoi {
  gpus: number;
  btcPerDay: number;
  revenuePerDay: number;
  fuelPerDay: number;
  netPerDay: number;
  gpuInvestment: number;
  breakEvenDays: number; // jours pour rentabiliser le coût des GPU
}

export function btcRoi(opts: {
  gpus: number;
  gpuPrice: number;
  bitcoinPrice: number;
  fuelPerDay?: number; // coût carburant/jour en ₽
}): BtcRoi {
  const btcPerDay = bitcoinsPerDay(opts.gpus);
  const revenuePerDay = btcPerDay * opts.bitcoinPrice;
  const fuelPerDay = opts.fuelPerDay ?? 0;
  const netPerDay = revenuePerDay - fuelPerDay;
  const gpuInvestment = opts.gpus * opts.gpuPrice;
  return {
    gpus: opts.gpus,
    btcPerDay,
    revenuePerDay,
    fuelPerDay,
    netPerDay,
    gpuInvestment,
    breakEvenDays: netPerDay > 0 ? gpuInvestment / netPerDay : Infinity,
  };
}

/** Valeur marginale d'ajouter la Nième GPU : ₽/jour gagnés en plus. */
export function marginalGpuValue(n: number, bitcoinPrice: number): number {
  if (n < 1) return 0;
  return (bitcoinsPerDay(n) - bitcoinsPerDay(n - 1)) * bitcoinPrice;
}

export const GPU_TIERS = [1, 10, 25, 50];
