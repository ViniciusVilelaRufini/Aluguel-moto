'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import Link from 'next/link';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { api, unwrap } from '@/lib/api';
import { useAuth } from '@/lib/auth';
import { can, rentalHref } from '@/lib/permissions';
import { useRealtime, useRealtimeEvent } from '@/lib/realtime';
import { commandStateLabel, commandStateTone } from '@/lib/status';
import { commandSupported, lockDescription, lockMovingWarning, TRACKER_CONTROL_LABEL, unsupportedDescribedBy, unsupportedHint } from '@/lib/tracker';
import { GPS_SLEEP_LOCK_WARNING, addressView, batteryView, gpsView, positionView, sheetVehicle, speedLimitChip } from '@/lib/vehicle-live';
import { useNow } from '@/lib/use-now';
import { RelayOnlyNotice } from './vehicles/RelayOnlyNotice';
import { TrackerSection } from './trackers/TrackerSection';
import { TrackerConsole } from './tracker/TrackerConsole';
import { formatDateTime, timeAgo } from '@/lib/format';
import { assertSpeedLimit } from '@/lib/speed-limit';
import { MAX_SPEED_KMH, type CommandStatus, type CommandStatusReason, type CommandType, type S } from '@/lib/types';
import { BatteryPill } from '@/ds/BatteryPill';
import { Badge } from '@/ds/Badge';
import { Button } from '@/ds/Button';
import { FleetStatus } from '@/ds/FleetStatus';
import { Alert } from '@/ds/Alert';
import { CommandTimeline } from './CommandTimeline';
import { commandOutcome, restoredCommand } from '@/lib/command-steps';
import { auditHref, auditTime, commandSentMessage, signalLabel, stolenModeDescription, toAuditRows } from '@/lib/fleet-copy';
import { MAINTENANCE_STATUS, RENTAL_STATUS } from '@/lib/labels';
import { SERVICE_STATUS, formatHours, formatKm, maintenanceOrigin, nextServiceLabel } from '@/lib/maintenance';
import { ForceEndRentalDialog } from './ForceEndRentalDialog';
import { CounterSettleDialog } from './CounterSettleDialog';
import { ReturnHandoverDialog } from './depots/ReturnHandoverDialog';
import { CollectArrival } from './depots/CollectArrival';
import { canReceiveAtDepot } from '@/lib/return-handover';
import { SubscriptionVehicleDialog } from './SubscriptionVehicleDialog';
import { VehicleFormModal } from './VehicleFormModal';
import { Field, FieldError, KV, Modal, PanelSkeleton, ReasonDialog, SectionTitle, SidePanel, Pill, Skeleton, TextInput, Select, DataTable, useToast } from './ui';

