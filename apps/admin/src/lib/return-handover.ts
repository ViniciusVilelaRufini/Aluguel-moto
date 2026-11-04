import { ApiError } from './api';
import { can } from './permissions';
import { checklistAnswered, checklistBody, parseBattery, type ChecklistItem, type ChecklistState } from './pickup-handover';
import type { S, StaffGroup } from './types';

/**
 * Chegada no galpão pelo painel (2026-11-04): o cliente devolve a moto no balcão e o atendente registra a chegada
 * (`POST /handovers`, `return_depot`) com o checklist, as fotos e a bateria, como no app do operador. A entrega nasce
 * aceita, o aluguel encerra pelo fechamento normal e a moto fica no galpão (ou em manutenção, se algum item veio com
 * problema). A API confere a posição ao vivo: até 150 m do galpão.
 */

/** Mesmos códigos e rótulos do checklist de chegada do app do operador (`arrivalChecklistCodes`). */
export const ARRIVAL_CHECKLIST: ChecklistItem[] = [
  { code: 'freios', label: 'Freios' },
  { code: 'pneus', label: 'Pneus' },
  { code: 'luzes', label: 'Luzes' },
  { code: 'carenagem', label: 'Carenagem' },
];

/** Galpão sugerido: o da moto, se estiver entre os ativos; senão o único ativo; senão o atendente escolhe (`''`). */
export function defaultReturnDepot(depots: Pick<S<'Depot'>, 'id' | 'active'>[], vehicleDepotId: string | undefined): string {
  const active = depots.filter((d) => d.active);
  if (vehicleDepotId && active.some((d) => d.id === vehicleDepotId)) return vehicleDepotId;
  return active.length === 1 ? active[0]!.id : '';
}

/** Quem vê "Receber no galpão": quem cria entrega (admin, operacao), com a moto num aluguel em andamento. */
export function canReceiveAtDepot(groups: StaffGroup[], vehicle: { currentRentalId?: string }): boolean {
  return !!vehicle.currentRentalId && can(groups, 'handover.create');
}

export interface ReturnDraft {
  rentalId: string;
  depotId: string;
  checklist: ChecklistState;
  photoKeys: string[];
  battery: string;
  batterySerial: string;
}

/** O que falta para registrar a chegada (vazio = pronto). */
export function missingForReturn(d: ReturnDraft): string[] {
  const out: string[] = [];
  if (!d.depotId) out.push('Escolha o galpão');
  if (!checklistAnswered(ARRIVAL_CHECKLIST, d.checklist)) out.push('Responda todo o checklist');
  if (d.photoKeys.length === 0) out.push('Envie ao menos uma foto da moto');
  if (parseBattery(d.battery) === null) out.push('Informe a bateria (0 a 100)');
  return out;
}

/** Corpo de `POST /handovers` (`HandoverCreate`, `return_depot`); `null` enquanto falta algo. */
export function buildReturnBody(d: ReturnDraft): S<'HandoverCreate'> | null {
  if (missingForReturn(d).length) return null;
  const serial = d.batterySerial.trim().slice(0, 64);
  return {
    type: 'return_depot',
    rentalId: d.rentalId,
    depotId: d.depotId,
    checklist: checklistBody(ARRIVAL_CHECKLIST, d.checklist),
    photoKeys: d.photoKeys,
    batteryPct: parseBattery(d.battery)!,
    ...(serial ? { batterySerial: serial } : {}),
  };
}

/** Erros do `POST /handovers` (`return_depot`) em pt-BR. */
export function returnErrorMessage(e: unknown): string {
  if (e instanceof ApiError) {
    if (e.slug === 'vehicle-not-at-depot') {
      return 'A moto precisa estar no galpão (até 150 m) e com sinal do rastreador para registrar a chegada. Confira a posição na ficha da moto. '
        + 'Se ela está aqui mas sem sinal, o admin pode usar "Encerrar aluguel à força".';
    }
    if (e.status === 404) return 'Galpão ou aluguel não encontrado. Confira o galpão escolhido.';
    if (e.status === 409) return e.message || 'Este aluguel não está mais em andamento.';
  }
  return e instanceof Error ? e.message : 'Algo deu errado. Tente de novo.';
}
