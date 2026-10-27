'use client';

import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { io, type Socket } from 'socket.io-client';
import { api, unwrap } from './api';
import { API_BASE_URL } from './config';
import { pendingAlertCount } from './fleet-copy';
import { useAuth } from './auth';
import { alertVisibleTo } from './permissions';
import { getToken } from './token-store';
import type { RealtimeEvents, S } from './types';

type Handler<K extends keyof RealtimeEvents> = (payload: RealtimeEvents[K]) => void;
export type FleetVehicle = S<'Vehicle'>;
interface LiveOverride { at: number; patch: Partial<FleetVehicle> }

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
  // Cada atualização ao vivo guarda quando chegou: se a frota recarregou depois disso, o dado do servidor é mais novo.
  const [overrides, setOverrides] = useState<Record<string, LiveOverride>>({});
  const [alertDelta, setAlertDelta] = useState(0);
  const handlers = useRef(new Map<string, Set<(p: never) => void>>());
  const pending = useRef<Record<string, LiveOverride>>({});
  // Quando a frota foi carregada pela última vez (lido dentro de setters e handlers). `at` usa o relógio do navegador:
  // com relógio errado a comparação com dataUpdatedAt (também do navegador) continua coerente entre si, mas não com o servidor.
  const fleetAt = useRef(0);

  const canList = groups.some((g) => LIST_GROUPS.includes(g));
  const canFleet = groups.some((g) => FLEET_GROUPS.includes(g));
  // Task 14: o financeiro vê os alertas de pagamento (socket só com a sala `alerts:finance`; consulta a cada 60 s de reserva).
  const canFinanceAlerts = groups.includes('financeiro');
  const groupsRef = useRef(groups);
  groupsRef.current = groups;

  const vq = useQuery({ queryKey: ['fleet', 'all'], queryFn: loadAllVehicles, enabled: !!token && canList, staleTime: 60_000 });
  fleetAt.current = vq.dataUpdatedAt;
  /** Campos ao vivo anteriores só valem se chegaram depois da última carga da frota; senão trariam posição velha por cima da nova. */
  const liveBase = (prev?: LiveOverride) => (prev && prev.at >= fleetAt.current ? prev.patch : undefined);
  const aq = useQuery({
    queryKey: ['alerts', 'open-count'],
    queryFn: async () => {
      // Pendentes = abertos + atribuídos. Total real do servidor (não o tamanho da primeira página de /alerts).
      const r = await unwrap(api.GET('/reports/dashboard'));
      return r.openAlerts;
    },
    enabled: !!token && (canFleet || canFinanceAlerts),
    refetchInterval: !canFleet && canFinanceAlerts ? 60_000 : false,
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
        for (const [id, o] of Object.entries(p)) n[id] = { at: o.at, patch: { ...liveBase(n[id]), ...o.patch } };
        return n;
      });
    }, 500);
    return () => clearInterval(t);
  }, []);

  useEffect(() => {
    if (!token || !(canFleet || canFinanceAlerts)) return;
    const socket: Socket = io(`${API_BASE_URL}/realtime`, { auth: (cb) => cb({ token: getToken() ?? token }), transports: ['websocket'] });
    const emit = (event: string, payload: unknown) => handlers.current.get(event)?.forEach((h) => (h as (p: unknown) => void)(payload));
    socket.on('connect', () => {
      setConnected(true);
      qc.invalidateQueries({ queryKey: ['fleet'] });
      qc.invalidateQueries({ queryKey: ['alerts'] });
    });
    socket.on('disconnect', () => setConnected(false));
    socket.on('vehicle.position', (p: RealtimeEvents['vehicle.position']) => {
      pending.current[p.vehicleId] = { at: Date.now(), patch: { ...liveBase(pending.current[p.vehicleId]), lat: p.lat, lng: p.lng, speedKmh: p.speedKmh, batteryPct: p.batteryPct, status: p.status, speedLimitKmh: p.speedLimitKmh, lastSeenAt: p.ts } };
      emit('vehicle.position', p);
    });
    socket.on('vehicle.status', (p: RealtimeEvents['vehicle.status']) => {
      pending.current[p.vehicleId] = { at: Date.now(), patch: { ...liveBase(pending.current[p.vehicleId]), status: p.status } };
      emit('vehicle.status', p);
      qc.invalidateQueries({ queryKey: ['vehicle', p.vehicleId] });
    });
    socket.on('command.updated', (p: RealtimeEvents['command.updated']) => {
      emit('command.updated', p);
      qc.invalidateQueries({ queryKey: ['vehicle-commands', p.vehicleId] });
      // Comando concluído muda o estado da moto (ex.: travada): recarrega a ficha, a frota e a lista de Motos.
      if (p.status === 'confirmed') {
        qc.invalidateQueries({ queryKey: ['vehicle', p.vehicleId] });
        qc.invalidateQueries({ queryKey: ['fleet'] });
        qc.invalidateQueries({ queryKey: ['vehicles'] });
      }
    });
    socket.on('alert.created', (p: RealtimeEvents['alert.created']) => {
      if (!alertVisibleTo(groupsRef.current, p.type)) return;
      setAlertDelta((d) => d + 1);
      emit('alert.created', p);
      qc.invalidateQueries({ queryKey: ['alerts'] });
    });
    return () => { socket.close(); setConnected(false); };
  }, [token, canFleet, canFinanceAlerts, qc]);

  const on = useCallback(<K extends keyof RealtimeEvents>(event: K, handler: Handler<K>) => {
    const set = handlers.current.get(event) ?? new Set();
    set.add(handler as (p: never) => void);
    handlers.current.set(event, set);
    return () => { set.delete(handler as (p: never) => void); };
  }, []);

  const vehicles = useMemo(
    () => (vq.data ?? []).map((v) => {
      const o = overrides[v.id];
      return o && o.at >= vq.dataUpdatedAt ? { ...v, ...o.patch } : v;
    }),
    [vq.data, vq.dataUpdatedAt, overrides],
  );

  const value = useMemo<RealtimeState>(
    () => ({ connected, vehicles, vehiclesReady: vq.isSuccess, openAlerts: pendingAlertCount(aq.data, alertDelta), on }),
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
