import { ApiError, api, unwrap } from './api';
import type { S } from './types';

/**
 * Entrega de saída pelo painel (2026-11-04): o atendente lê o QR do cliente (câmera ou leitor USB), faz o checklist,
 * envia as fotos e a bateria, e `POST /handovers` (`pickup`) cria a entrega; em seguida abre "Contrato e pagamento".
 * Sem QR (só admin): `reservationId` + `noCodeReason`. O código lido nunca é mostrado nem registrado.
 */

/** Mesmos códigos e rótulos do checklist de saída do app do operador (`pickupChecklistCodes`). */
export const PICKUP_CHECKLIST: ChecklistItem[] = [
  { code: 'freios', label: 'Freios' },
  { code: 'luzes', label: 'Luzes' },
  { code: 'pneus', label: 'Pneus' },
  { code: 'buzina', label: 'Buzina' },
  { code: 'painel', label: 'Painel' },
  { code: 'carenagem', label: 'Carenagem' },
];

/** Contrato: `photoKeys` maxItems 12 (o mesmo limite do app do operador). */
export const MAX_HANDOVER_PHOTOS = 12;
const MAX_HANDOVER_PHOTO_BYTES = 10 * 1024 * 1024;
export const HANDOVER_PHOTO_TYPES = ['image/jpeg', 'image/png'] as const;
type HandoverPhotoType = (typeof HANDOVER_PHOTO_TYPES)[number];

/** Contrato: `noCodeReason` de 10 a 300 caracteres. */
export const NO_CODE_REASON_MIN = 10;
export const NO_CODE_REASON_MAX = 300;
const NOTE_MAX = 500;

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/**
 * Confere o código lido contra a reserva da linha. O formato (`v1.<reservationId>.<exp>.<assinatura>`) é informativo:
 * só serve para avisar que o QR é de outra reserva; a assinatura é conferida pela API. Fora de 8 a 256 caracteres →
 * recusa (contrato); outro formato segue para a API, que decide.
 */
export function checkPickupCode(raw: string, reservationId: string): { ok: true; code: string } | { ok: false; error: string } {
  const code = raw.trim();
  if (code.length < 8 || code.length > 256) return { ok: false, error: 'Código inválido. Leia o QR de novo.' };
  const parts = code.split('.');
  if (parts.length === 4 && parts[0] === 'v1' && UUID.test(parts[1]!) && parts[1]!.toLowerCase() !== reservationId.toLowerCase()) {
    return { ok: false, error: 'Este QR é de outra reserva.' };
  }
  return { ok: true, code };
}

/** Câmera só com `BarcodeDetector` (Chrome no Windows normalmente não tem) e `getUserMedia`; sem isso, só o campo. */
export function cameraScanSupported(g: unknown = globalThis): boolean {
  const w = g as { BarcodeDetector?: unknown; navigator?: { mediaDevices?: { getUserMedia?: unknown } } } | undefined;
  return !!w && typeof w.BarcodeDetector === 'function' && typeof w.navigator?.mediaDevices?.getUserMedia === 'function';
}

/** Bateria inicial: a leitura da moto quando conhecida; `batteryKnown: false` (ou sem moto) → o atendente informa. */
export function initialBattery(vehicle?: Pick<S<'VehicleSummary'>, 'batteryPct' | 'batteryKnown'> | null): string {
  if (!vehicle || vehicle.batteryKnown === false) return '';
  return String(vehicle.batteryPct);
}

export function parseBattery(text: string): number | null {
  const t = text.trim();
  if (!/^\d{1,3}$/.test(t)) return null;
  const n = Number(t);
  return n <= 100 ? n : null;
}

export type ChecklistAnswer = { ok: boolean | null; note: string };
export type ChecklistState = Record<string, ChecklistAnswer>;

export type ChecklistItem = { code: string; label: string };

/** Checklist sem respostas (padrão: o de saída; a chegada passa `ARRIVAL_CHECKLIST`). */
export const emptyChecklist = (items: ChecklistItem[] = PICKUP_CHECKLIST): ChecklistState =>
  Object.fromEntries(items.map((i) => [i.code, { ok: null, note: '' }]));

export const checklistAnswered = (items: ChecklistItem[], state: ChecklistState): boolean =>
  items.every((i) => state[i.code]?.ok != null);

