import type { GeoJSONSource, Map as MlMap } from 'maplibre-gl';
import { DEPOT_ICON, registerDepotImage } from './map-icons';
import type { S } from './types';

export const DEPOT_SRC = 'depots';
export const DEPOT_LAYER = 'depots-pin';

/** Galpões como pontos (nome e endereço nas propriedades para a dica do mapa). */
export function depotFeatures(depots: Pick<S<'Depot'>, 'id' | 'name' | 'address' | 'lat' | 'lng' | 'active'>[]): GeoJSON.FeatureCollection {
  return {
    type: 'FeatureCollection',
    features: depots.map((d) => ({
      type: 'Feature',
      geometry: { type: 'Point', coordinates: [d.lng, d.lat] },
      properties: { id: d.id, name: d.name, address: d.address, active: d.active },
    })),
  };
}

/** Fonte e camada do pino do galpão (âncora embaixo: o cluster de motos do galpão fica visível sob a ponta). */
export function addDepotLayer(map: MlMap): void {
  registerDepotImage(map);
  if (!map.getSource(DEPOT_SRC)) map.addSource(DEPOT_SRC, { type: 'geojson', data: { type: 'FeatureCollection', features: [] } });
  if (!map.getLayer(DEPOT_LAYER)) {
    map.addLayer({
      id: DEPOT_LAYER, type: 'symbol', source: DEPOT_SRC,
      layout: { 'icon-image': DEPOT_ICON, 'icon-anchor': 'bottom', 'icon-allow-overlap': true, 'icon-ignore-placement': true },
      paint: { 'icon-opacity': ['case', ['==', ['get', 'active'], false], 0.45, 1] as never },
    });
  }
}

export function setDepots(map: MlMap, depots: Parameters<typeof depotFeatures>[0]): void {
  (map.getSource(DEPOT_SRC) as GeoJSONSource | undefined)?.setData(depotFeatures(depots));
}