/** `stale`: restaurado do histórico, em curso há mais de 3 min sem desfecho (órfão provável) — "sem confirmação". */
interface ActiveCommand { id: string; type: CommandType; status: CommandStatus; reason?: CommandStatusReason; stale?: true }

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
  const [moveFixed, setMoveFixed] = useState(false);
  const [editing, setEditing] = useState(false);
  /** Aluguel do "Encerrar à força" aberto (guardado no clique: a ficha relida perde o `currentRentalId` ao encerrar). */
  const [forceEnd, setForceEnd] = useState<string | null>(null);
  /** "Receber no galpão" e, depois dele, o "Acertar no balcão" do mesmo aluguel (guardados no clique, como acima). */
  const [receiving, setReceiving] = useState<string | null>(null);
  const [settling, setSettling] = useState<string | null>(null);

  // P3: ao reabrir a ficha, o comando ainda em curso volta (lido do histórico de comandos), em vez de sumir.
  const restored = useRef<string | null>(null);
  useEffect(() => { setActive(null); restored.current = null; }, [vehicleId]);
  // P1-8: "Último sinal" e a idade da posição avançam com a ficha aberta.
  const now = useNow(15_000);

  // Avisa quando o comando termina (confirmado pela moto ou falhou), mesmo que o operador esteja olhando o mapa.
  const announced = useRef<string | null>(null);
  useEffect(() => {
    if (!active || active.stale) return;
    const out = commandOutcome(COMMAND_LABEL[active.type], active.status, active.reason);
    const key = `${active.id}:${active.status}`;
    if (out && announced.current !== key) { announced.current = key; toast(out.msg, out.tone); }
  }, [active, toast]);

  const detail = useQuery({ queryKey: ['vehicle', vehicleId], queryFn: () => unwrap(api.GET('/vehicles/{id}', { params: { path: { id: vehicleId } } })) });
  // O GET /vehicles/{id} é a fonte: ele vence em todo campo que traz. A cópia da frota (`live`, até 60 s velha) só
  // aparece enquanto a ficha carrega; os eventos ao vivo (vehicle.position/state) entram direto no cache da ficha.
  const live = vehicles.find((v) => v.id === vehicleId);
  const v: S<'Vehicle'> | undefined = sheetVehicle(detail.data, live);
  const mode = v?.trackerControlMode;

  const commands = useQuery({
    queryKey: ['vehicle-commands', vehicleId],
    queryFn: () => unwrap(api.GET('/vehicles/{id}/commands', { params: { path: { id: vehicleId }, query: { limit: 5 } } })),
    enabled: canCommand || groups.includes('suporte'),
  });
  useEffect(() => {
    if (!commands.data || restored.current === vehicleId) return;
    restored.current = vehicleId;
    const r = restoredCommand(commands.data.items);
    if (r) {
      // O histórico é a fonte do comando em curso; não sobrescreve um comando enviado agora. Sem toast do estado restaurado.
      setActive((a) => a ?? r);
      announced.current = `${r.id}:${r.status}`;
    }
  }, [commands.data, vehicleId]);

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
    setActive((a) => (a && a.id === p.commandId ? { id: a.id, type: a.type, status: p.status, reason: p.reason } : a));
  });

  // Fallback por consulta enquanto o comando estiver pendente (caso o evento se perca).
  const pendingId = active && !active.stale && (active.status === 'pending' || active.status === 'in_progress') ? active.id : null;
  useEffect(() => {
    if (!pendingId) return;
    const t = setInterval(async () => {
      try {
        const c = await unwrap(api.GET('/commands/{id}', { params: { path: { id: pendingId } } }));
        setActive((a) => (a && a.id === c.id ? { ...a, status: c.status, reason: c.statusReason } : a));
        if (c.status === 'confirmed' || c.status === 'failed') qc.invalidateQueries({ queryKey: ['vehicle-commands', vehicleId] });
        if (c.status === 'confirmed') {
          qc.invalidateQueries({ queryKey: ['vehicle', vehicleId] });
          qc.invalidateQueries({ queryKey: ['fleet'] });
          qc.invalidateQueries({ queryKey: ['vehicles'] });
        }
      } catch { /* mantém o último estado */ }
    }, 2500);
    return () => clearInterval(t);
  }, [pendingId, qc, vehicleId]);

  if (!v) return <SidePanel width={360} onClose={onClose} label="Ficha da moto"><PanelSkeleton rows={7} /></SidePanel>;

  const pos = positionView(v, now);
  const gps = gpsView(v, now);
  // Velocidade de uma posição velha (sem GPS) não é a atual: o aviso de "em movimento" só com posição fresca.
  const moving = !pos.stale && (v.speedKmh ?? 0) >= 3;
  const address = addressView(v);
  // L4: até o GET /vehicles/{id} chegar, a cópia da frota pode estar velha (até 60 s) ou sem os campos do rastreador.
  const loadingDetail = !detail.data && !detail.isError;
  const lockedNow = v.locked === true;
  const lockInFlight = !!active && !active.stale && active.type === 'lock' && (active.status === 'pending' || active.status === 'in_progress');
  const send = async (type: CommandType, reason: string, extra: { speedLimitKmh?: number; on?: boolean }) => {
    // Última barreira: nenhum chamador envia limite fora de 0..32 km/h.
    if (type === 'speed_limit') assertSpeedLimit(extra.speedLimitKmh);
    const cmd = await unwrap(api.POST('/vehicles/{id}/commands', { params: { path: { id: vehicleId } }, body: { type, reason, ...extra } }));
    setActive({ id: cmd.id, type, status: cmd.status, reason: cmd.statusReason });
    toast(commandSentMessage(type, extra, mode));
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
        {loadingDetail ? (
          <span data-testid="sheet-chips-loading" role="status" aria-label="Carregando bateria e limite" style={{ display: 'inline-flex', gap: 8 }}>
            <Skeleton w={150} h={30} r={15} /><Skeleton w={70} h={30} r={15} /><Skeleton w={110} h={30} r={15} />
          </span>
        ) : (
          <>
            <BatteryPill level={v.batteryPct} range={Math.round(v.estimatedRangeKm)} known={batteryView(v).known} />
            <Badge tone="neutral" icon="Gauge"><span data-testid="vehicle-speed">{pos.speedText}</span></Badge>
            <Badge tone="neutral">{speedLimitChip(v)}</Badge>
          </>
        )}
      </div>
      <div>
        <KV k="Último sinal" v={v.lastSeenAt ? timeAgo(v.lastSeenAt, now) : '—'} />
        <KV k="GPS / 4G" v={signalLabel(v.online, v.signal)} />
        <KV k="GPS" v={<span data-testid="vehicle-gps" data-gps-state={gps.state}>{gps.text}</span>} />
        <KV k="Cliente" v={!v.currentRentalId ? '—' : !canSeeCustomer ? 'Restrito' : (customer.data?.name ?? (rental.isLoading || customer.isLoading ? '...' : '—'))} />
        <KV k="Aluguel" v={v.currentRentalId ? (rentalHref(groups, v.currentRentalId) ? <Link href={rentalHref(groups, v.currentRentalId)!} style={{ color: 'var(--text-link)', fontWeight: 600 }}>Ver aluguel atual</Link> : 'Em andamento') : '—'} />
        <KV k="Endereço" v={v.address ? (
          <span style={{ display: 'inline-flex', flexDirection: 'column', alignItems: 'flex-end' }}>
            <span data-testid="vehicle-address">{address.text}</span>
            {address.updatedAt && <span data-testid="vehicle-address-updated" style={{ fontSize: 12, fontWeight: 500, color: 'var(--text-secondary)' }}>atualizado {timeAgo(address.updatedAt)}</span>}
          </span>
        ) : address.text} />
        <KV k="Posição" v={pos.note ? (
          <span style={{ display: 'inline-flex', flexDirection: 'column', alignItems: 'flex-end' }}>
            <span>{`${v.lat.toFixed(4)}, ${v.lng.toFixed(4)}`}</span>
            <span data-testid="vehicle-position-stale" style={{ fontSize: 12, fontWeight: 500, fontFamily: 'var(--font-sans)', color: 'var(--warning-ink)' }}>{pos.note}</span>
          </span>
        ) : `${v.lat.toFixed(4)}, ${v.lng.toFixed(4)}`} mono />
        <KV k="Modelo" v={v.categoryLabel ? `${v.model} · ${v.categoryLabel}` : v.model} />
        <KV k="Km desde revisão" v={v.service ? (
          <span data-testid="vehicle-service" style={{ display: 'inline-flex', gap: 6, alignItems: 'center' }}>
            {formatKm(v.service.kmSinceService)}<Pill tone={SERVICE_STATUS[v.service.status][1]}>{SERVICE_STATUS[v.service.status][0]}</Pill>
          </span>
        ) : '—'} />
        {v.service && <KV k="Horas de uso" v={`${formatHours(v.service.hoursSinceService)} desde a revisão · ${formatHours(v.usageHours ?? v.service.usageHours)} no total`} />}
        {v.service && <KV k="Próxima revisão" v={nextServiceLabel(v.service)} />}
        <KV k="Bateria" v={v.battery ? <span data-testid="vehicle-battery" style={{ fontFamily: 'var(--font-mono)' }}>{v.battery.serial} · {v.battery.cycleCount} ciclos</span> : (v.batterySerial ?? '—')} />
        {v.assignedSubscriptionId && <KV k="Moto fixa" v={<span style={{ display: 'inline-flex', gap: 6, alignItems: 'center' }}><Pill tone="info" icon="Repeat">Plano semanal/mensal</Pill>{can(groups, 'subscription.assignVehicle') && <Button size="sm" variant="ghost" testId="move-fixed" style={{ height: 26, padding: '0 6px' }} onClick={() => setMoveFixed(true)}>Trocar</Button>}</span>} />}
        <KV k="Travada" v={v.locked === undefined ? '—' : v.locked ? 'Sim' : 'Não'} />
        <KV k="Modo roubada" v={v.stolenMode ? 'Ligado' : 'Desligado'} />
        <KV k="Firmware" v={v.firmwareVersion ?? '—'} mono />
        <KV k="Rastreador" v={<span data-testid="tracker-mode">{v.trackerControlMode ? TRACKER_CONTROL_LABEL[v.trackerControlMode] : '—'}</span>} />
      </div>

      {canCommand ? (
        <div>
          <SectionTitle>Comandos remotos</SectionTitle>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
            {/* P3: com um bloqueio em curso, não manda outro. Já travada continua habilitado (a trava reportada pode não ser a
                física: J16 com "RELAY 1 OK" sem estalo); o diálogo avisa. */}
            <Button size="sm" variant="danger" icon="Lock" testId="cmd-lock" disabled={lockInFlight} title={lockInFlight ? 'Bloqueio em andamento' : lockedNow ? 'A moto já consta como travada' : undefined} onClick={() => setDialog('lock')}>Bloquear</Button>
            <Button size="sm" variant="secondary" icon="LockOpen" testId="cmd-unlock" onClick={() => setDialog('unlock')}>Desbloquear</Button>
            <Button size="sm" variant="secondary" icon="Megaphone" testId="cmd-horn" disabled={!commandSupported('horn', mode)} title={commandSupported('horn', mode) ? undefined : unsupportedHint('horn')} ariaDescribedBy={unsupportedDescribedBy('horn', mode)} style={{ color: 'var(--text-primary)', borderColor: 'var(--border-strong)' }} onClick={() => setDialog('horn')}>Buzina</Button>
            <Button size="sm" variant="secondary" icon="Gauge" testId="cmd-speed" disabled={!commandSupported('speed_limit', mode)} title={commandSupported('speed_limit', mode) ? undefined : unsupportedHint('speed_limit')} ariaDescribedBy={unsupportedDescribedBy('speed_limit', mode)} style={{ color: 'var(--text-primary)', borderColor: 'var(--border-strong)' }} onClick={() => setDialog('speed_limit')}>Limitar vel.</Button>
          </div>
          <Button size="sm" variant="dark" icon="ShieldAlert" fullWidth style={{ marginTop: 8 }} testId="cmd-stolen" onClick={() => setDialog('stolen_mode')}>Modo roubada</Button>
          <div style={{ fontSize: 12, color: 'var(--text-secondary)', marginTop: 8 }}>Sem sinal, o comando fica pendente e é aplicado ao reconectar.</div>
          <RelayOnlyNotice mode={mode} />
          {active && (
            <div key={active.id} className="section-in" style={{ marginTop: 12, padding: '12px 12px 10px', borderRadius: 'var(--radius-md)', background: 'var(--surface-sunken)', display: 'flex', flexDirection: 'column', gap: 10 }}>
              <div data-testid="command-state" data-status={active.status} data-reason={active.reason ?? ''} role="status" style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                <span style={{ fontSize: 13, fontWeight: 600 }}>{COMMAND_LABEL[active.type]}:</span>
                {active.stale
                  ? <Pill tone="warning">sem confirmação</Pill>
                  : <Pill tone={commandStateTone(active.status, active.reason)}>{commandStateLabel(active.status, active.reason, { type: active.type, controlMode: mode })}</Pill>}
              </div>
              {!active.stale && <CommandTimeline status={active.status} reason={active.reason} />}
            </div>
          )}
        </div>
      ) : (
        <Alert tone="info" icon="Info">Seu perfil não envia comandos para a moto.</Alert>
      )}

      <TrackerSection vehicleId={vehicleId} vehicleCode={v.code} groups={groups} controlMode={v.trackerControlMode} trackerId={v.trackerId} simCard={v.simCard} />
      <TrackerConsole vehicleId={vehicleId} groups={groups} mode={mode} simApn={v.simCard?.apn ?? null} />

      {/* A moto que não trava (ex.: sem GPS em local coberto) prende o aluguel em "encerrando": a saída fica aqui, sem abrir o aluguel. */}
      {/* O cliente devolve no balcão: o atendente registra a chegada (checklist, fotos, bateria) e o aluguel encerra. */}
      {v.currentRentalId && (canReceiveAtDepot(groups, v) || can(groups, 'rental.forceEnd')) && (
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          {canReceiveAtDepot(groups, v) && (
            <Button size="sm" variant="secondary" icon="PackageCheck" testId="vehicle-receive-depot" onClick={() => setReceiving(v.currentRentalId ?? null)}>Receber no galpão</Button>
          )}
          {can(groups, 'rental.forceEnd') && (
            <Button size="sm" variant="danger" icon="Square" testId="vehicle-force-end" onClick={() => setForceEnd(v.currentRentalId ?? null)}>Encerrar aluguel à força</Button>
          )}
        </div>
      )}

      {/* Cliente devolveu fora do galpão: a equipe trouxe a moto e o atendente conclui o recolhimento aqui. */}
      <CollectArrival vehicle={v} />

      {(can(groups, 'vehicle.command') || groups.includes('suporte')) && (
        <div style={{ display: 'flex', gap: 8 }}>
          {can(groups, 'vehicle.command') && <Button size="sm" variant="ghost" icon="Play" style={{ paddingLeft: 0 }} testId="replay-toggle" onClick={onReplay}>{replayActive ? 'Fechar replay' : 'Replay de trajeto'}</Button>}
          <Button size="sm" variant="ghost" icon="History" onClick={() => setHistory(true)}>Histórico</Button>
        </div>
      )}
      {can(groups, 'vehicle.edit') && <Button size="sm" variant="ghost" icon="Pencil" testId="vehicle-edit" style={{ alignSelf: 'flex-start', paddingLeft: 0 }} onClick={() => setEditing(true)}>Editar moto</Button>}

      {isAdmin && auditRows.length > 0 ? (
        <div data-testid="audit-log">
          <SectionTitle>Log de auditoria</SectionTitle>
          {auditRows.map((r) => (
            <div key={r.id} style={{ display: 'flex', gap: 10, padding: '8px 0', borderBottom: '1px solid var(--ink-100)' }}>
              <span style={{ font: '500 12px/1.4 var(--font-mono)', color: 'var(--text-secondary)', whiteSpace: 'nowrap' }}>{auditTime(r.at)}</span>
              <div>
                <div style={{ fontSize: 14, fontWeight: 600 }}>{r.what}</div>
                <div style={{ fontSize: 12, color: 'var(--text-secondary)' }}>{r.who} · {r.why}</div>
              </div>
            </div>
          ))}
          <Link href={auditHref(vehicleId)} style={{ display: 'inline-block', marginTop: 8, fontSize: 13, fontWeight: 600, color: 'var(--text-link)' }}>Ver auditoria completa</Link>
        </div>
      ) : commands.data && commands.data.items.length > 0 && (
        <div data-testid="audit-log">
          <SectionTitle>Log de auditoria</SectionTitle>
          {commands.data.items.map((c) => (
            <div key={c.id} style={{ display: 'flex', gap: 10, padding: '8px 0', borderBottom: '1px solid var(--ink-100)' }}>
              <span style={{ font: '500 12px/1.4 var(--font-mono)', color: 'var(--text-secondary)', whiteSpace: 'nowrap' }}>{auditTime(c.createdAt)}</span>
              <div>
                <div style={{ fontSize: 14, fontWeight: 600 }}>{COMMAND_LABEL[c.type]} · {commandStateLabel(c.status, c.statusReason, { type: c.type, controlMode: mode })}</div>
                <div style={{ fontSize: 12, color: 'var(--text-secondary)' }}>{/* Nome do cliente só para quem pode ver clientes (admin, suporte); operação vê "Cliente". */}{c.requestedByType === 'customer' ? (canSeeCustomer && c.requestedByName ? c.requestedByName : 'Cliente') : (c.requestedByName ?? (c.requestedByType === 'system' ? 'Sistema' : 'Equipe'))} · {c.reason}</div>
              </div>
            </div>
          ))}
        </div>
      )}

      {dialog && <CommandDialog type={dialog} vehicle={v} mode={mode} moving={moving} speedUnknown={pos.stale || v.speedKmh == null} onClose={() => setDialog(null)} onSend={send} />}
      {moveFixed && v.assignedSubscriptionId && <SubscriptionVehicleDialog subscriptionId={v.assignedSubscriptionId} currentCode={v.code} onClose={() => setMoveFixed(false)} />}
      {forceEnd && <ForceEndRentalDialog rentalId={forceEnd} vehicleId={vehicleId} open onClose={() => setForceEnd(null)} />}
      {receiving && <ReturnHandoverDialog rentalId={receiving} vehicle={v} onClose={() => setReceiving(null)}
        onDone={(r) => { setReceiving(null); if (r.settle) setSettling(r.rentalId); }} />}
      {settling && <CounterSettleDialog rentalId={settling} onClose={() => setSettling(null)} />}
      {editing && <VehicleFormModal vehicle={v} onClose={() => setEditing(false)} />}
      {history && <HistoryModal vehicleId={vehicleId} code={v.code} groups={groups} onClose={() => setHistory(false)} />}
    </SidePanel>
  );
}

