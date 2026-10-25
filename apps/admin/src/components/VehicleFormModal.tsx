'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { api, unwrap } from '@/lib/api';
import { useAuth } from '@/lib/auth';
import { can } from '@/lib/permissions';
import { useRealtime } from '@/lib/realtime';
import { buildVehicleCreate, buildVehicleUpdate, EMPTY_VEHICLE_FORM, vehicleFormFrom, type VehicleForm } from '@/lib/admin-forms';
import { defaultQr, depotName, freeBatteries, nextVehicleCode, suggestThingName } from '@/lib/vehicles-admin';
import type { S } from '@/lib/types';
import { Button } from '@/ds/Button';
import { ErrorNote, Field, Modal, Select, TextInput, useToast } from './ui';

/** Valor do seletor de bateria para digitar a série de uma bateria nova (ainda não cadastrada). */
const NEW_BATTERY = '__new__';

export const THING_HINT = 'O nome do rastreador no IoT. No dev o simulador assume qualquer moto cadastrada em até 60 s.';

/**
 * Cadastrar (`POST /vehicles`) ou editar (`PATCH /vehicles/{id}`) uma moto; admin e operação (`vehicle.edit`).
 * Único formulário de moto do painel: seção Motos, ficha da moto e o atalho do mapa abrem este mesmo componente.
 * No cadastro o galpão é obrigatório: a moto nasce livre nele, na posição do galpão (docs/decisoes.md, 2026-10-25).
 */
