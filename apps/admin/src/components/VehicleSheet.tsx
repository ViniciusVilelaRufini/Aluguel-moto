'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import Link from 'next/link';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { api, unwrap } from '@/lib/api';
import { useAuth } from '@/lib/auth';
import { can, rentalHref } from '@/lib/permissions';
import { useRealtime, useRealtimeEvent } from '@/lib/realtime';
import { commandStateLabel, commandStateTone } from '@/lib/status';
import { formatDateTime, timeAgo } from '@/lib/format';
import { assertSpeedLimit } from '@/lib/speed-limit';
import { MAX_SPEED_KMH, type CommandStatus, type CommandStatusReason, type CommandType, type S } from '@/lib/types';
import { BatteryPill } from '@/ds/BatteryPill';
import { Badge } from '@/ds/Badge';
import { Button } from '@/ds/Button';
import { FleetStatus } from '@/ds/FleetStatus';
import { Alert } from '@/ds/Alert';
import { CommandTimeline } from './CommandTimeline';
import { commandOutcome } from '@/lib/command-steps';
import { commandSentMessage, signalLabel, toAuditRows } from '@/lib/fleet-copy';
import { MAINTENANCE_STATUS, RENTAL_STATUS } from '@/lib/labels';
import { Field, KV, Modal, PanelSkeleton, ReasonDialog, SectionTitle, SidePanel, Pill, TextInput, Select, DataTable, useToast } from './ui';

interface ActiveCommand { id: string; type: CommandType; status: CommandStatus; reason?: CommandStatusReason }

const COMMAND_LABEL: Record<CommandType, string> = {
  lock: 'Bloquear', unlock: 'Desbloquear', horn: 'Buzina', speed_limit: 'Limitar velocidade', stolen_mode: 'Modo roubada',
};

