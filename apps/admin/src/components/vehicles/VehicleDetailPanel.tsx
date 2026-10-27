'use client';

import { useMemo, useState } from 'react';
import Link from 'next/link';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { api, unwrap } from '@/lib/api';
import { useAuth } from '@/lib/auth';
import { can, canOpen } from '@/lib/permissions';
import { STATUS_LABEL, commandStateLabel } from '@/lib/status';
import { formatDateTime } from '@/lib/format';
import { formatHours, formatKm } from '@/lib/maintenance';
import { toAuditRows } from '@/lib/fleet-copy';
import { buildDepotTransfer, depotName, signalSummary, statusTargets, transferBlockReason } from '@/lib/vehicles-admin';
import type { S } from '@/lib/types';
import { Alert } from '@/ds/Alert';
import { BatteryPill } from '@/ds/BatteryPill';
import { Button } from '@/ds/Button';
import { FleetStatus } from '@/ds/FleetStatus';
import { VehicleFormModal } from '../VehicleFormModal';
import { ErrorNote, Field, KV, Modal, PanelSkeleton, ReasonDialog, SectionTitle, Select, SidePanel, TextArea, useToast } from '../ui';
import { ModelCell } from './VehiclesTable';

type Vehicle = S<'Vehicle'>;
type DepotRef = Pick<S<'Depot'>, 'id' | 'name' | 'active'>;

const COMMAND_LABEL: Record<S<'CommandType'>, string> = { lock: 'Bloquear', unlock: 'Desbloquear', horn: 'Buzina', speed_limit: 'Limitar velocidade', stolen_mode: 'Modo roubada' };

