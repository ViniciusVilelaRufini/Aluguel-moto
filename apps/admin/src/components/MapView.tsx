'use client';

import { useEffect, useRef } from 'react';
import type { Map as MlMap, StyleSpecification } from 'maplibre-gl';
import 'maplibre-gl/dist/maplibre-gl.css';

export const SP_CENTER: [number, number] = [-46.675, -23.563];

/** Tiles OSM com o filtro do design system (saturate .55, brightness 1.06, contrast .92) aplicado só no raster. */
export function baseStyle(): StyleSpecification {
  return {
    version: 8,
    sources: {
      osm: {
        type: 'raster',
        tiles: ['https://tile.openstreetmap.org/{z}/{x}/{y}.png'],
        tileSize: 256,
        maxzoom: 19,
        attribution: '© OpenStreetMap',
      },
    },
    layers: [
      { id: 'bg', type: 'background', paint: { 'background-color': '#F2F3F0' } },
      { id: 'osm', type: 'raster', source: 'osm', paint: { 'raster-saturation': -0.5, 'raster-contrast': -0.1, 'raster-brightness-min': 0.05, 'raster-brightness-max': 1 } },
    ],
  };
}

declare global {
  interface Window {
    /** Exposto para testes e2e (leitura de camadas e simulação de cliques). */
    __voltiMap?: MlMap;
  }
}

export function MapView({ onReady, onDestroy, center = SP_CENTER, zoom = 13.5, className }: {
  onReady: (map: MlMap) => void;
  onDestroy?: () => void;
  center?: [number, number];
  zoom?: number;
  className?: string;
}) {
  const el = useRef<HTMLDivElement>(null);
  const cb = useRef({ onReady, onDestroy });
  cb.current = { onReady, onDestroy };

  useEffect(() => {
    let map: MlMap | undefined;
    let cancelled = false;
    (async () => {
      const ml = await import('maplibre-gl');
      if (cancelled || !el.current) return;
      map = new ml.Map({ container: el.current, style: baseStyle(), center, zoom, attributionControl: { compact: true } });
      map.addControl(new ml.NavigationControl({ showCompass: false }), 'bottom-right');
      window.__voltiMap = map;
      map.on('load', () => map && !cancelled && cb.current.onReady(map));
    })();
    return () => {
      cancelled = true;
      cb.current.onDestroy?.();
      map?.remove();
      if (window.__voltiMap === map) window.__voltiMap = undefined;
    };
    // O mapa é criado uma vez.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return <div ref={el} className={className} style={{ position: 'absolute', inset: 0 }} data-testid="map" />;
}
