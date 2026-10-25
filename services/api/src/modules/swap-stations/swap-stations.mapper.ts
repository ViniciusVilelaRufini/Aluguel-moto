import type { SwapStation } from '@prisma/client';
import { stationThingName } from '../../ports/station-gateway.port';

/** *Thing* efetiva do armário: a gravada no cadastro ou, sem ela, a convenção `station-{id}`. */
export const effectiveThingName = (s: Pick<SwapStation, 'id' | 'thingName'>): string => s.thingName ?? stationThingName(s.id);

export interface SwapStationAdminExtras {
  batteriesInStation: number;
  openSwaps: number;
  depotIds: string[];
}

/** Prisma → `SwapStationAdmin` do contrato (só admin/operacao). Nunca leva o `stationCode` (QR). */
export function toSwapStationAdmin(s: SwapStation, extras: SwapStationAdminExtras) {
  return {
    id: s.id,
    name: s.name,
    address: s.address,
    lat: s.lat,
    lng: s.lng,
    availableBatteries: s.availableBatteries,
    totalSlots: s.totalSlots,
    openingHours: s.openingHours,
    open24h: s.open24h,
    active: s.active,
    thingName: effectiveThingName(s),
    batteriesInStation: extras.batteriesInStation,
    openSwaps: extras.openSwaps,
    depotIds: extras.depotIds,
    createdAt: s.createdAt.toISOString(),
    updatedAt: s.updatedAt.toISOString(),
  };
}

/** Texto padrão do horário quando a estação é 24 h e o cadastro não informa outro. */
export const OPEN_24H_TEXT = 'Todos os dias, 24 h';

/** Baterias que ocupam vagas: o maior entre o contador de carregadas e as baterias `in_station` registradas. */
export const batteriesOccupying = (availableBatteries: number, inStation: number): number => Math.max(availableBatteries, inStation);