/** `HandoverChecklistItem[]` na ordem dos itens; nota aparada (até 500) só quando preenchida. */
export function checklistBody(items: ChecklistItem[], state: ChecklistState): S<'HandoverChecklistItem'>[] {
  return items.map((i) => {
    const a = state[i.code]!;
    const note = a.note.trim().slice(0, NOTE_MAX);
    return { code: i.code, ok: a.ok === true, ...(note ? { note } : {}) };
  });
}

export type Identification =
  | { kind: 'code'; code: string | null }
  | { kind: 'noCode'; reason: string };

export interface PickupDraft {
  reservationId: string;
  depotId: string;
  id: Identification;
  checklist: ChecklistState;
  photoKeys: string[];
  battery: string;
  batterySerial: string;
}

/** O que falta para registrar a entrega (vazio = pronto). */
export function missingForPickup(d: PickupDraft): string[] {
  const out: string[] = [];
  if (d.id.kind === 'code' && !d.id.code) out.push('Leia o QR do cliente');
  if (d.id.kind === 'noCode') {
    const n = d.id.reason.trim().length;
    if (n < NO_CODE_REASON_MIN || n > NO_CODE_REASON_MAX) out.push(`Informe o motivo (${NO_CODE_REASON_MIN} a ${NO_CODE_REASON_MAX} caracteres)`);
  }
  if (!checklistAnswered(PICKUP_CHECKLIST, d.checklist)) out.push('Responda todo o checklist');
  if (d.photoKeys.length === 0) out.push('Envie ao menos uma foto da moto');
  if (parseBattery(d.battery) === null) out.push('Informe a bateria (0 a 100)');
  return out;
}

/** Corpo de `POST /handovers` (`HandoverCreate`, `pickup`); `null` enquanto falta algo. */
export function buildPickupBody(d: PickupDraft): S<'HandoverCreate'> | null {
  if (missingForPickup(d).length) return null;
  const checklist = checklistBody(PICKUP_CHECKLIST, d.checklist);
  const serial = d.batterySerial.trim().slice(0, 64);
  return {
    type: 'pickup',
    depotId: d.depotId,
    ...(d.id.kind === 'code' ? { pickupCode: d.id.code! } : { reservationId: d.reservationId, noCodeReason: d.id.reason.trim() }),
    checklist,
    photoKeys: d.photoKeys,
    batteryPct: parseBattery(d.battery)!,
    ...(serial ? { batterySerial: serial } : {}),
  };
}

export function validateHandoverPhoto(file: { type: string; size: number }): string | null {
  if (!(HANDOVER_PHOTO_TYPES as readonly string[]).includes(file.type)) return 'Use uma foto JPG ou PNG';
  if (file.size > MAX_HANDOVER_PHOTO_BYTES) return 'A foto pode ter até 10 MB';
  return null;
}

/** Foto da moto: URL pré-assinada (`POST /handovers/uploads`, `purpose: photo`) e envio direto ao bucket. */
export async function uploadHandoverPhoto(file: File): Promise<string> {
  const invalid = validateHandoverPhoto(file);
  if (invalid) throw new Error(invalid);
  const up = await unwrap(api.POST('/handovers/uploads', { body: { contentType: file.type as HandoverPhotoType, purpose: 'photo' } }));
  if (!up.objectKey.startsWith('handovers/')) throw new Error('Resposta de upload inesperada');
  const res = await fetch(up.uploadUrl, { method: up.method, headers: up.headers, body: file });
  if (!res.ok) throw new ApiError(res.status, `Falha ao enviar a foto (${res.status})`);
  return up.objectKey;
}

/** Erros do `POST /handovers` em pt-BR (o detalhe da API nunca traz o código). */
export function pickupErrorMessage(e: unknown, noCode = false): string {
  if (e instanceof ApiError) {
    if (e.slug === 'pickup-without-code-requires-admin') return 'Só o admin pode entregar sem o QR do cliente.';
    if (e.status === 404) return noCode ? 'Reserva não encontrada neste galpão.' : 'QR inválido ou vencido. Peça ao cliente para abrir o QR de novo.';
    if (e.slug === 'vehicle-unavailable') return 'A moto desta reserva não está separada.';
    if (e.status === 409) return e.message || 'Esta reserva não está mais aguardando a retirada.';
  }
  return e instanceof Error ? e.message : 'Algo deu errado. Tente de novo.';
}
