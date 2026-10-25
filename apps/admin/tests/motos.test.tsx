import { describe, expect, it, vi } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';
import { readFileSync } from 'node:fs';
import path from 'node:path';
import type { S } from '@/lib/types';
import {
  buildDepotTransfer, defaultQr, depotName, freeBatteries, nextVehicleCode, signalSummary, statusTargets, suggestThingName, transferBlockReason, vehicleListQuery, EMPTY_FILTERS,
} from '@/lib/vehicles-admin';
import { can, canOpen, homeFor, menuFor } from '@/lib/permissions';
import { AUDIT_ACTION_LABEL } from '@/lib/audit-labels';
import { auditWhat } from '@/lib/fleet-copy';

/**
 * Seção Motos (Task 31): cadastro com galpão, lista, ficha, transferência de galpão e status. Componentes renderizados
 * com react-dom/server sobre respostas simuladas no formato do contrato (packages/contracts/openapi.yaml).
 */

const D1 = 'd0000000-0000-4000-8000-000000000001';
const D2 = 'd0000000-0000-4000-8000-000000000002';
const M1 = 'm0000000-0000-4000-8000-000000000001';
const depots: S<'Depot'>[] = [
  { id: D1, name: 'Galpão Pinheiros', district: 'Pinheiros', address: 'R. A, 1', lat: -23.56, lng: -46.69, timezone: 'America/Sao_Paulo', openingHours: [], pickupNowWindowMinutes: 120, maxScheduleDays: 7, scheduledGraceMinutes: 30, active: true },
  { id: D2, name: 'Galpão Mooca', address: 'R. B, 2', lat: -23.55, lng: -46.6, timezone: 'America/Sao_Paulo', openingHours: [], pickupNowWindowMinutes: 120, maxScheduleDays: 7, scheduledGraceMinutes: 30, active: true },
];
const models = [{ id: M1, name: 'Volti Flash', categoryLabel: 'Urbana', photoUrl: 'https://minio.local/catalogo/flash.jpg?sig=1' }] as S<'VehicleModel'>[];
const vehicle: S<'Vehicle'> = {
  id: 'v0000000-0000-4000-8000-000000000001', code: 'VLT-0061', model: 'Volti Flash', vehicleModelId: M1, status: 'free', lat: -23.56, lng: -46.69, batteryPct: 88,
  estimatedRangeKm: 44, speedLimitKmh: 32, thingName: 'moto-0061', qrCode: 'volti://v/VLT-0061', depotId: D1, online: true, lastSeenAt: new Date(Date.now() - 120_000).toISOString(),
  odometerKm: 1234.4, usageHours: 50, createdAt: '2026-10-25T12:00:00.000Z',
};
const battery = (p: Partial<S<'Battery'>>): S<'Battery'> => ({ id: p.serial ?? 'b', serial: 'BT-1', chargePct: 100, cycleCount: 0, status: 'charged', updatedAt: '2026-10-25T12:00:00.000Z', ...p });

// Consultas e contexto do painel simulados.
const groupsRef: { current: S<'StaffGroup'>[] } = { current: ['operacao'] };
vi.mock('@/lib/auth', () => ({ useAuth: () => ({ groups: groupsRef.current }) }));
vi.mock('@/lib/realtime', () => ({ useRealtime: () => ({ vehicles: [{ code: 'VLT-0009' }, { code: 'VLT-0060' }, { code: 'VLT-0002' }] }) }));
vi.mock('next/navigation', () => ({ useRouter: () => ({ replace() {}, push() {} }), useSearchParams: () => new URLSearchParams() }));
vi.mock('@tanstack/react-query', async (orig) => {
  const real = await orig<typeof import('@tanstack/react-query')>();
  const data: Record<string, unknown> = {
    'vehicle-models': { items: models },
    depots: { items: [...depots, { ...depots[1], id: 'inativo', name: 'Galpão Fechado', active: false }] },
    batteries: { items: [battery({ serial: 'BT-LIVRE', chargePct: 97, depotId: D2 }), battery({ serial: 'BT-NA-MOTO', vehicleId: 'x' }), battery({ serial: 'BT-CARREGANDO', status: 'charging' })] },
    vehicle: vehicle,
    'vehicle-audit': { items: [{ id: 'a1', actorType: 'staff', actorName: 'Ana', action: 'vehicle.transfer_depot', entityType: 'Vehicle', entityId: vehicle.id, reason: 'Rebalanceamento', createdAt: '2026-10-25T13:00:00.000Z' }] },
  };
  return {
    ...real,
    useQuery: (o: { queryKey: unknown[]; enabled?: boolean }) => ({ data: o.enabled === false ? undefined : data[String(o.queryKey[0])], isLoading: false, error: null, refetch() {} }),
    useQueryClient: () => ({ invalidateQueries() {} }),
  };
});

