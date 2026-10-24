'use client';

import { useMemo, useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { api, unwrap } from '@/lib/api';
import { buildVehicleCreate, buildVehicleUpdate, EMPTY_VEHICLE_FORM, vehicleFormFrom, type VehicleForm } from '@/lib/admin-forms';
import type { S } from '@/lib/types';
import { Button } from '@/ds/Button';
import { ErrorNote, Field, Modal, Select, TextInput, useToast } from './ui';

/**
 * Cadastrar (`POST /vehicles`) ou editar (`PATCH /vehicles/{id}`) uma moto; admin e operação (`vehicle.edit`).
 * O galpão não é campo do contrato de criação/edição, então não aparece aqui.
 */
export function VehicleFormModal({ vehicle, onClose, onSaved }: { vehicle?: S<'Vehicle'>; onClose: () => void; onSaved?: (v: S<'Vehicle'>) => void }) {
  const qc = useQueryClient();
  const toast = useToast();
  const isNew = !vehicle;
  const [form, setForm] = useState<VehicleForm>(vehicle ? vehicleFormFrom(vehicle) : EMPTY_VEHICLE_FORM);
  const [err, setErr] = useState<unknown>(null);
  const [busy, setBusy] = useState(false);
  const models = useQuery({ queryKey: ['vehicle-models', 'active'], queryFn: () => unwrap(api.GET('/vehicle-models')) });
  const modelItems = useMemo(() => models.data?.items ?? [], [models.data]);
  const set = <K extends keyof VehicleForm>(k: K) => (v: string) => setForm((f) => ({ ...f, [k]: v }));
  const modelName = modelItems.find((m) => m.id === form.vehicleModelId)?.name;

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
      for (const k of ['fleet', 'vehicle', 'vehicles']) qc.invalidateQueries({ queryKey: [k] });
      onSaved?.(saved);
      onClose();
    } catch (e) { setErr(e); } finally { setBusy(false); }
  };

  return (
    <Modal open title={isNew ? 'Cadastrar moto' : `Editar moto ${vehicle!.code}`} onClose={onClose} testId="vehicle-form"
      actions={<><Button size="sm" variant="ghost" onClick={onClose}>Cancelar</Button><Button size="sm" variant="dark" testId="vehicle-save" disabled={busy} onClick={submit}>{busy ? 'Salvando...' : isNew ? 'Cadastrar' : 'Salvar'}</Button></>}>
      <Field label="Código" hint={isNew ? 'Formato VLT-0001' : 'O código não pode ser alterado'}>
        <TextInput testId="vehicle-code" value={form.code} onChange={set('code')} placeholder="VLT-0061" readOnly={!isNew} />
      </Field>
      <Field label="Modelo">
        <Select testId="vehicle-model" value={form.vehicleModelId} onChange={set('vehicleModelId')}
          options={[{ value: '', label: models.isLoading ? 'Carregando...' : 'Selecione o modelo' }, ...modelItems.map((m) => ({ value: m.id, label: `${m.name} · ${m.categoryLabel}` }))]} />
      </Field>
      <Field label="Rastreador (thingName)" hint="Nome do dispositivo no IoT Core, por exemplo moto-0061">
        <TextInput testId="vehicle-thing" value={form.thingName} onChange={set('thingName')} placeholder="moto-0061" />
      </Field>
      <Field label="QR da moto (opcional)"><TextInput testId="vehicle-qr" value={form.qrCode} onChange={set('qrCode')} placeholder="volti://v/VLT-0061" /></Field>
      {isNew ? (
        <Field label="Nº de série da bateria (opcional)"><TextInput testId="vehicle-battery" value={form.batterySerial} onChange={set('batterySerial')} placeholder="BT-190577" /></Field>
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
