/** O Traccar guarda a velocidade em nós (spec GT06 §6.2). */
export const KNOT_TO_KMH = 1.852;

export function knotsToKmh(knots: number): number {
  return Math.round(knots * KNOT_TO_KMH * 10) / 10;
}

/** `attributes.rssi` do Traccar: 0–4 no GT06 (força GSM) ou 0–31 (CSQ) em outros protocolos → `sinal` 0–5 do contrato. */
export function rssiToSignal(rssi: number): number {
  if (!Number.isFinite(rssi) || rssi <= 0) return 0;
  const scale = rssi <= 4 ? 4 : 31;
  return Math.max(0, Math.min(5, Math.round((rssi / scale) * 5)));
}

export type BatteryModel = '48v' | '60v' | '72v';

/** Pack Li-ion 13S/16S/20S, de 3,0 V (vazio) a 4,2 V (cheio) por célula. Aproximado: tensão sem carga, sem compensação. */
export const BATTERY_CURVES: Record<BatteryModel, { emptyV: number; fullV: number }> = {
  '48v': { emptyV: 39, fullV: 54.6 },
  '60v': { emptyV: 48, fullV: 67.2 },
  '72v': { emptyV: 60, fullV: 84 },
};

/** `null` = tensão fora da faixa plausível do pack (ex.: 12 V de um conversor DC-DC): sem leitura de bateria. */
export function voltageToPct(volts: number, model: BatteryModel): number | null {
  const { emptyV, fullV } = BATTERY_CURVES[model];
  if (!Number.isFinite(volts) || volts < emptyV * 0.8 || volts > fullV * 1.1) return null;
  return Math.max(0, Math.min(100, Math.round(((volts - emptyV) / (fullV - emptyV)) * 100)));
}