export function VehicleSheet({ vehicleId, onClose, onReplay, replayActive }: {
  vehicleId: string; onClose: () => void; onReplay: () => void; replayActive: boolean;
}) {
  const { groups } = useAuth();
  const { vehicles } = useRealtime();
  const qc = useQueryClient();
  const toast = useToast();
  const canCommand = can(groups, 'vehicle.command');
  const [dialog, setDialog] = useState<CommandType | null>(null);
  const [active, setActive] = useState<ActiveCommand | null>(null);
  const [history, setHistory] = useState(false);

  useEffect(() => { setActive(null); }, [vehicleId]);

  // Avisa quando o comando termina (confirmado pela moto ou falhou), mesmo que o operador esteja olhando o mapa.
  const announced = useRef<string | null>(null);
  useEffect(() => {
    if (!active) return;
    const out = commandOutcome(COMMAND_LABEL[active.type], active.status);
    const key = `${active.id}:${active.status}`;
    if (out && announced.current !== key) { announced.current = key; toast(out.msg, out.tone); }
  }, [active, toast]);

  const detail = useQuery({ queryKey: ['vehicle', vehicleId], queryFn: () => unwrap(api.GET('/vehicles/{id}', { params: { path: { id: vehicleId } } })) });
  const live = vehicles.find((v) => v.id === vehicleId);
  const v: S<'Vehicle'> | undefined = detail.data ? { ...detail.data, ...(live ?? {}) } : live;

  const commands = useQuery({
    queryKey: ['vehicle-commands', vehicleId],
    queryFn: () => unwrap(api.GET('/vehicles/{id}/commands', { params: { path: { id: vehicleId }, query: { limit: 5 } } })),
    enabled: canCommand || groups.includes('suporte'),
  });

  // Cliente do aluguel atual (aluguel -> cliente); só quem pode abrir clientes (admin, suporte).
  const canSeeCustomer = groups.includes('admin') || groups.includes('suporte');
  const currentRentalId = v?.currentRentalId;
  const rental = useQuery({
    queryKey: ['rental', currentRentalId],
    enabled: !!currentRentalId && canSeeCustomer,
    queryFn: () => unwrap(api.GET('/rentals/{id}', { params: { path: { id: currentRentalId! } } })),
  });
  const customerId = rental.data?.customerId;
  const customer = useQuery({
    queryKey: ['customer', customerId],
    enabled: !!customerId,
    queryFn: () => unwrap(api.GET('/customers/{id}', { params: { path: { id: customerId! } } })),
  });

  // Log de auditoria completo (comandos, sistema e campo) só para o admin; os demais veem os comandos.
  const isAdmin = groups.includes('admin');
  const audit = useQuery({
    queryKey: ['vehicle-audit', vehicleId],
    enabled: isAdmin,
    queryFn: () => unwrap(api.GET('/audit-logs', { params: { query: { entityId: vehicleId, limit: 5 } } })),
  });
  const auditRows = useMemo(() => toAuditRows(audit.data?.items ?? []), [audit.data]);

  useRealtimeEvent('command.updated', (p) => {
    if (p.vehicleId !== vehicleId) return;
    setActive((a) => (a && a.id === p.commandId ? { ...a, status: p.status, reason: p.reason } : a));
  });

  // Fallback por consulta enquanto o comando estiver pendente (caso o evento se perca).
  const pendingId = active && (active.status === 'pending' || active.status === 'in_progress') ? active.id : null;
  useEffect(() => {
    if (!pendingId) return;
    const t = setInterval(async () => {
      try {
        const c = await unwrap(api.GET('/commands/{id}', { params: { path: { id: pendingId } } }));
        setActive((a) => (a && a.id === c.id ? { ...a, status: c.status, reason: c.statusReason } : a));
        if (c.status === 'confirmed' || c.status === 'failed') qc.invalidateQueries({ queryKey: ['vehicle-commands', vehicleId] });
      } catch { /* mantém o último estado */ }
    }, 2500);
    return () => clearInterval(t);
  }, [pendingId, qc, vehicleId]);

  if (!v) return <SidePanel width={360} onClose={onClose}><PanelSkeleton rows={7} /></SidePanel>;

  const moving = (v.speedKmh ?? 0) >= 3;
  const send = async (type: CommandType, reason: string, extra: { speedLimitKmh?: number; on?: boolean }) => {
    // Última barreira: nenhum chamador envia limite fora de 0..32 km/h.
    if (type === 'speed_limit') assertSpeedLimit(extra.speedLimitKmh);
    const cmd = await unwrap(api.POST('/vehicles/{id}/commands', { params: { path: { id: vehicleId } }, body: { type, reason, ...extra } }));
    setActive({ id: cmd.id, type, status: cmd.status, reason: cmd.statusReason });
    toast(commandSentMessage(type, extra));
    qc.invalidateQueries({ queryKey: ['vehicle-commands', vehicleId] });
  };

  return (
    <SidePanel
      width={360}
      onClose={onClose}
      testId="vehicle-sheet"
      title={
        <>
          <div style={{ font: '700 22px/1.1 var(--font-mono)' }} data-testid="vehicle-code">{v.code}</div>
          <div style={{ marginTop: 6 }}><FleetStatus status={v.status} variant="dot" /></div>
        </>
      }
    >
      <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
        <BatteryPill level={v.batteryPct} range={Math.round(v.estimatedRangeKm)} />
        <Badge tone="neutral" icon="Gauge">{Math.round(v.speedKmh ?? 0)} km/h</Badge>
        <Badge tone="neutral">Limite {v.speedLimitKmh} km/h</Badge>
      </div>
      <div>
        <KV k="Último sinal" v={v.lastSeenAt ? timeAgo(v.lastSeenAt) : '—'} />
        <KV k="GPS / 4G" v={signalLabel(v.online, v.signal)} />
        <KV k="Cliente" v={v.currentRentalId ? (customer.data?.name ?? (canSeeCustomer && (rental.isLoading || customer.isLoading) ? '...' : '—')) : '—'} />
        <KV k="Aluguel" v={v.currentRentalId ? (rentalHref(groups, v.currentRentalId) ? <Link href={rentalHref(groups, v.currentRentalId)!} style={{ color: 'var(--text-link)', fontWeight: 600 }}>Ver aluguel atual</Link> : 'Em andamento') : '—'} />
        <KV k="Posição" v={`${v.lat.toFixed(4)}, ${v.lng.toFixed(4)}`} mono />
        <KV k="Travada" v={v.locked === undefined ? '—' : v.locked ? 'Sim' : 'Não'} />
        <KV k="Modo roubada" v={v.stolenMode ? 'Ligado' : 'Desligado'} />
        <KV k="Firmware" v={v.firmwareVersion ?? '—'} mono />
      </div>

      {canCommand ? (
        <div>
          <SectionTitle>Comandos remotos</SectionTitle>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
            <Button size="sm" variant="danger" icon="Lock" testId="cmd-lock" onClick={() => setDialog('lock')}>Bloquear</Button>
            <Button size="sm" variant="secondary" icon="LockOpen" testId="cmd-unlock" onClick={() => setDialog('unlock')}>Desbloquear</Button>
            <Button size="sm" variant="secondary" icon="Megaphone" testId="cmd-horn" style={{ color: 'var(--text-primary)', borderColor: 'var(--border-strong)' }} onClick={() => setDialog('horn')}>Buzina</Button>
            <Button size="sm" variant="secondary" icon="Gauge" testId="cmd-speed" style={{ color: 'var(--text-primary)', borderColor: 'var(--border-strong)' }} onClick={() => setDialog('speed_limit')}>Limitar vel.</Button>
          </div>
          <Button size="sm" variant="dark" icon="ShieldAlert" fullWidth style={{ marginTop: 8 }} testId="cmd-stolen" onClick={() => setDialog('stolen_mode')}>Modo roubada</Button>
          <div style={{ fontSize: 12, color: 'var(--text-secondary)', marginTop: 8 }}>Sem sinal, o comando fica pendente e é aplicado ao reconectar.</div>
          {active && (
            <div key={active.id} className="section-in" style={{ marginTop: 12, padding: '12px 12px 10px', borderRadius: 'var(--radius-md)', background: 'var(--surface-sunken)', display: 'flex', flexDirection: 'column', gap: 10 }}>
              <div data-testid="command-state" data-status={active.status} data-reason={active.reason ?? ''} role="status" style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                <span style={{ fontSize: 13, fontWeight: 600 }}>{COMMAND_LABEL[active.type]}:</span>
                <Pill tone={commandStateTone(active.status, active.reason)}>{commandStateLabel(active.status, active.reason)}</Pill>
              </div>
              <CommandTimeline status={active.status} reason={active.reason} />
            </div>
          )}
        </div>
      ) : (
        <Alert tone="info" icon="Info">Seu perfil não envia comandos para a moto.</Alert>
      )}

      {(can(groups, 'vehicle.command') || groups.includes('suporte')) && (
        <div style={{ display: 'flex', gap: 8 }}>
          {can(groups, 'vehicle.command') && <Button size="sm" variant="ghost" icon="Play" style={{ paddingLeft: 0 }} testId="replay-toggle" onClick={onReplay}>{replayActive ? 'Fechar replay' : 'Replay de trajeto'}</Button>}
          <Button size="sm" variant="ghost" icon="History" onClick={() => setHistory(true)}>Histórico</Button>
        </div>
      )}

      {isAdmin && auditRows.length > 0 ? (
        <div data-testid="audit-log">
          <SectionTitle>Log de auditoria</SectionTitle>
          {auditRows.map((r) => (
            <div key={r.id} style={{ display: 'flex', gap: 10, padding: '8px 0', borderBottom: '1px solid var(--ink-100)' }}>
              <span style={{ font: '500 12px/1.4 var(--font-mono)', color: 'var(--text-secondary)' }}>{formatDateTime(r.at).slice(-5)}</span>
              <div>
                <div style={{ fontSize: 14, fontWeight: 600 }}>{r.what}</div>
                <div style={{ fontSize: 12, color: 'var(--text-secondary)' }}>{r.who} · {r.why}</div>
              </div>
            </div>
          ))}
          <Link href="/team" style={{ display: 'inline-block', marginTop: 8, fontSize: 13, fontWeight: 600, color: 'var(--text-link)' }}>Ver auditoria completa</Link>
        </div>
      ) : commands.data && commands.data.items.length > 0 && (
        <div data-testid="audit-log">
          <SectionTitle>Log de auditoria</SectionTitle>
          {commands.data.items.map((c) => (
            <div key={c.id} style={{ display: 'flex', gap: 10, padding: '8px 0', borderBottom: '1px solid var(--ink-100)' }}>
              <span style={{ font: '500 12px/1.4 var(--font-mono)', color: 'var(--text-secondary)' }}>{formatDateTime(c.createdAt).slice(-5)}</span>
              <div>
                <div style={{ fontSize: 14, fontWeight: 600 }}>{COMMAND_LABEL[c.type]} · {commandStateLabel(c.status, c.statusReason)}</div>
                <div style={{ fontSize: 12, color: 'var(--text-secondary)' }}>{c.requestedByName ?? 'Sistema'} · {c.reason}</div>
              </div>
            </div>
          ))}
        </div>
      )}

      {dialog && <CommandDialog type={dialog} vehicle={v} moving={moving} onClose={() => setDialog(null)} onSend={send} />}
      {history && <HistoryModal vehicleId={vehicleId} code={v.code} groups={groups} onClose={() => setHistory(false)} />}
    </SidePanel>
  );
}

