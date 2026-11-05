import { describe, expect, it, vi } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';
import type { S } from '@/lib/types';

/**
 * Bancada J16: a ficha da moto mostrava a cópia velha da lista da frota por cima do GET /vehicles/{id}.
 * Renderiza a VehicleSheet com a frota (60 s velha) discordando da consulta da ficha: a ficha vence.
 */

const fresh: S<'Vehicle'> = {
  id: 'v1', code: 'VLT-0059', model: 'Volti Flash', status: 'free', lat: -23.5, lng: -46.6, batteryPct: 0, batteryKnown: false,
  estimatedRangeKm: 0, speedLimitKmh: 32, online: true, locked: true, lastSeenAt: '2026-11-03T12:00:30.000Z',
  createdAt: '2026-11-03T10:00:00.000Z', trackerControlMode: 'relay_only', address: null, addressUpdatedAt: null,
};
const staleFleetCopy: S<'Vehicle'> = {
  ...fresh, batteryPct: 63, batteryKnown: true, estimatedRangeKm: 31, locked: false, online: false, speedLimitKmh: 32,
  address: 'R. Antiga, 10', addressUpdatedAt: '2026-11-03T09:00:00.000Z',
};

vi.mock('@/lib/auth', () => ({ useAuth: () => ({ groups: ['admin'] }) }));
vi.mock('@/lib/realtime', () => ({ useRealtime: () => ({ vehicles: [staleFleetCopy] }), useRealtimeEvent: () => {} }));
vi.mock('next/navigation', () => ({ useRouter: () => ({ replace() {}, push() {} }), useSearchParams: () => new URLSearchParams() }));
vi.mock('@tanstack/react-query', async (orig) => {
  const real = await orig<typeof import('@tanstack/react-query')>();
  return {
    ...real,
    useQuery: (o: { queryKey: unknown[]; enabled?: boolean }) => ({ data: o.queryKey[0] === 'vehicle' ? fresh : undefined, isLoading: false, error: null }),
    useQueryClient: () => ({ invalidateQueries() {}, setQueryData() {} }),
    useMutation: () => ({ mutateAsync: async () => ({}), mutate() {}, isPending: false, error: null }),
  };
});

describe('VehicleSheet (J16)', () => {
  it('o GET /vehicles/{id} vence a cópia da frota: travada, bateria desconhecida, sem endereço, sem limite de velocidade', async () => {
    const { VehicleSheet } = await import('@/components/VehicleSheet');
    const html = renderToStaticMarkup(<VehicleSheet vehicleId="v1" onClose={() => {}} onReplay={() => {}} replayActive={false} />);
    const text = html.replace(/<[^>]*>/g, '|');
    expect(text).toContain('Bateria desconhecida');
    expect(text).not.toContain('63%');
    expect(text).toContain('Sem controle de velocidade');
    expect(text).not.toContain('Limite 32 km/h');
    expect(text).toContain('Sem endereço');
    expect(text).not.toContain('R. Antiga');
    expect(html).not.toContain('vehicle-address-updated');
    expect(text).toMatch(/Travada\|+Sim/);
  });
});