export function VehicleFormModal({ vehicle, onClose, onSaved }: { vehicle?: S<'Vehicle'>; onClose: () => void; onSaved?: (v: S<'Vehicle'>) => void }) {
  const qc = useQueryClient();
  const toast = useToast();
  const { groups } = useAuth();
  const { vehicles } = useRealtime();
  const isNew = !vehicle;
  const suggested = useMemo(() => nextVehicleCode(vehicles.map((v) => v.code)), [vehicles]);
  const [form, setForm] = useState<VehicleForm>(() => (vehicle ? vehicleFormFrom(vehicle) : { ...EMPTY_VEHICLE_FORM, code: suggested, thingName: suggestThingName(suggested) }));
  // A frota ao vivo pode chegar depois de abrir o formulário: atualiza a sugestão enquanto o código não foi mexido.
  const lastSuggested = useRef(suggested);
  useEffect(() => {
    const prev = lastSuggested.current;
    lastSuggested.current = suggested;
    if (!isNew || prev === suggested) return;
    setForm((f) => (f.code === prev ? { ...f, code: suggested, thingName: f.thingName === suggestThingName(prev) ? suggestThingName(suggested) : f.thingName } : f));
  }, [suggested, isNew]);
  const [batteryChoice, setBatteryChoice] = useState('');
  const [err, setErr] = useState<unknown>(null);
  const [busy, setBusy] = useState(false);
  const models = useQuery({ queryKey: ['vehicle-models', 'active'], queryFn: () => unwrap(api.GET('/vehicle-models')) });
  const modelItems = useMemo(() => models.data?.items ?? [], [models.data]);
  const depotsQ = useQuery({ queryKey: ['depots', 'active'], enabled: isNew, queryFn: () => unwrap(api.GET('/depots')) });
  const depots = useMemo(() => (depotsQ.data?.items ?? []).filter((d) => d.active), [depotsQ.data]);
  const batteriesQ = useQuery({
    queryKey: ['batteries', 'charged'],
    enabled: isNew && can(groups, 'battery.view'),
    queryFn: () => unwrap(api.GET('/batteries', { params: { query: { status: 'charged', limit: 100 } } })),
  });
  const batteries = useMemo(() => freeBatteries(batteriesQ.data?.items ?? []), [batteriesQ.data]);
  const set = <K extends keyof VehicleForm>(k: K) => (v: string) => setForm((f) => ({ ...f, [k]: v }));
  const modelName = modelItems.find((m) => m.id === form.vehicleModelId)?.name;

  // Código mudou e o rastreador ainda era a sugestão do código anterior: acompanha.
  const setCode = (code: string) => setForm((f) => ({ ...f, code, thingName: !f.thingName || f.thingName === suggestThingName(f.code) ? suggestThingName(code) : f.thingName }));
  const chooseBattery = (v: string) => {
    setBatteryChoice(v);
    setForm((f) => ({ ...f, batterySerial: v && v !== NEW_BATTERY ? v : '' }));
  };

  const submit = async () => {
    setErr(null);
    const built = isNew ? buildVehicleCreate(form, modelName) : buildVehicleUpdate(form, vehicle!, modelName);
    if (!built.ok) { setErr(new Error(built.error)); return; }
    setBusy(true);
    try {
      const saved = isNew
        ? await unwrap(api.POST('/vehicles', { body: built.body as S<'VehicleCreate'> }))
        : await unwrap(api.PATCH('/vehicles/{id}', { params: { path: { id: vehicle!.id } }, body: built.body as S<'VehicleUpdate'> }));
      toast(isNew ? `Moto ${saved.code} cadastrada` : 'Moto atualizada');
      for (const k of ['fleet', 'vehicle', 'vehicles', 'batteries', 'depot-vehicles']) qc.invalidateQueries({ queryKey: [k] });
      onSaved?.(saved);
      onClose();
    } catch (e) { setErr(e); } finally { setBusy(false); }
  };

  return (
    <Modal open title={isNew ? 'Cadastrar moto' : `Editar moto ${vehicle!.code}`} onClose={onClose} testId="vehicle-form" width={480}
      actions={<><Button size="sm" variant="ghost" onClick={onClose}>Cancelar</Button><Button size="sm" variant="dark" testId="vehicle-save" disabled={busy} onClick={submit}>{busy ? 'Salvando...' : isNew ? 'Cadastrar' : 'Salvar'}</Button></>}>
      <Field label="Código" hint={isNew ? `Formato VLT-0001. Próximo livre: ${suggested}` : 'O código não pode ser alterado'}>
        <TextInput testId="vehicle-code" value={form.code} onChange={setCode} placeholder="VLT-0061" readOnly={!isNew} />
      </Field>
      <Field label="Modelo">
        <Select testId="vehicle-model" value={form.vehicleModelId} onChange={set('vehicleModelId')}
          options={[{ value: '', label: models.isLoading ? 'Carregando...' : 'Selecione o modelo' }, ...modelItems.map((m) => ({ value: m.id, label: `${m.name} · ${m.categoryLabel}` }))]} />
      </Field>
      {isNew && (
        <Field label="Galpão" hint="A moto entra livre neste galpão, na posição dele, e fica disponível para retirada.">
          <Select testId="vehicle-depot" value={form.depotId} onChange={set('depotId')}
            options={[{ value: '', label: depotsQ.isLoading ? 'Carregando...' : depots.length ? 'Selecione o galpão' : 'Nenhum galpão ativo' }, ...depots.map((d) => ({ value: d.id, label: d.district ? `${d.name} · ${d.district}` : d.name }))]} />
        </Field>
      )}
      <Field label="Rastreador (thingName)" hint={THING_HINT}>
        <TextInput testId="vehicle-thing" value={form.thingName} onChange={set('thingName')} placeholder="moto-0061" />
      </Field>
      <Field label="QR da moto (opcional)" hint={isNew ? `Vazio: gerado como ${defaultQr(form.code)}` : undefined}>
        <TextInput testId="vehicle-qr" value={form.qrCode} onChange={set('qrCode')} placeholder={defaultQr(form.code)} />
      </Field>
      {isNew ? (
        <>
          <Field label="Bateria (opcional)" hint="Só baterias carregadas e livres no galpão. Uma série nova é cadastrada já instalada.">
            <Select testId="vehicle-battery-choice" value={batteryChoice} onChange={chooseBattery}
              options={[
                { value: '', label: batteriesQ.isLoading ? 'Carregando...' : 'Sem bateria' },
                ...batteries.map((b) => ({ value: b.serial, label: `${b.serial} · ${b.chargePct}% · ${depotName(depots, b.depotId)}` })),
                { value: NEW_BATTERY, label: 'Bateria nova (digitar a série)' },
              ]} />
          </Field>
          {batteryChoice === NEW_BATTERY && (
            <Field label="Nº de série da bateria nova"><TextInput testId="vehicle-battery" value={form.batterySerial} onChange={set('batterySerial')} placeholder="BT-190577" /></Field>
          )}
        </>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
          <Field label="Odômetro (km)" hint="Correção manual, vai para a auditoria"><TextInput testId="vehicle-odometer" value={form.odometerKm} onChange={set('odometerKm')} /></Field>
          <Field label="Horas de uso" hint="Correção manual, vai para a auditoria"><TextInput testId="vehicle-hours" value={form.usageHours} onChange={set('usageHours')} /></Field>
        </div>
      )}
      <ErrorNote error={err} />
    </Modal>
  );
}