describe('regras da seção Motos', () => {
  it('próximo código: maior VLT + 1 com 4 dígitos; rastreador e QR sugeridos', () => {
    expect(nextVehicleCode(['VLT-0009', 'VLT-0060', 'lixo', 'VLT-0002'])).toBe('VLT-0061');
    expect(nextVehicleCode([])).toBe('VLT-0001');
    expect(nextVehicleCode(['VLT-9999'])).toBe('VLT-10000');
    expect(suggestThingName('VLT-0061')).toBe('moto-0061');
    expect(suggestThingName('xx')).toBe('');
    expect(defaultQr('VLT-0061')).toBe('volti://v/VLT-0061');
  });

  it('bateria no cadastro: só carregadas e livres, mais carregada primeiro', () => {
    const r = freeBatteries([battery({ serial: 'A', chargePct: 90 }), battery({ serial: 'B', chargePct: 99 }), battery({ serial: 'C', vehicleId: 'v' }), battery({ serial: 'D', status: 'defective' })]);
    expect(r.map((b) => b.serial)).toEqual(['B', 'A']);
  });

  it('transferência: só livre/manutenção e sem aluguel; destino diferente e motivo obrigatório', () => {
    expect(transferBlockReason({ status: 'free' })).toBeNull();
    expect(transferBlockReason({ status: 'maintenance' })).toBeNull();
    expect(transferBlockReason({ status: 'rented', currentRentalId: 'r1' })).toMatch(/aluguel/);
    expect(transferBlockReason({ status: 'reserved' })).toMatch(/livre ou em manutenção/);
    expect(transferBlockReason({ status: 'awaiting_pickup' })).not.toBeNull();
    expect(buildDepotTransfer('', 'Motivo', D1)).toEqual({ ok: false, error: 'Escolha o galpão de destino' });
    expect(buildDepotTransfer(D1, 'Motivo', D1)).toEqual({ ok: false, error: 'A moto já está neste galpão' });
    expect(buildDepotTransfer(D2, ' x ', D1)).toMatchObject({ ok: false });
    expect(buildDepotTransfer(D2, ' Rebalanceamento ', D1)).toEqual({ ok: true, body: { depotId: D2, reason: 'Rebalanceamento' } });
  });

  it('status manual: alterna livre e manutenção; outros estados não têm ação', () => {
    expect(statusTargets('free')).toEqual(['maintenance']);
    expect(statusTargets('maintenance')).toEqual(['free']);
    expect(statusTargets('rented')).toEqual([]);
  });

  it('query da lista: só filtros preenchidos, busca aparada', () => {
    expect(vehicleListQuery(EMPTY_FILTERS)).toEqual({ limit: 25 });
    expect(vehicleListQuery({ q: ' VLT-00 ', depotId: D1, status: 'free', vehicleModelId: M1 }, 'c1')).toEqual({ limit: 25, cursor: 'c1', q: 'VLT-00', depotId: D1, status: 'free', vehicleModelId: M1 });
  });

  it('sinal e galpão em texto', () => {
    const now = Date.parse('2026-10-25T12:10:00.000Z');
    expect(signalSummary({ online: true, lastSeenAt: '2026-10-25T12:08:00.000Z' }, now)).toBe('Online · há 2 min');
    expect(signalSummary({ online: false, lastSeenAt: '2026-10-25T09:10:00.000Z' }, now)).toBe('Sem sinal · há 3 h');
    expect(signalSummary({ online: false })).toBe('Nunca conectou');
    expect(depotName(depots, D2)).toBe('Galpão Mooca');
    expect(depotName(depots, undefined)).toBe('Na rua');
  });

  it('menu Motos logo depois da Frota ao vivo, para admin e operação; ação de transferir idem', () => {
    expect(menuFor(['operacao']).map((m) => m.key).slice(0, 2)).toEqual(['fleet', 'vehicles']);
    expect(canOpen(['admin'], 'vehicles')).toBe(true);
    for (const g of ['suporte', 'financeiro', 'campo'] as const) expect(canOpen([g], 'vehicles')).toBe(false);
    expect(can(['operacao'], 'vehicle.transfer')).toBe(true);
    expect(can(['suporte'], 'vehicle.transfer')).toBe(false);
    expect(homeFor(['operacao'])).toBe('/fleet');
  });

  it('auditoria: rótulo da transferência de galpão', () => {
    expect(AUDIT_ACTION_LABEL['vehicle.transfer_depot']).toBe('Moto transferida de galpão');
    expect(auditWhat('vehicle.transfer_depot')).toBe('Transferência de galpão');
  });
});

