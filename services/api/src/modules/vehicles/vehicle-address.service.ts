import { Inject, Injectable, Logger } from '@nestjs/common';
import { distanceM } from '../../common/util';
import { PrismaService } from '../../prisma/prisma.service';
import { REVERSE_GEOCODER, type ReverseGeocoder } from '../../ports/reverse-geocoder.port';

/** A moto andou mais que isto desde o último endereço → geocodifica de novo. */
export const ADDRESS_REFRESH_M = 50;
/** Orçamento por leitura: o que não couber fica para a próxima (no modo aws cada consulta vai à rede, com cache). */
const BUDGET_MS = 1500;

export interface AddressRow {
  id: string;
  lat: number;
  lng: number;
  addressLabel?: string | null;
  addressLat?: number | null;
  addressLng?: number | null;
  addressUpdatedAt?: Date | null;
}

export const needsAddress = (r: AddressRow) =>
  !(r.lat === 0 && r.lng === 0) &&
  (!r.addressLabel || r.addressLat == null || r.addressLng == null || distanceM({ lat: r.addressLat, lng: r.addressLng }, r) > ADDRESS_REFRESH_M);

/**
 * Endereço legível da moto (contrato v2, `Vehicle.address`): gravado na própria linha (`addressLabel` + posição em que foi
 * calculado) e recalculado na leitura quando a moto anda mais de 50 m. A porta já tem cache no Redis por célula de ~11 m.
 */
@Injectable()
export class VehicleAddressService {
  private readonly logger = new Logger('VehicleAddress');

  constructor(
    private readonly prisma: PrismaService,
    @Inject(REVERSE_GEOCODER) private readonly geocoder: ReverseGeocoder,
  ) {}

  /** Preenche/atualiza `addressLabel` das linhas (mutando-as) e grava no banco. Nunca lança. */
  async ensure<T extends AddressRow>(rows: T[]): Promise<T[]> {
    const started = Date.now();
    for (const r of rows) {
      if (!needsAddress(r)) continue;
      if (Date.now() - started > BUDGET_MS) break;
      try {
        const label = await this.geocoder.reverse(r.lat, r.lng);
        if (!label) continue;
        const now = new Date();
        Object.assign(r, { addressLabel: label, addressLat: r.lat, addressLng: r.lng, addressUpdatedAt: now });
        await this.prisma.vehicle.updateMany({ where: { id: r.id }, data: { addressLabel: label, addressLat: r.lat, addressLng: r.lng, addressUpdatedAt: now } });
      } catch (err) {
        this.logger.warn({ msg: 'vehicle_address_failed', vehicleId: r.id, error: (err as Error).message });
      }
    }
    return rows;
  }

  /** Endereço de um ponto qualquer (destino de tarefa de campo). */
  async label(lat: number | null | undefined, lng: number | null | undefined): Promise<string | undefined> {
    if (lat == null || lng == null) return undefined;
    try {
      return (await this.geocoder.reverse(lat, lng)) ?? undefined;
    } catch {
      return undefined;
    }
  }
}