function CommandDialog({ type, vehicle, moving, onClose, onSend }: {
  type: CommandType; vehicle: S<'Vehicle'>; moving: boolean; onClose: () => void;
  onSend: (type: CommandType, reason: string, extra: { speedLimitKmh?: number; on?: boolean }) => Promise<void>;
}) {
  const [limit, setLimit] = useState('20');
  const [on, setOn] = useState<'on' | 'off'>('on');
  const [limitError, setLimitError] = useState<string | undefined>();
  const offline = vehicle.online === false || vehicle.status === 'offline';

  const description = useMemo(() => {
    switch (type) {
      case 'lock': return 'A moto reduz a potência aos poucos e só trava abaixo de 3 km/h. Nunca corta o motor em movimento.';
      case 'unlock': return 'Libera a moto para uso.';
      case 'horn': return 'Aciona a buzina da moto.';
      case 'speed_limit': return 'Define o limite de velocidade da moto. O máximo permitido é 32 km/h.';
      case 'stolen_mode': return 'Bloqueia a moto e passa a enviar a posição a cada 5 segundos.';
    }
  }, [type]);

  return (
    <ReasonDialog
      open
      testId="command-dialog"
      title={`${COMMAND_LABEL[type]} ${vehicle.code}`}
      description={description}
      confirmLabel="Confirmar e enviar"
      danger={type === 'lock' || type === 'stolen_mode'}
      onClose={onClose}
      onConfirm={async (reason) => {
        const extra: { speedLimitKmh?: number; on?: boolean } = {};
        if (type === 'speed_limit') {
          const n = limit.trim() === '' ? undefined : Number(limit);
          try { assertSpeedLimit(n); } catch (e) { setLimitError((e as Error).message); throw e; }
          extra.speedLimitKmh = n;
        }
        if (type === 'stolen_mode') extra.on = on === 'on';
        setLimitError(undefined);
        await onSend(type, reason, extra);
      }}
    >
      {type === 'lock' && moving && (
        <Alert tone="warning" icon="TriangleAlert">A moto está a {Math.round(vehicle.speedKmh ?? 0)} km/h. O comando fica pendente até a velocidade cair abaixo de 3 km/h.</Alert>
      )}
      {offline && (
        <Alert tone="warning" icon="WifiOff">Moto offline — será aplicado ao reconectar.</Alert>
      )}
      {type === 'speed_limit' && (
        <Field label="Limite (km/h)" error={limitError}>
          <TextInput testId="speed-limit-input" type="number" min={0} max={MAX_SPEED_KMH} value={limit} onChange={setLimit} />
        </Field>
      )}
      {type === 'stolen_mode' && (
        <Field label="Modo roubada">
          <Select value={on} onChange={setOn} options={[{ value: 'on', label: 'Ligar' }, { value: 'off', label: 'Desligar' }]} />
        </Field>
      )}
    </ReasonDialog>
  );
}