describe('componentes da seção Motos', () => {
  it('lista: código, modelo com foto do catálogo, galpão, situação, bateria, sinal e odômetro', async () => {
    const { VehiclesTable } = await import('@/components/vehicles/VehiclesTable');
    const html = renderToStaticMarkup(<VehiclesTable rows={[vehicle, { ...vehicle, id: 'v2', code: 'VLT-0062', depotId: undefined, vehicleModelId: undefined, model: 'Volti S1', online: false, lastSeenAt: undefined }]} depots={depots} models={models} onSelect={() => {}} />);
    expect(html).toContain('VLT-0061');
    expect(html).toContain('https://minio.local/catalogo/flash.jpg?sig=1');
    expect(html).toContain('Galpão Pinheiros');
    expect(html).toContain('Na rua');
    expect(html).toContain('Online · há 2 min');
    expect(html).toContain('Nunca conectou');
    expect(html).toMatch(/1\.234 km/);
    for (const h of ['Código', 'Modelo', 'Galpão', 'Situação', 'Bateria', 'Sinal', 'Odômetro']) expect(html).toContain(`>${h}<`);
  });

  it('lista vazia: com filtro sugere limpar; sem filtro sugere cadastrar', async () => {
    const { VehiclesTable } = await import('@/components/vehicles/VehiclesTable');
    expect(renderToStaticMarkup(<VehiclesTable rows={[]} depots={depots} models={models} onSelect={() => {}} filtered />)).toContain('Nenhuma moto com estes filtros');
    expect(renderToStaticMarkup(<VehiclesTable rows={[]} depots={depots} models={models} onSelect={() => {}} />)).toContain('Cadastrar moto');
  });

  it('cadastro: código sugerido, galpão obrigatório só com galpões ativos, ajuda do rastreador, QR automático e baterias livres', async () => {
    const { VehicleFormModal, THING_HINT } = await import('@/components/VehicleFormModal');
    const html = renderToStaticMarkup(<VehicleFormModal onClose={() => {}} />);
    expect(html).toContain('Cadastrar moto');
    expect(html).toContain('value="VLT-0061"');
    expect(html).toContain('Próximo livre: VLT-0061');
    expect(html).toContain('value="moto-0061"');
    expect(html).toContain('data-testid="vehicle-depot"');
    expect(html).toContain('Galpão Pinheiros · Pinheiros');
    expect(html).not.toContain('Galpão Fechado');
    expect(html).toContain(THING_HINT.replace(/\s/g, ' '));
    expect(THING_HINT).toMatch(/simulador assume qualquer moto cadastrada em até 60 s/);
    expect(html).toContain('Vazio: gerado como volti://v/VLT-0061');
    expect(html).toContain('BT-LIVRE · 97% · Galpão Mooca');
    expect(html).not.toContain('BT-NA-MOTO');
    expect(html).not.toContain('BT-CARREGANDO');
    expect(html).toContain('Bateria nova (digitar a série)');
  });

  it('edição: sem galpão nem bateria; código somente leitura; correções de odômetro/horas', async () => {
    const { VehicleFormModal } = await import('@/components/VehicleFormModal');
    const html = renderToStaticMarkup(<VehicleFormModal vehicle={vehicle} onClose={() => {}} />);
    expect(html).toContain('Editar moto VLT-0061');
    expect(html).not.toContain('data-testid="vehicle-depot"');
    expect(html).not.toContain('vehicle-battery-choice');
    expect(html).toContain('data-testid="vehicle-odometer"');
  });

  it('ficha: dados, galpão, ações de editar/transferir/manutenção, atalho do mapa e histórico', async () => {
    groupsRef.current = ['admin'];
    const { VehicleDetailPanel } = await import('@/components/vehicles/VehicleDetailPanel');
    const html = renderToStaticMarkup(<VehicleDetailPanel vehicleId={vehicle.id} depots={depots} models={models} onClose={() => {}} />);
    expect(html).toContain('Galpão Pinheiros');
    expect(html).toContain('moto-0061');
    expect(html).toContain('Editar moto');
    expect(html).toContain('Transferir de galpão');
    expect(html).toContain('Colocar em manutenção');
    expect(html).toContain('href="/fleet?vehicle=v0000000-0000-4000-8000-000000000001"');
    expect(html).toContain('Transferência de galpão');
    expect(html).toContain('Rebalanceamento');
    groupsRef.current = ['operacao'];
  });

  it('transferência: só galpões ativos diferentes do atual, motivo para a auditoria', async () => {
    const { TransferDepotDialog } = await import('@/components/vehicles/VehicleDetailPanel');
    const html = renderToStaticMarkup(<TransferDepotDialog vehicle={vehicle} depots={[...depots, { id: 'x', name: 'Galpão Fechado', active: false }]} onClose={() => {}} />);
    expect(html).toContain('Transferir VLT-0061 de galpão');
    expect(html).toContain('Hoje em <strong>Galpão Pinheiros</strong>');
    expect(html).toContain('>Galpão Mooca<');
    expect(html).not.toContain(`<option value="${D1}"`);
    expect(html).not.toContain('Galpão Fechado');
    expect(html).toContain('Fica registrado na auditoria.');
  });

  it('o atalho do mapa abre o mesmo formulário da seção Motos (sem segundo formulário na frota)', () => {
    const fleet = readFileSync(path.resolve(__dirname, '../src/app/(panel)/fleet/page.tsx'), 'utf8');
    expect(fleet).not.toContain('VehicleFormModal');
    expect(fleet).toContain("router.push('/motos?new=1')");
  });
});
