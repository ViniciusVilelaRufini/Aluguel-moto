/** Manutenção preventiva por km/horas (contrato v2): situação da revisão de uma moto. */
export type VehicleServiceStatus = 'ok' | 'due_soon' | 'overdue';

export interface ServiceInput {
  odometerKm: number;
  usageHours: number;
  lastServiceOdometerKm: number;
  lastServiceUsageHours: number;
  lastServiceAt?: Date | null;
  intervalKm: number;
  intervalHours: number;
}

/** Fração do intervalo a partir da qual a revisão está "próxima" (faltam 10% ou menos). */
export const DUE_SOON_RATIO = 0.9;

const round1 = (n: number) => Math.round(n * 10) / 10;

export function computeServiceInfo(i: ServiceInput) {
  const kmSince = Math.max(0, i.odometerKm - i.lastServiceOdometerKm);
  const hoursSince = Math.max(0, i.usageHours - i.lastServiceUsageHours);
  const ratio = Math.max(kmSince / i.intervalKm, hoursSince / i.intervalHours);
  const status: VehicleServiceStatus = ratio >= 1 ? 'overdue' : ratio >= DUE_SOON_RATIO ? 'due_soon' : 'ok';
  return {
    odometerKm: round1(i.odometerKm),
    usageHours: round1(i.usageHours),
    kmSinceService: round1(kmSince),
    hoursSinceService: round1(hoursSince),
    serviceIntervalKm: i.intervalKm,
    serviceIntervalHours: i.intervalHours,
    nextServiceAtKm: round1(i.lastServiceOdometerKm + i.intervalKm),
    nextServiceAtHours: round1(i.lastServiceUsageHours + i.intervalHours),
    kmUntilService: round1(i.intervalKm - kmSince),
    hoursUntilService: round1(i.intervalHours - hoursSince),
    status,
    lastServiceAt: i.lastServiceAt ? i.lastServiceAt.toISOString() : undefined,
    /** Para ordenar a tabela (maior = mais urgente); não vai para o contrato. */
    urgency: ratio,
  };
}

export type ServiceInfo = ReturnType<typeof computeServiceInfo>;

/** Remove o campo interno de ordenação antes de responder. */
export function publicServiceInfo(s: ServiceInfo) {
  const { urgency: _urgency, ...rest } = s;
  return Object.fromEntries(Object.entries(rest).filter(([, v]) => v !== undefined)) as Omit<ServiceInfo, 'urgency'>;
}

const STATUS_RANK: Record<VehicleServiceStatus, number> = { overdue: 0, due_soon: 1, ok: 2 };

/** Ordem da tabela "Manutenção": vencidas, próximas, em dia; dentro de cada grupo, a mais urgente primeiro, depois o código. */
export function compareServiceRows(a: { code: string; service: ServiceInfo }, b: { code: string; service: ServiceInfo }): number {
  return STATUS_RANK[a.service.status] - STATUS_RANK[b.service.status] || b.service.urgency - a.service.urgency || a.code.localeCompare(b.code);
}