/** Ficha da moto na seção Motos: dados, ações de cadastro (editar, transferir, status), histórico e atalho para o mapa. */
export function VehicleDetailPanel({ vehicleId, depots, models, onClose }: {
  vehicleId: string; depots: readonly DepotRef[]; models: readonly Pick<S<'VehicleModel'>, 'id' | 'photoUrl'>[]; onClose: () => void;
}) {
  const { groups } = useAuth();
  const [dialog, setDialog] = useState<'edit' | 'transfer' | 'status' | null>(null);
  const detail = useQuery({ queryKey: ['vehicle', vehicleId], queryFn: () => unwrap(api.GET('/vehicles/{id}', { params: { path: { id: vehicleId } } })) });
  const isAdmin = groups.includes('admin');
  const audit = useQuery({
    queryKey: ['vehicle-audit', vehicleId, 'motos'],
    enabled: isAdmin,
    queryFn: () => unwrap(api.GET('/audit-logs', { params: { query: { entityId: vehicleId, limit: 10 } } })),
  });
  const commands = useQuery({
    queryKey: ['vehicle-commands', vehicleId, 'motos'],
    enabled: !isAdmin && can(groups, 'vehicle.command'),
    queryFn: () => unwrap(api.GET('/vehicles/{id}/commands', { params: { path: { id: vehicleId }, query: { limit: 10 } } })),
  });
  const auditRows = useMemo(() => toAuditRows(audit.data?.items ?? []), [audit.data]);
  const v = detail.data;

  if (!v) {
    return (
      <SidePanel width={380} onClose={onClose} testId="vehicle-detail">
        {detail.error ? <ErrorNote error={detail.error} onRetry={() => detail.refetch()} /> : <PanelSkeleton rows={8} />}
      </SidePanel>
    );
  }

  const blocked = transferBlockReason(v);
  const targets = statusTargets(v.status);
  return (
    <SidePanel width={380} onClose={onClose} testId="vehicle-detail"
      title={<><div style={{ font: '700 22px/1.1 var(--font-mono)' }} data-testid="vehicle-detail-code">{v.code}</div><div style={{ marginTop: 6 }}><FleetStatus status={v.status} variant="dot" /></div></>}>
      <VehicleFacts v={v} depots={depots} models={models} />

      <div>
        <SectionTitle>Ações</SectionTitle>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {can(groups, 'vehicle.edit') && <Button size="sm" variant="secondary" icon="Pencil" testId="vehicle-detail-edit" onClick={() => setDialog('edit')}>Editar moto</Button>}
          {can(groups, 'vehicle.transfer') && (
            <Button size="sm" variant="secondary" icon="Truck" testId="vehicle-transfer" disabled={!!blocked} onClick={() => setDialog('transfer')}>Transferir de galpão</Button>
          )}
          {can(groups, 'vehicle.status') && targets.length > 0 && (
            <Button size="sm" variant="secondary" icon={v.status === 'free' ? 'Wrench' : 'CircleCheck'} testId="vehicle-status-change" onClick={() => setDialog('status')}>
              {v.status === 'free' ? 'Colocar em manutenção' : 'Liberar para uso'}
            </Button>
          )}
          {canOpen(groups, 'fleet') && (
            <Link href={`/fleet?vehicle=${v.id}`} data-testid="vehicle-on-map" style={{ fontSize: 14, fontWeight: 600, color: 'var(--text-link)' }}>Ver no mapa</Link>
          )}
        </div>
        {blocked && can(groups, 'vehicle.transfer') && <div style={{ fontSize: 12, color: 'var(--text-secondary)', marginTop: 8 }} data-testid="transfer-blocked">{blocked} A transferência fica disponível quando ela estiver livre ou em manutenção.</div>}
        {targets.length === 0 && can(groups, 'vehicle.status') && (
          <div style={{ fontSize: 12, color: 'var(--text-secondary)', marginTop: 8 }}>A situação só alterna entre Livre e Manutenção; agora ela está {STATUS_LABEL[v.status].toLowerCase()}.</div>
        )}
      </div>

      <div data-testid="vehicle-history">
        <SectionTitle>Histórico</SectionTitle>
        {isAdmin ? (
          auditRows.length ? auditRows.map((r) => (
            <div key={r.id} style={{ padding: '8px 0', borderBottom: '1px solid var(--ink-100)' }}>
              <div style={{ fontSize: 14, fontWeight: 600 }}>{r.what}</div>
              <div style={{ fontSize: 12, color: 'var(--text-secondary)' }}>{formatDateTime(r.at)} · {r.who} · {r.why}</div>
            </div>
          )) : <div style={{ fontSize: 13, color: 'var(--text-secondary)' }}>{audit.isLoading ? 'Carregando...' : 'Nenhum registro ainda.'}</div>
        ) : commands.data?.items.length ? commands.data.items.map((c) => (
          <div key={c.id} style={{ padding: '8px 0', borderBottom: '1px solid var(--ink-100)' }}>
            <div style={{ fontSize: 14, fontWeight: 600 }}>{COMMAND_LABEL[c.type]} · {commandStateLabel(c.status, c.statusReason, { type: c.type, controlMode: v.trackerControlMode })}</div>
            <div style={{ fontSize: 12, color: 'var(--text-secondary)' }}>{formatDateTime(c.createdAt)} · {c.requestedByType === 'customer' ? 'Cliente' : (c.requestedByName ?? 'Equipe')} · {c.reason}</div>
          </div>
        )) : <div style={{ fontSize: 13, color: 'var(--text-secondary)' }}>{commands.isLoading ? 'Carregando...' : 'Nenhum comando enviado a esta moto.'}</div>}
        {isAdmin && <Link href="/team" style={{ display: 'inline-block', marginTop: 8, fontSize: 13, fontWeight: 600, color: 'var(--text-link)' }}>Ver auditoria completa</Link>}
      </div>

      {dialog === 'edit' && <VehicleFormModal vehicle={v} onClose={() => setDialog(null)} />}
      {dialog === 'transfer' && <TransferDepotDialog vehicle={v} depots={depots} onClose={() => setDialog(null)} />}
      {dialog === 'status' && targets[0] && <StatusChangeDialog vehicle={v} target={targets[0]} onClose={() => setDialog(null)} />}
    </SidePanel>
  );
}

/** Dados da moto (só apresentação). */
export function VehicleFacts({ v, depots, models }: { v: Vehicle; depots: readonly Pick<S<'Depot'>, 'id' | 'name'>[]; models: readonly Pick<S<'VehicleModel'>, 'id' | 'photoUrl'>[] }) {
  return (
    <div>
      <div style={{ marginBottom: 8 }}><BatteryPill level={v.batteryPct} range={Math.round(v.estimatedRangeKm)} /></div>
      <KV k="Modelo" v={<ModelCell v={v} models={models} />} />
      <KV k="Galpão" v={<span data-testid="vehicle-detail-depot">{depotName(depots, v.depotId)}</span>} />
      <KV k="Situação" v={STATUS_LABEL[v.status]} />
      <KV k="Rastreador" v={v.thingName ?? '—'} mono />
      <KV k="Sinal" v={signalSummary(v)} />
      <KV k="QR" v={v.qrCode ?? '—'} mono />
      <KV k="Bateria" v={v.battery ? `${v.battery.serial} · ${v.battery.cycleCount} ciclos` : (v.batterySerial ?? '—')} mono />
      <KV k="Odômetro" v={formatKm(v.odometerKm)} />
      <KV k="Horas de uso" v={formatHours(v.usageHours)} />
      <KV k="Posição" v={`${v.lat.toFixed(5)}, ${v.lng.toFixed(5)}`} mono />
      {v.createdAt && <KV k="Cadastrada em" v={formatDateTime(v.createdAt)} />}
    </div>
  );
}

