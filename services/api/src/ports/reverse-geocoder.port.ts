// services/api/src/ports/reverse-geocoder.port.ts
/**
 * Geocodificação reversa (contrato v2: `Vehicle.address`, `FieldTask.vehicleAddress`/`targetAddress`).
 * `GEOCODER_MODE=local`: ruas de São Paulo em memória (sem rede). `GEOCODER_MODE=aws`: Amazon Location
 * `SearchPlaceIndexForPosition`. O resultado passa por cache no Redis (ver `CachedReverseGeocoder`).
 */
export const REVERSE_GEOCODER = Symbol('REVERSE_GEOCODER');

export interface ReverseGeocoder {
  /** Endereço legível em pt-BR (`R. Teodoro Sampaio, 1020 · Pinheiros, São Paulo`) ou `null` se não houver. */
  reverse(lat: number, lng: number): Promise<string | null>;
}
