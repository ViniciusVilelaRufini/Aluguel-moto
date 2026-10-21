'use client';

import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { io, type Socket } from 'socket.io-client';
import { api, unwrap } from './api';
import { API_BASE_URL } from './config';
import { useAuth } from './auth';
import { getToken } from './token-store';
import type { RealtimeEvents, S } from './types';

type Handler<K extends keyof RealtimeEvents> = (payload: RealtimeEvents[K]) => void;
export type FleetVehicle = S<'Vehicle'>;

interface RealtimeState {
  connected: boolean;
  /** Frota carregada (todas as páginas) com as atualizações ao vivo aplicadas. */
  vehicles: FleetVehicle[];
  vehiclesReady: boolean;
  openAlerts: number;
  on: <K extends keyof RealtimeEvents>(event: K, handler: Handler<K>) => () => void;
}

const Ctx = createContext<RealtimeState | null>(null);
const FLEET_GROUPS = ['admin', 'operacao', 'suporte'];
const LIST_GROUPS = ['admin', 'operacao', 'suporte', 'campo'];

async function loadAllVehicles(): Promise<FleetVehicle[]> {
  const all: FleetVehicle[] = [];
  let cursor: string | undefined;
  for (let i = 0; i < 20; i++) {
    const page = await unwrap(api.GET('/vehicles', { params: { query: { limit: 100, cursor } } }));
    all.push(...page.items);
    cursor = page.nextCursor;
    if (!cursor) break;
  }
  return all;
}

export function RealtimeProvider({ children }: { children: ReactNode }) {
  const { token, groups } = useAuth();
  const qc = useQueryClient();
  const [connected, setConnected] = useState(false);
  const [overrides, setOverrides] = useState<Record<string, Partial<FleetVehicle>>>({});
  const [alertDelta, setAlertDelta] = useState(0);
  const handlers = useRef(new Map<string, Set<(p: never) => void>>());
  const pending = useRef<Record<string, Partial<FleetVehicle>>>({});

  const canList = groups.some((g) => LIST_GROUPS.includes(g));
  const canFleet = groups.some((g) => FLEET_GROUPS.includes(g));

  const vq = useQuery({ queryKey: ['fleet', 'all'], queryFn: loadAllVehicles, enabled: !!token && canList, staleTime: 60_000 });
  const aq = useQuery({
    queryKey: ['alerts', 'open-count'],
    queryFn: async () => {
      const r = await unwrap(api.GET('/alerts', { params: { query: { status: 'open', limit: 100 } } }));
      return r.items.length;
    },
    enabled: !!token && canFleet,
  });

  useEffect(() => { setAlertDelta(0); }, [aq.data]);

  // Atualizações ao vivo agrupadas a cada 500 ms para não renderizar a cada telemetria.
  useEffect(() => {
    const t = setInterval(() => {
      const p = pending.current;
      if (Object.keys(p).length === 0) return;
      pending.current = {};
      setOverrides((o) => {
        const n = { ...o };
        for (const [id, patch] of Object.entries(p)) n[id] = { ...n[id], ...patch };
        return n;
      });
    }, 500);
    return () => clearInterval(t);
  }, []);

  useEffect(() => {
    if (!token || !canFleet) return;
    const socket: Socket = io(`${API_BASE_URL}/realtime`, { auth: (cb) => cb({ token: getToken() ?? token }), transports: ['websocket'] });
    const emit = (event: string, payload: unknown) => handlers.current.get(event)?.forEach((h) => (h as (p: unknown) => void)(payload));
    socket.on('connect', () => {
      setConnected(true);
      qc.invalidateQueries({ queryKey: ['fleet'] });
      qc.invalidateQueries({ queryKey: ['alerts'] });
    });
    socket.on('disconnect', () => setConnected(false));
    socket.on('vehicle.position', (p: RealtimeEvents['vehicle.position']) => {
      pending.current[p.vehicleId] = { ...pending.current[p.vehicleId], lat: p.lat, lng: p.lng, speedKmh: p.speedKmh, batteryPct: p.batteryPct, status: p.status, speedLimitKmh: p.speedLimitKmh, lastSeenAt: p.ts };
      emit('vehicle.position', p);
    });
    socket.on('vehicle.status', (p: RealtimeEvents['vehicle.status']) => {
      pending.current[p.vehicleId] = { ...pending.current[p.vehicleId], status: p.status };
      emit('vehicle.status', p);
      qc.invalidateQueries({ queryKey: ['vehicle', p.vehicleId] });
    });
    socket.on('command.updated', (p: RealtimeEvents['command.updated']) => {
      emit('command.updated', p);
      qc.invalidateQueries({ queryKey: ['vehicle-commands', p.vehicleId] });
    });
    socket.on('alert.created', (p: RealtimeEvents['alert.created']) => {
      setAlertDelta((d) => d + 1);
      emit('alert.created', p);
      qc.invalidateQueries({ queryKey: ['alerts'] });
    });
    return () => { socket.close(); setConnected(false); };
  }, [token, canFleet, qc]);

  const on = useCallback(<K extends keyof RealtimeEvents>(event: K, handler: Handler<K>) => {
    const set = handlers.current.get(event) ?? new Set();
    set.add(handler as (p: never) => void);
    handlers.current.set(event, set);
    return () => { set.delete(handler as (p: never) => void); };
  }, []);

  const vehicles = useMemo(
    () => (vq.data ?? []).map((v) => (overrides[v.id] ? { ...v, ...overrides[v.id] } : v)),
    [vq.data, overrides],
  );

  const value = useMemo<RealtimeState>(
    () => ({ connected, vehicles, vehiclesReady: vq.isSuccess, openAlerts: (aq.data ?? 0) + alertDelta, on }),
    [connected, vehicles, vq.isSuccess, aq.data, alertDelta, on],
  );
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useRealtime(): RealtimeState {
  const v = useContext(Ctx);
  if (!v) throw new Error('useRealtime fora do RealtimeProvider');
  return v;
}

/** Assina um evento enquanto o componente estiver montado. */
export function useRealtimeEvent<K extends keyof RealtimeEvents>(event: K, handler: Handler<K>) {
  const { on } = useRealtime();
  const ref = useRef(handler);
  ref.current = handler;
  useEffect(() => on(event, (p) => ref.current(p)), [on, event]);
}