function HistoryModal({ vehicleId, code, groups, onClose }: { vehicleId: string; code: string; groups: S<'StaffGroup'>[]; onClose: () => void }) {
  const rentals = useQuery({ queryKey: ['vehicle-rentals', vehicleId], queryFn: () => unwrap(api.GET('/rentals', { params: { query: { vehicleId, limit: 10 } } })) });
  const maint = useQuery({ queryKey: ['vehicle-maint', vehicleId], queryFn: () => unwrap(api.GET('/maintenance/tasks', { params: { query: { vehicleId, limit: 10 } } })) });
  return (
    <Modal open title={`Histórico de ${code}`} onClose={onClose} width={560}
      actions={<Button size="sm" variant="ghost" onClick={onClose}>Fechar</Button>}>
      <SectionTitle>Aluguéis</SectionTitle>
      <DataTable dense loading={rentals.isLoading} rows={rentals.data?.items ?? []} empty="Nenhum aluguel desta moto" emptyIcon="Bike"
        columns={[
          { key: 'startedAt', label: 'Início', render: (r) => formatDateTime(r.startedAt) },
          { key: 'status', label: 'Situação', render: (r) => <Pill tone={RENTAL_STATUS[r.status][1]}>{RENTAL_STATUS[r.status][0]}</Pill> },
          { key: 'id', label: '', align: 'right', render: (r) => { const h = rentalHref(groups, r.id); return h ? <Link href={h} style={{ color: 'var(--text-link)', fontWeight: 600 }}>Abrir</Link> : null; } },
        ]} />
      <SectionTitle>Manutenção</SectionTitle>
      <DataTable dense loading={maint.isLoading} rows={maint.data?.items ?? []} empty="Nenhuma manutenção registrada" emptyIcon="Wrench"
        columns={[
          { key: 'title', label: 'Serviço' },
          { key: 'kind', label: 'Tipo', render: (r) => (r.kind === 'preventive' ? 'Preventiva' : 'Corretiva') },
          { key: 'status', label: 'Situação', render: (r) => <Pill tone={MAINTENANCE_STATUS[r.status][1]}>{MAINTENANCE_STATUS[r.status][0]}</Pill> },
        ]} />
    </Modal>
  );
}
