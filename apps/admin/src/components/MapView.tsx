'use client';

import { useEffect, useRef, useState } from 'react';
import type { Map as MlMap, StyleSpecification } from 'maplibre-gl';
import 'maplibre-gl/dist/maplibre-gl.css';
import { Button } from '@/ds/Button';
import { MAP_LOAD_TIMEOUT_MS, startMapLoad, type MapLoadState } from '@/lib/map-load';

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

export { MAP_LOAD_TIMEOUT_MS };
export type { MapLoadState };

/** Aviso por cima do mapa. Só o estado de carregamento ignora cliques (KPIs e filtros por cima continuam clicáveis). */
export function MapOverlay({ state, onRetry }: { state: MapLoadState; onRetry: () => void }) {
  if (state === 'ready') return null;
  if (state === 'loading') {
    return (
      <div data-testid="map-loading" role="status" aria-live="polite" className="skeleton"
        style={{ position: 'absolute', inset: 0, pointerEvents: 'none', display: 'flex', alignItems: 'center', justifyContent: 'center', borderRadius: 0, background: 'var(--surface-sunken)', color: 'var(--text-secondary)', font: 'var(--type-caption)', fontWeight: 600 }}>
        Carregando mapa…
      </div>
    );
  }
  return (
    <div data-testid="map-error" role="alert"
      style={{ position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column', gap: 12, alignItems: 'center', justifyContent: 'center', background: 'var(--surface-sunken)', color: 'var(--text-secondary)', font: 'var(--type-caption)', fontWeight: 600 }}>
      <span>Não foi possível carregar o mapa.</span>
      <Button size="sm" variant="secondary" icon="RefreshCw" testId="map-retry" onClick={onRetry}>Tentar de novo</Button>
    </div>
  );
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
  // Revisão (item 6): os tiles levam alguns segundos; até o 'load', um aviso no lugar do mapa em branco.
  const [state, setState] = useState<MapLoadState>('loading');
  const [attempt, setAttempt] = useState(0);
  cb.current = { onReady, onDestroy };

  useEffect(() => {
    let created: MlMap | undefined;
    const dispose = startMapLoad<MlMap>({
      createMap: async () => {
        const ml = await import('maplibre-gl');
        if (!el.current) throw new Error('container ausente');
        const map = new ml.Map({ container: el.current, style: baseStyle(), center, zoom, attributionControl: { compact: true } });
        map.addControl(new ml.NavigationControl({ showCompass: false }), 'bottom-right');
        window.__voltiMap = created = map;
        return map;
      },
      onState: setState,
      onReady: (map) => cb.current.onReady(map),
      onDestroy: () => cb.current.onDestroy?.(),
    });
    return () => {
      dispose();
      if (created && window.__voltiMap === created) window.__voltiMap = undefined;
    };
    // O mapa é criado uma vez (e de novo a cada "Tentar de novo").
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [attempt]);

  const retry = () => { setState('loading'); setAttempt((n) => n + 1); };

  return (
    <>
      <div ref={el} className={className} style={{ position: 'absolute', inset: 0 }} data-testid="map" />
      <MapOverlay state={state} onRetry={retry} />
    </>
  );
}