export function CommandDialog({ type, vehicle, mode, moving, speedUnknown, onClose, onSend }: {
  type: CommandType; vehicle: S<'Vehicle'>; mode: S<'Vehicle'>['trackerControlMode']; moving: boolean; speedUnknown: boolean; onClose: () => void;
  onSend: (type: CommandType, reason: string, extra: { speedLimitKmh?: number; on?: boolean }) => Promise<void>;
}) {
  const [limit, setLimit] = useState('20');
  const [on, setOn] = useState<'on' | 'off'>('on');
  const [limitError, setLimitError] = useState<string | undefined>();
  const offline = vehicle.online === false || vehicle.status === 'offline';

  const description = useMemo(() => {
    switch (type) {
      case 'lock': return lockDescription(mode);
      case 'unlock': return 'Libera a moto para uso.';
      case 'horn': return 'Aciona a buzina da moto.';
      case 'speed_limit': return 'Define o limite de velocidade da moto. O máximo permitido é 32 km/h.';
      case 'stolen_mode': return stolenModeDescription(mode);
    }
  }, [type, mode]);

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
          try { assertSpeedLimit(n); } catch (e) { setLimitError((e as Error).message); throw new FieldError((e as Error).message); }
          extra.speedLimitKmh = n;
        }
        if (type === 'stolen_mode') extra.on = on === 'on';
        setLimitError(undefined);
        await onSend(type, reason, extra);
      }}
    >
      {type === 'lock' && vehicle.locked === true && (
        <Alert tone="info" icon="Lock">A moto já consta como travada. Reenvie só se ela não estiver travada de fato.</Alert>
      )}
      {type === 'lock' && speedUnknown && (
        <Alert tone="warning" icon="TriangleAlert">Velocidade desconhecida (sem GPS recente) — a moto só trava parada.</Alert>
      )}
      {type === 'lock' && vehicle.gpsSleep === true && (
        <Alert tone="warning" icon="TriangleAlert" testId="gps-sleep-warning">{GPS_SLEEP_LOCK_WARNING}</Alert>
      )}
      {type === 'lock' && moving && (
        <Alert tone="warning" icon="TriangleAlert">A moto está a {Math.round(vehicle.speedKmh ?? 0)} km/h. {lockMovingWarning(mode)}</Alert>
      )}
      {offline && (
        <Alert tone="warning" icon="WifiOff">Moto offline — o comando será aplicado ao reconectar.</Alert>
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
  const maint = useQuery({ queryKey: ['vehicle-maint', vehicleId], enabled: can(groups, 'maintenance.view'), queryFn: () => unwrap(api.GET('/maintenance/tasks', { params: { query: { vehicleId, limit: 10 } } })) });
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
      {can(groups, 'maintenance.view') && <>
      <SectionTitle>Manutenção</SectionTitle>
      <DataTable dense loading={maint.isLoading} rows={maint.data?.items ?? []} empty="Nenhuma manutenção registrada" emptyIcon="Wrench"
        columns={[
          { key: 'title', label: 'Serviço' },
          { key: 'kind', label: 'Tipo', render: (r) => (r.kind === 'preventive' ? 'Preventiva' : 'Corretiva') },
          { key: 'source', label: 'Origem', render: (r) => maintenanceOrigin(r, groups.includes('admin') || groups.includes('suporte')) },
          { key: 'status', label: 'Situação', render: (r) => <Pill tone={MAINTENANCE_STATUS[r.status][1]}>{MAINTENANCE_STATUS[r.status][0]}</Pill> },
        ]} />
      </>}
    </Modal>
  );
}