/** `POST /vehicles/{id}/transfer-depot`: galpão de destino (ativo) e motivo para a auditoria. */
export function TransferDepotDialog({ vehicle, depots, onClose }: { vehicle: Vehicle; depots: readonly DepotRef[]; onClose: () => void }) {
  const qc = useQueryClient();
  const toast = useToast();
  const [depotId, setDepotId] = useState('');
  const [reason, setReason] = useState('');
  const [err, setErr] = useState<unknown>(null);
  const [busy, setBusy] = useState(false);
  const options = depots.filter((d) => d.active && d.id !== vehicle.depotId);
  const submit = async () => {
    setErr(null);
    const built = buildDepotTransfer(depotId, reason, vehicle.depotId);
    if (!built.ok) { setErr(new Error(built.error)); return; }
    setBusy(true);
    try {
      const saved = await unwrap(api.POST('/vehicles/{id}/transfer-depot', { params: { path: { id: vehicle.id } }, body: built.body }));
      toast(`Moto ${saved.code} transferida para ${depotName(depots, saved.depotId)}`);
      for (const k of ['fleet', 'vehicle', 'vehicles', 'depot-vehicles', 'vehicle-audit']) qc.invalidateQueries({ queryKey: [k] });
      onClose();
    } catch (e) { setErr(e); } finally { setBusy(false); }
  };
  return (
    <Modal open title={`Transferir ${vehicle.code} de galpão`} onClose={onClose} testId="transfer-dialog"
      actions={<><Button size="sm" variant="ghost" onClick={onClose}>Cancelar</Button><Button size="sm" variant="dark" testId="transfer-confirm" disabled={busy} onClick={submit}>{busy ? 'Transferindo...' : 'Transferir'}</Button></>}>
      <div style={{ fontSize: 14, color: 'var(--text-secondary)' }}>
        Hoje em <strong>{depotName(depots, vehicle.depotId)}</strong>. A posição da moto passa a ser a do galpão de destino.
      </div>
      <Field label="Galpão de destino">
        <Select testId="transfer-depot" value={depotId} onChange={setDepotId}
          options={[{ value: '', label: options.length ? 'Selecione o galpão' : 'Nenhum outro galpão ativo' }, ...options.map((d) => ({ value: d.id, label: d.name }))]} />
      </Field>
      <Field label="Motivo" hint="Fica registrado na auditoria.">
        <TextArea testId="transfer-reason" value={reason} onChange={setReason} placeholder="Ex.: rebalanceamento da frota" />
      </Field>
      {vehicle.status === 'maintenance' && <Alert tone="info" icon="Info">A moto continua em manutenção no galpão de destino.</Alert>}
      <ErrorNote error={err} />
    </Modal>
  );
}

/** `POST /vehicles/{id}/status` (livre ↔ manutenção) com motivo. */
function StatusChangeDialog({ vehicle, target, onClose }: { vehicle: Vehicle; target: S<'ServiceVehicleStatus'>; onClose: () => void }) {
  const qc = useQueryClient();
  const toast = useToast();
  const toMaintenance = target === 'maintenance';
  return (
    <ReasonDialog open testId="status-dialog" title={toMaintenance ? `Colocar ${vehicle.code} em manutenção` : `Liberar ${vehicle.code} para uso`}
      description={toMaintenance ? 'A moto sai da oferta aos clientes até ser liberada.' : vehicle.depotId ? 'A moto volta a ficar disponível para retirada no galpão.' : 'A moto volta a aparecer no mapa dos clientes.'}
      confirmLabel={toMaintenance ? 'Colocar em manutenção' : 'Liberar'} onClose={onClose}
      onConfirm={async (reason) => {
        await unwrap(api.POST('/vehicles/{id}/status', { params: { path: { id: vehicle.id } }, body: { status: target, reason } }));
        toast(toMaintenance ? `${vehicle.code} em manutenção` : `${vehicle.code} liberada`);
        for (const k of ['fleet', 'vehicle', 'vehicles', 'depot-vehicles', 'vehicle-audit']) qc.invalidateQueries({ queryKey: [k] });
      }} />
  );
}
